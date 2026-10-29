import { describe, expect, it } from 'vitest'
import { importProjectFromFile } from './io'

function jsonFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'project.safety.json', {
    type: 'application/json',
  })
}

describe('importProjectFromFile', () => {
  it('accepts a well-formed project', async () => {
    const project = await importProjectFromFile(
      jsonFile({
        version: 1,
        name: 'Testprojekt',
        createdAt: '2026-01-01T00:00:00.000Z',
        modifiedAt: '2026-01-01T00:00:00.000Z',
      }),
    )
    expect(project.name).toBe('Testprojekt')
  })

  it('rejects an unknown schema version', async () => {
    await expect(
      importProjectFromFile(jsonFile({ version: 2, name: 'x' })),
    ).rejects.toThrow()
  })

  it('rejects a project with wrong field types', async () => {
    await expect(
      importProjectFromFile(
        jsonFile({
          version: 1,
          name: 42,
          createdAt: false,
          modifiedAt: [],
        }),
      ),
    ).rejects.toThrow()
  })

  it('rejects malformed JSON', async () => {
    await expect(
      importProjectFromFile(new File(['not json'], 'project.safety.json')),
    ).rejects.toThrow()
  })
})
