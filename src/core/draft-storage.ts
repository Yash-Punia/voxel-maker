import type { Asset } from '../types';

// Crash insurance. A beforeunload prompt only covers a deliberate close: it does
// nothing for a tab crash, a force quit, a reboot, or one misclick on "leave".
// Someone who has just spent an hour on a sixteen-tile set should not lose it to
// any of those.
//
// IndexedDB rather than localStorage, because a project is now many assets, each
// with many frames, each a full board. That outgrows the 5MB localStorage cap
// quickly and localStorage would throw rather than degrade.

const DB_NAME = 'voxbrush';
const DB_VERSION = 1;
const STORE = 'draft';
const KEY = 'current';

export interface Draft {
  savedAt: number;
  projectName: string | null;
  palette: string[];
  assets: Asset[];
  activeAssetId: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Every call is wrapped, because private browsing and blocked site data both
 *  make IndexedDB throw. Losing the safety net must never take the app with it. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft): Promise<unknown> {
  return withStore('readwrite', (store) => store.put(draft, KEY));
}

export function readDraft(): Promise<Draft | null> {
  return withStore<Draft>('readonly', (store) => store.get(KEY));
}

export function clearDraft(): Promise<unknown> {
  return withStore('readwrite', (store) => store.delete(KEY));
}
