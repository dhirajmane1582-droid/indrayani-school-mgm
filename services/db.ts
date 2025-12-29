
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'IndrayaniSchoolDB';
const DB_VERSION = 1;

export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('attendance')) db.createObjectStore('attendance', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('exams')) db.createObjectStore('exams', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('results')) db.createObjectStore('results', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('annualRecords')) db.createObjectStore('annualRecords', { keyPath: 'studentId' });
      if (!db.objectStoreNames.contains('customFields')) db.createObjectStore('customFields', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('holidays')) db.createObjectStore('holidays', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('fees')) db.createObjectStore('fees', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('homework')) db.createObjectStore('homework', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('announcements')) db.createObjectStore('announcements', { keyPath: 'id' });
    },
  });
};

export const dbService = {
  async getAll(storeName: string) {
    const db = await initDB();
    return db.getAll(storeName);
  },
  async put(storeName: string, item: any) {
    const db = await initDB();
    return db.put(storeName, item);
  },
  async putAll(storeName: string, items: any[]) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    // Crucial: Clear existing data to ensure deleted items are removed from DB
    await tx.store.clear();
    for (const item of items) {
      tx.store.put(item);
    }
    await tx.done;
  },
  async delete(storeName: string, id: string) {
    const db = await initDB();
    return db.delete(storeName, id);
  },
  async clear(storeName: string) {
    const db = await initDB();
    return db.clear(storeName);
  }
};
