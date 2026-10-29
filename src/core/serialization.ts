import type { ComponentDefinition } from './component';
import type { DiagramDocument, DiagramNode, Edge, Point, Provenance, TabId } from './diagram';
import { TAB_IDS } from './diagram';
import { asComponentId, asEdgeId, asNodeId, asProjectId } from './ids';
import type { Project, ProjectMeta, ProjectParameters } from './project';
import type { ComponentRegistry } from './registry';

/**
 * Projects are exported to and imported from a local file; there is no backend
 * (`Konzept.md`, "Plattform"). The envelope is versioned so a later schema change can be
 * migrated instead of silently misread.
 */
export const SCHEMA_VERSION = 1;

export interface ProjectFile {
  readonly schemaVersion: number;
  readonly project: Project;
}

export class SchemaVersionError extends Error {
  constructor(readonly found: unknown) {
    super(`Unsupported project schema version: ${String(found)} (expected ${SCHEMA_VERSION}).`);
    this.name = 'SchemaVersionError';
  }
}

export class ProjectFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFormatError';
  }
}

/**
 * Normalises a project into its file form.
 *
 * Normalising explicitly rather than handing the object to `JSON.stringify` keeps the
 * file shape independent of whatever extra fields a UI layer may have attached — in
 * particular it guarantees that **no rates ever end up on a diagram node**, since rates
 * belong to the component identity in the registry.
 */
export function serializeProject(project: Project): ProjectFile {
  const diagrams: Partial<Record<TabId, DiagramDocument>> = {};
  for (const tab of TAB_IDS) {
    const diagram = project.diagrams[tab];
    if (diagram !== undefined) diagrams[tab] = serializeDiagram(diagram);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    project: {
      meta: { ...project.meta },
      parameters: { ...project.parameters },
      components: serializeRegistry(project.components),
      diagrams,
    },
  };
}

export function toJSON(project: Project, indent = 2): string {
  return JSON.stringify(serializeProject(project), undefined, indent);
}

function serializeRegistry(registry: ComponentRegistry): ComponentRegistry {
  const result: Record<string, ComponentDefinition> = {};
  for (const component of Object.values(registry)) {
    result[component.id] = {
      id: component.id,
      name: component.name,
      failureRate: component.failureRate,
      ...(component.repairRate === undefined ? {} : { repairRate: component.repairRate }),
      ...(component.note === undefined ? {} : { note: component.note }),
    };
  }
  return result;
}

function serializeDiagram(diagram: DiagramDocument): DiagramDocument {
  const nodes: Record<string, DiagramNode> = {};
  for (const node of Object.values(diagram.nodes)) {
    nodes[node.id] = {
      id: node.id,
      kind: node.kind,
      ...(node.componentRef === undefined ? {} : { componentRef: node.componentRef }),
      ...(node.label === undefined ? {} : { label: node.label }),
    };
  }

  const layout: Record<string, Point> = {};
  for (const [id, point] of Object.entries(diagram.layout)) {
    layout[id] = { x: point.x, y: point.y };
  }

  return {
    nodes,
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      ...(edge.fromPort === undefined ? {} : { fromPort: edge.fromPort }),
      ...(edge.toPort === undefined ? {} : { toPort: edge.toPort }),
      ...(edge.label === undefined ? {} : { label: edge.label }),
    })),
    layout,
    provenance: {
      origin: diagram.provenance.origin,
      ...(diagram.provenance.derivedFrom === undefined
        ? {}
        : { derivedFrom: diagram.provenance.derivedFrom }),
      stale: diagram.provenance.stale,
    },
  };
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ProjectFormatError(`Expected an object at ${path}.`);
  }
  return value as Record<string, unknown>;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new ProjectFormatError(`Expected a string at ${path}.`);
  return value;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ProjectFormatError(`Expected a finite number at ${path}.`);
  }
  return value;
}

function optStr(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : str(value, path);
}

function optNum(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : num(value, path);
}

/** Parses a project file, rejecting unknown schema versions instead of guessing. */
export function parseProjectFile(input: unknown): Project {
  const file = record(input, 'root');
  if (file.schemaVersion !== SCHEMA_VERSION) {
    throw new SchemaVersionError(file.schemaVersion);
  }
  return parseProject(record(file.project, 'project'));
}

export function fromJSON(text: string): Project {
  return parseProjectFile(JSON.parse(text));
}

