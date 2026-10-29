import type { ComponentDefinition } from './component'
import type { ComponentId } from './ids'

/**
 * All component identities of a project, keyed by {@link ComponentId}.
 *
 * The registry is the single source of truth for rates. Diagrams hold references only,
 * so the same component can occur any number of times without its data being copied.
 */
export type ComponentRegistry = Readonly<Record<string, ComponentDefinition>>

/** Patch for {@link updateComponent}; the id is excluded because identity is immutable. */
export type ComponentPatch = Readonly<Partial<Omit<ComponentDefinition, 'id'>>>

export function emptyRegistry(): ComponentRegistry {
  return {}
}

export function getComponent(
  registry: ComponentRegistry,
  id: ComponentId,
): ComponentDefinition | undefined {
  return registry[id]
}

/** Like {@link getComponent}, but throws when the identity is unknown. */
export function requireComponent(
  registry: ComponentRegistry,
  id: ComponentId,
): ComponentDefinition {
  const component = registry[id]
  if (component === undefined) {
    throw new Error(`Unknown component identity: ${id}`)
  }
  return component
}

export function hasComponent(registry: ComponentRegistry, id: ComponentId): boolean {
  return Object.prototype.hasOwnProperty.call(registry, id)
}

/** All definitions, ordered by name and then id so the order is stable across runs. */
export function listComponents(registry: ComponentRegistry): readonly ComponentDefinition[] {
  return Object.values(registry).sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
}

export function componentIds(registry: ComponentRegistry): readonly ComponentId[] {
  return listComponents(registry).map((component) => component.id)
}

/** Inserts or replaces a definition and returns a new registry. */
export function putComponent(
  registry: ComponentRegistry,
  component: ComponentDefinition,
): ComponentRegistry {
  return { ...registry, [component.id]: component }
}

/**
 * Merges `patch` into an existing definition. The id is never touched, so every
 * occurrence in every diagram keeps pointing at the same identity.
 */
export function updateComponent(
  registry: ComponentRegistry,
  id: ComponentId,
  patch: ComponentPatch,
): ComponentRegistry {
  const current = requireComponent(registry, id)
  return { ...registry, [id]: { ...current, ...patch, id } }
}

/**
 * Removes a definition. Callers are responsible for the occurrences that still
 * reference it — `validateProject` reports them as `UNKNOWN_COMPONENT_REF`.
 */
export function removeComponent(
  registry: ComponentRegistry,
  id: ComponentId,
): ComponentRegistry {
  if (!hasComponent(registry, id)) return registry
  const next: Record<string, ComponentDefinition> = { ...registry }
  delete next[id]
  return next
}
