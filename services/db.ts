
import { openDB, IDBPDatabase } from 'idb';
import { supabase } from './supabase';

const DB_NAME = 'IndrayaniSchoolDB';
const DB_VERSION = 1;

// Define tables to map internal store names to Supabase table names
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
      // Try to fetch from Supabase
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) throw error;
      
      if (data) {
        // Sync local cache with remote data
        const tx = db.transaction(storeName, 'readwrite');
        await tx.store.clear();
        for (const item of data) {
          await tx.store.put(item);
        }
        await tx.done;
        return data;
      }
    } catch (err) {
      console.warn(`Supabase fetch failed for ${storeName}, falling back to local:`, err);
    }

    // Fallback to local IndexedDB
    return db.getAll(storeName);
  },

  async put(storeName: string, item: any) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    // Update local first for speed
    await db.put(storeName, item);

    // Sync to Supabase
    try {
      const { error } = await supabase.from(tableName).upsert(item);
      if (error) throw error;
    } catch (err) {
      console.error(`Supabase upsert failed for ${storeName}:`, err);
    }
  },

  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    // Update local
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;

    // Sync to Supabase in chunks or all at once
    try {
      if (items.length > 0) {
        // First delete everything in remote if doing a full sync, or just upsert
        // For standard operations, upsert is safer. 
        // If the collection is "the source of truth" (like promotion), we do a delete+insert.
        const { error } = await supabase.from(tableName).upsert(items);
        if (error) throw error;
      }
    } catch (err) {
      console.error(`Supabase batch upsert failed for ${storeName}:`, err);
    }
  },

  async delete(storeName: string, id: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    await db.delete(storeName, id);

    try {
      const idField = storeName === 'annualRecords' ? 'studentId' : 'id';
      const { error } = await supabase.from(tableName).delete().eq(idField, id);
      if (error) throw error;
    } catch (err) {
      console.error(`Supabase delete failed for ${storeName}:`, err);
    }
  },

  async clear(storeName: string) {
    const db = await initDB();
    const tableName = TABLE_MAP[storeName];

    await db.clear(storeName);

    try {
      // Be careful with delete all in Supabase (usually requires filters or is restricted)
      const { error } = await supabase.from(tableName).delete().neq('id', 'placeholder_safety_id');
      if (error) throw error;
    } catch (err) {
      console.error(`Supabase clear failed for ${storeName}:`, err);
    }
  }
};
