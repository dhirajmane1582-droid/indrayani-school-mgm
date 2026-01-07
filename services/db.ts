
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

// Robust UUID v4 Generator Fallback for non-secure contexts
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const withTimeout = (promise: Promise<any> | any, ms: number): Promise<any> => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Timeout')), ms))
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
      const { data, error } = await withTimeout(supabase.from(tableName).select('*'), 10000);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const tx = db.transaction(storeName, 'readwrite');
        for (const item of data) {
          await tx.store.put(item);
        }
        await tx.done;
        return data;
      }
    } catch (err: any) {
      console.warn(`Supabase Sync [${storeName}] Failed:`, err.message || err);
    }

    return db.getAll(storeName);
  },

  async put(storeName: string, item: any) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    // 1. Save Locally First
    await db.put(storeName, item);

    // 2. Try Cloud Save
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(item, { onConflict: conflictColumn });
      
      if (error) {
          const errMsg = error.message || 'Database error';
          const details = error.details || '';
          console.error(`Supabase Upsert Error [${storeName}]:`, error);
          throw new Error(`${errMsg} ${details}`);
      }
    } catch (err) {
      throw err;
    }
  },

  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    if (!items || items.length === 0) return;

    const tx = db.transaction(storeName, 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;

    try {
      const { error } = await supabase.from(tableName).upsert(items, { onConflict: conflictColumn });
      if (error) console.error(`Supabase Bulk Error [${storeName}]:`, error.message);
    } catch (err) {
      console.error(`Supabase Connection Failed [${storeName}]`);
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
        console.debug(`Supabase Delete [${storeName}] Failed.`);
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
