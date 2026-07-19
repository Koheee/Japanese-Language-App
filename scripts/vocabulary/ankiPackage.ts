import { createRequire } from 'node:module';

import { decompress } from 'fzstd';
import initSqlJs from 'sql.js';
import * as yauzl from 'yauzl';

export interface AnkiNoteTypeRow { id: number; name: string; fieldNames: string[] }
export interface AnkiDeckRow { id: number; name: string }
export interface AnkiNoteRow { id: number; noteTypeId: number; tags: string[]; fields: string }
export interface AnkiCardRow { id: number; noteId: number; did: number; odid: number }
export interface AnkiCollectionSnapshot {
  noteTypes: AnkiNoteTypeRow[];
  decks: AnkiDeckRow[];
  notes: AnkiNoteRow[];
  cards: AnkiCardRow[];
}

const COLLECTION_ENTRY = 'collection.anki21b';

const readCollectionEntry = async (sourcePath: string): Promise<Buffer> => new Promise((resolve, reject) => {
  yauzl.open(sourcePath, { lazyEntries: true }, (openError, zip) => {
    if (openError || !zip) {
      reject(openError ?? new Error('Unable to open APKG'));
      return;
    }
    let settled = false;
    const finish = (error?: Error, value?: Buffer) => {
      if (settled) return;
      settled = true;
      zip.close();
      if (error) reject(error);
      else resolve(value!);
    };
    zip.on('error', (error) => finish(error));
    zip.on('entry', (entry: yauzl.Entry) => {
      if (entry.fileName !== COLLECTION_ENTRY) {
        zip.readEntry();
        return;
      }
      zip.openReadStream(entry, (streamError, stream) => {
        if (streamError || !stream) {
          finish(streamError ?? new Error('Unable to open collection stream'));
          return;
        }
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (error) => finish(error));
        stream.on('end', () => finish(undefined, Buffer.concat(chunks)));
      });
    });
    zip.on('end', () => finish(new Error(`APKG is missing ${COLLECTION_ENTRY}`)));
    zip.readEntry();
  });
});

const queryRows = (database: { exec: (sql: string) => Array<{ columns: string[]; values: unknown[][] }> }, sql: string) => {
  const result = database.exec(sql)[0];
  if (!result) return [] as Record<string, unknown>[];
  return result.values.map((values) => Object.fromEntries(result.columns.map((column, index) => [column, values[index]])));
};

export const buildNoteTypeRows = (
  noteTypes: readonly Record<string, unknown>[],
  fields: readonly Record<string, unknown>[],
): AnkiNoteTypeRow[] => {
  const fieldsByNoteType = new Map<number, Array<{ ord: number; name: string }>>();
  for (const field of fields) {
    const noteTypeId = Number(field.ntid);
    const fieldRows = fieldsByNoteType.get(noteTypeId) ?? [];
    fieldRows.push({ ord: Number(field.ord), name: String(field.name) });
    fieldsByNoteType.set(noteTypeId, fieldRows);
  }
  return noteTypes.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    fieldNames: (fieldsByNoteType.get(Number(row.id)) ?? [])
      .sort((left, right) => left.ord - right.ord)
      .map(({ name }) => name),
  }));
};

export const readAnkiPackage = async (sourcePath: string): Promise<AnkiCollectionSnapshot> => {
  const compressed = await readCollectionEntry(sourcePath);
  const require = createRequire(import.meta.url);
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const database = new SQL.Database(decompress(compressed));
  try {
    const noteTypes = buildNoteTypeRows(
      queryRows(database, 'SELECT id, name FROM notetypes ORDER BY id'),
      queryRows(database, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord'),
    );
    const decks = queryRows(database, 'SELECT id, name FROM decks ORDER BY id').map((row) => ({ id: Number(row.id), name: String(row.name) }));
    const notes = queryRows(database, 'SELECT id, mid, tags, flds FROM notes ORDER BY id').map((row) => ({
      id: Number(row.id),
      noteTypeId: Number(row.mid),
      tags: String(row.tags).trim().split(/\s+/u).filter(Boolean),
      fields: String(row.flds),
    }));
    const cards = queryRows(database, 'SELECT id, nid, did, odid FROM cards ORDER BY id').map((row) => ({
      id: Number(row.id), noteId: Number(row.nid), did: Number(row.did), odid: Number(row.odid),
    }));
    return { noteTypes, decks, notes, cards };
  } finally {
    database.close();
  }
};
