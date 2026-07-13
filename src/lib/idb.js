// Minimal promise wrapper around IndexedDB.
// Stores: "kv" (mirror of the main log + misc), "photos" (progress photo blobs).

const DB_NAME = "ember";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("photos")) {
        const s = db.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const out = fn(s);
        t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const kvGet = (key) =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction("kv").objectStore("kv").get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );

export const kvSet = (key, value) => tx("kv", "readwrite", (s) => s.put(value, key));
export const kvDel = (key) => tx("kv", "readwrite", (s) => s.delete(key));

export const photoAdd = (rec) =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction("photos", "readwrite");
        const req = t.objectStore("photos").add(rec);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );

export const photoAll = () =>
  openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction("photos").objectStore("photos").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );

export const photoDel = (id) => tx("photos", "readwrite", (s) => s.delete(id));
