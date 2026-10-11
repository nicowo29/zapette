import Dexie, { type Table } from 'dexie'

interface Entry {
  key: string
  value: unknown
}

class LecteurDb extends Dexie {
  kv!: Table<Entry, string>

  constructor() {
    super('lecteur-iptv')
    this.version(1).stores({ kv: 'key' })
  }
}

const db = new LecteurDb()

// Stockage indisponible (navigation privée, quota) : l'application doit tourner quand même, sans cache.
export async function read<T>(key: string): Promise<T | undefined> {
  try {
    return (await db.kv.get(key))?.value as T | undefined
  } catch {
    return undefined
  }
}

export async function write(key: string, value: unknown): Promise<void> {
  try {
    await db.kv.put({ key, value })
  } catch {
    // cache perdu : le catalogue sera retéléchargé au prochain lancement
  }
}

export async function clearAll(): Promise<void> {
  try {
    await db.kv.clear()
  } catch {
    // rien à effacer
  }
}
