// Cache client-side (IndexedDB) das abas de planilha abertas por upload.
// O back-end não guarda o arquivo bruto nem o estado do viewer — só a
// conversa — então sem isso a planilha some ao sair e voltar da tela.
const DB_NAME = "ranking_docs_cache";
const STORE = "docs";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDocsCache(key, docs) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ docs, savedAt: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

export async function loadDocsCache(key) {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return Array.isArray(result?.docs) ? result.docs : null;
  } catch {
    return null;
  }
}

export async function clearDocsCache(key) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}
