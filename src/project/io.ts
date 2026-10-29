import type { Project } from './types'

export function exportProjectToFile(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.name || 'projekt'}.safety.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isValidProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    candidate.version === 1 &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.modifiedAt === 'string'
  )
}

export function importProjectFromFile(file: File): Promise<Project> {
  return file.text().then((text) => {
    const parsed = JSON.parse(text)
    if (!isValidProject(parsed)) {
      throw new Error('Datei ist keine gültige Projektdatei.')
    }
    return parsed
  })
}
