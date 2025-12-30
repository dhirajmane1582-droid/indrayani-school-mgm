
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

export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      Object.keys(TABLE_MAP).forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: store === 'annualRecords' ? 'studentId' : 'id' });
        }
      });
    },
  });
};

export const dbService = {
  async getAll(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    try {
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) {
        console.error(`Supabase FETCH Error [${storeName}]:`, error.message);
        throw error;
      }
      
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
      console.warn(`Fallback to local IDB for ${storeName}`);
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
      
      if (error) {
        console.error(`Supabase UPSERT Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Offline mode
    }
  },

  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    // Update local cache
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
      const { error } = await supabase
        .from(tableName)
        .upsert(items, { onConflict: conflictColumn });
        
      if (error) {
          console.error(`Supabase BATCH UPSERT Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Offline mode
    }
  },

  async delete(storeName: string, id: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.delete(storeName, id);

    try {
      const { error } = await supabase.from(tableName).delete().eq(idField, id);
      if (error) {
        console.error(`Supabase DELETE Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Offline mode
    }
  },

  async clear(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.clear(storeName);

    try {
      // Proper generic delete all for Supabase
      const { error } = await supabase.from(tableName).delete().not(idField, 'is', null);
      if (error) {
        console.error(`Supabase CLEAR Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Offline mode
    }
  }
};
