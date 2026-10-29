export type TabId = 'fehlerbaum' | 'zuverlaessigkeitsdiagramm' | 'bdd'

export interface Project {
  /** Schema version, for forward-compatible loading of older project files. */
  version: 1
  name: string
  createdAt: string
  modifiedAt: string
}

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString()
  return {
    version: 1,
    name,
    createdAt: now,
    modifiedAt: now,
  }
}
