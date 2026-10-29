import { describe, expect, it } from 'vitest';
import { addNode, emptyDiagram, markStale, withProvenance } from '../../src/core/diagram';
import type { DiagramNode } from '../../src/core/diagram';
import { asNodeId } from '../../src/core/ids';
import { setDiagram } from '../../src/core/project';
import {
  ProjectFormatError,
  SCHEMA_VERSION,
  SchemaVersionError,
  fromJSON,
  parseProjectFile,
  serializeProject,
  toJSON,
} from '../../src/core/serialization';
import { SENSOR, sharedSensorProject } from './fixtures';

describe('serialization', () => {
  it('round-trips a project unchanged', () => {
    const project = sharedSensorProject();
    const restored = fromJSON(toJSON(project));

    expect(restored).toEqual(serializeProject(project).project);
    expect(restored.meta.id).toBe(project.meta.id);
    expect(Object.keys(restored.components)).toHaveLength(3);
  });

  it('keeps both occurrences of the shared identity as references', () => {
    const restored = fromJSON(toJSON(sharedSensorProject()));
    const nodes = Object.values(restored.diagrams.faultTree?.nodes ?? {});
    const sensorNodes = nodes.filter((node) => node.componentRef === SENSOR);

    expect(sensorNodes).toHaveLength(2);
    // The rate is stored once, in the registry — not duplicated per occurrence.
    expect(restored.components[SENSOR]?.failureRate).toBe(1e-5);
  });

  it('strips rates that were smuggled onto a node', () => {
    // The type forbids this, so it takes a cast — but a hand-edited file could contain it
    // and must not become a second, divergent source of truth.
    const rogue = {
      id: asNodeId('n-rogue'),
      kind: 'basicEvent',
      componentRef: SENSOR,
      failureRate: 0.5,
      repairRate: 0.2,
    } as unknown as DiagramNode;

    const project = setDiagram(sharedSensorProject(), 'bdd', addNode(emptyDiagram(), rogue));

    const serialized = serializeProject(project);
    const node = serialized.project.diagrams.bdd?.nodes['n-rogue'];
    expect(node?.componentRef).toBe(SENSOR);
    expect(Object.keys(node ?? {})).toEqual(['id', 'kind', 'componentRef']);
    expect(JSON.stringify(serialized)).not.toContain('0.5');
  });

  it('preserves provenance and the stale flag', () => {
    const faultTree = sharedSensorProject().diagrams.faultTree ?? emptyDiagram();
    const derived = markStale(
      withProvenance(faultTree, { origin: 'derived', derivedFrom: 'bdd', stale: false }),
    );
    const project = setDiagram(sharedSensorProject(), 'reliabilityBlock', derived);
    const restored = fromJSON(toJSON(project));

    expect(restored.diagrams.reliabilityBlock?.provenance).toEqual({
      origin: 'derived',
      derivedFrom: 'bdd',
      stale: true,
    });
  });

  it('writes the schema version into the envelope', () => {
    const file = serializeProject(sharedSensorProject());
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('rejects an unknown schema version instead of guessing', () => {
    const file = { ...serializeProject(sharedSensorProject()), schemaVersion: 99 };
    expect(() => parseProjectFile(file)).toThrow(SchemaVersionError);
  });

  it('rejects a malformed file with a path to the offending field', () => {
    const file = serializeProject(sharedSensorProject()) as unknown as {
      project: { parameters: Record<string, unknown> };
    };
    const broken = {
      schemaVersion: SCHEMA_VERSION,
      project: {
        ...file.project,
        parameters: { missionTimeHours: 'viel', testIntervalHours: 10 },
      },
    };

    expect(() => parseProjectFile(broken)).toThrow(ProjectFormatError);
    expect(() => parseProjectFile(broken)).toThrow(/project\.parameters\.missionTimeHours/);
  });
});
