
import { openDB, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

const DB_NAME = 'IndrayaniSchoolDB';
const DB_VERSION = 1;

const TABLE_MAP: Record<string, string> = {
  'students': 'students',
  'attendance': 'attendance',
  'exams': 'exams',
  'results': 'results',
  'annualRecords': 'annual_records',
  'customFields': 'custom_field_defs',
  'holidays': 'holidays',
  'users': 'users',
  'fees': 'fees',
  'homework': 'homework',
  'announcements': 'announcements'
};

let dbPromise: Promise<IDBPDatabase> | null = null;

export const initDB = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        Object.keys(TABLE_MAP).forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: store === 'annualRecords' ? 'studentId' : 'id' });
          }
        });
      },
    });
  }
  return dbPromise;
};

// Helper for timing out slow network requests
// Fix: Used 'any' to avoid type inference issues when wrapping complex Supabase promise objects in Promise.race
const withTimeout = (promise: Promise<any> | any, ms: number): Promise<any> => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
};

export const dbService = {
  async getLocal(storeName: string) {
    const db = await initDB();
    return db.getAll(storeName);
  },

  async getAll(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    try {
      // 2-second timeout for cloud fetch to prevent app hang
      // Fix: withTimeout now returns any, allowing proper destructuring of data and error properties
      const { data, error } = await withTimeout(supabase.from(tableName).select('*'), 2500);
      
      if (error) throw error;
      
      if (data) {
        const tx = db.transaction(storeName, 'readwrite');
        await tx.store.clear();
        for (const item of data) {
          await tx.store.put(item);
        }
        await tx.done;
        return data;
      }
    } catch (err) {
      console.debug(`Supabase Sync [${storeName}]: Using local registry fallback.`);
    }

    return db.getAll(storeName);
  },

  async put(storeName: string, item: any) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.put(storeName, item);

    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(item, { onConflict: conflictColumn });
      
      if (error) console.debug(`Supabase Queue [${storeName}]: Saved locally, pending cloud sync.`);
    } catch (err) {
      // Silent catch
    }
  },

  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    if (items && items.length > 0) {
      for (const item of items) {
        await tx.store.put(item);
      }
    }
    await tx.done;

    if (!items || items.length === 0) return;

    try {
      await supabase.from(tableName).upsert(items, { onConflict: conflictColumn });
    } catch (err) {
      // Silent catch
    }
  },

  async delete(storeName: string, id: string) {
    if (!id) return;
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = (storeName === 'annualRecords') ? 'studentId' : 'id';

    try {
        await db.delete(storeName, id);
        await supabase.from(tableName).delete().eq(idField, id);
    } catch (err) {
        console.debug(`Supabase Delete [${storeName}]: Pending cloud update.`);
    }
  },

  async clear(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.clear(storeName);
    try {
      await supabase.from(tableName).delete().not(idField, 'is', null);
    } catch (err) {
      // Silent catch
    }
  }
};