function parseProject(raw: Record<string, unknown>): Project {
  const meta = record(raw.meta, 'project.meta');
  const parameters = record(raw.parameters, 'project.parameters');
  const components = record(raw.components, 'project.components');
  const diagrams = raw.diagrams === undefined ? {} : record(raw.diagrams, 'project.diagrams');

  const parsedMeta: ProjectMeta = {
    id: asProjectId(str(meta.id, 'project.meta.id')),
    name: str(meta.name, 'project.meta.name'),
    createdAt: str(meta.createdAt, 'project.meta.createdAt'),
    modifiedAt: str(meta.modifiedAt, 'project.meta.modifiedAt'),
  };

  const parsedParameters: ProjectParameters = {
    missionTimeHours: num(parameters.missionTimeHours, 'project.parameters.missionTimeHours'),
    testIntervalHours: num(parameters.testIntervalHours, 'project.parameters.testIntervalHours'),
  };

  const registry: Record<string, ComponentDefinition> = {};
  for (const [key, value] of Object.entries(components)) {
    const component = record(value, `project.components.${key}`);
    const id = asComponentId(str(component.id, `project.components.${key}.id`));
    const repairRate = optNum(component.repairRate, `project.components.${key}.repairRate`);
    const note = optStr(component.note, `project.components.${key}.note`);
    registry[id] = {
      id,
      name: str(component.name, `project.components.${key}.name`),
      failureRate: num(component.failureRate, `project.components.${key}.failureRate`),
      ...(repairRate === undefined ? {} : { repairRate }),
      ...(note === undefined ? {} : { note }),
    };
  }

  const parsedDiagrams: Partial<Record<TabId, DiagramDocument>> = {};
  for (const tab of TAB_IDS) {
    const value = diagrams[tab];
    if (value === undefined) continue;
    parsedDiagrams[tab] = parseDiagram(record(value, `project.diagrams.${tab}`), tab);
  }

  return {
    meta: parsedMeta,
    parameters: parsedParameters,
    components: registry,
    diagrams: parsedDiagrams,
  };
}

function parseDiagram(raw: Record<string, unknown>, tab: TabId): DiagramDocument {
  const path = `project.diagrams.${tab}`;
  const rawNodes = record(raw.nodes, `${path}.nodes`);
  const rawLayout = raw.layout === undefined ? {} : record(raw.layout, `${path}.layout`);
  const rawProvenance = record(raw.provenance, `${path}.provenance`);

  const nodes: Record<string, DiagramNode> = {};
  for (const [key, value] of Object.entries(rawNodes)) {
    const node = record(value, `${path}.nodes.${key}`);
    const id = asNodeId(str(node.id, `${path}.nodes.${key}.id`));
    const componentRef = optStr(node.componentRef, `${path}.nodes.${key}.componentRef`);
    const label = optStr(node.label, `${path}.nodes.${key}.label`);
    nodes[id] = {
      id,
      kind: str(node.kind, `${path}.nodes.${key}.kind`),
      ...(componentRef === undefined ? {} : { componentRef: asComponentId(componentRef) }),
      ...(label === undefined ? {} : { label }),
    };
  }

  if (!Array.isArray(raw.edges)) {
    throw new ProjectFormatError(`Expected an array at ${path}.edges.`);
  }
  const edges: Edge[] = raw.edges.map((value, index) => {
    const edge = record(value, `${path}.edges[${index}]`);
    const fromPort = optStr(edge.fromPort, `${path}.edges[${index}].fromPort`);
    const toPort = optStr(edge.toPort, `${path}.edges[${index}].toPort`);
    const label = optStr(edge.label, `${path}.edges[${index}].label`);
    return {
      id: asEdgeId(str(edge.id, `${path}.edges[${index}].id`)),
      from: asNodeId(str(edge.from, `${path}.edges[${index}].from`)),
      to: asNodeId(str(edge.to, `${path}.edges[${index}].to`)),
      ...(fromPort === undefined ? {} : { fromPort }),
      ...(toPort === undefined ? {} : { toPort }),
      ...(label === undefined ? {} : { label }),
    };
  });

  const layout: Record<string, Point> = {};
  for (const [key, value] of Object.entries(rawLayout)) {
    const point = record(value, `${path}.layout.${key}`);
    layout[key] = {
      x: num(point.x, `${path}.layout.${key}.x`),
      y: num(point.y, `${path}.layout.${key}.y`),
    };
  }

  const origin = str(rawProvenance.origin, `${path}.provenance.origin`);
  if (origin !== 'authored' && origin !== 'derived') {
    throw new ProjectFormatError(`${path}.provenance.origin must be "authored" or "derived".`);
  }
  const derivedFrom = optStr(rawProvenance.derivedFrom, `${path}.provenance.derivedFrom`);
  if (derivedFrom !== undefined && !TAB_IDS.includes(derivedFrom as TabId)) {
    throw new ProjectFormatError(`${path}.provenance.derivedFrom is not a known tab.`);
  }

  const provenance: Provenance = {
    origin,
    ...(derivedFrom === undefined ? {} : { derivedFrom: derivedFrom as TabId }),
    stale: rawProvenance.stale === true,
  };

  return { nodes, edges, layout, provenance };
}
