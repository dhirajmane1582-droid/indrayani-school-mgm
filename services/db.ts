
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
        if (error.message.includes('Could not find the table')) {
          console.warn(`[SUPABASE SETUP REQUIRED] Table "${tableName}" does not exist yet. Please run the SQL schema in the Supabase Editor. Falling back to local storage for now.`);
        } else {
          console.error(`Supabase FETCH Error [${storeName}]:`, error.message);
        }
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
      // Graceful fallback to IndexedDB
    }

    return db.getAll(storeName);
  },

  async put(storeName: string, item: any) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    // Always update local cache immediately for offline-first snappiness
    await db.put(storeName, item);

    // Sync to Supabase
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(item, { onConflict: conflictColumn });
      
      if (error) {
        if (!error.message.includes('Could not find the table')) {
          console.error(`Supabase UPSERT Error [${storeName}]:`, error.message);
        }
      }
    } catch (err) {
      // Silently fail network operations to keep UI smooth
    }
  },

  async putAll(storeName: string, items: any[]) {
    if (!items || items.length === 0) return;
    
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const conflictColumn = storeName === 'annualRecords' ? 'studentId' : 'id';

    // Update local cache
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;

    // Sync to Supabase
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(items, { onConflict: conflictColumn });
        
      if (error) {
        if (!error.message.includes('Could not find the table')) {
          console.error(`Supabase BATCH UPSERT Error [${storeName}]:`, error.message);
        }
      }
    } catch (err) {
      // Silently fail network operations
    }
  },

  async delete(storeName: string, id: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.delete(storeName, id);

    try {
      const { error } = await supabase.from(tableName).delete().eq(idField, id);
      if (error && !error.message.includes('Could not find the table')) {
        console.error(`Supabase DELETE Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Silently fail network operations
    }
  },

  async clear(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];
    const idField = storeName === 'annualRecords' ? 'studentId' : 'id';

    await db.clear(storeName);

    try {
      const { error } = await supabase.from(tableName).delete().neq(idField, 'placeholder_safety_id');
      if (error && !error.message.includes('Could not find the table')) {
        console.error(`Supabase CLEAR Error [${storeName}]:`, error.message);
      }
    } catch (err) {
      // Silently fail network operations
    }
  }
};
