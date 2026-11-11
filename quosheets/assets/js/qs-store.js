/**
 * Quosheets — armazenamento local (IndexedDB). Os arquivos do usuario ficam SO no navegador dele,
 * em um banco separado por conta (quosheets-u<ID>), com autosave.
 *  - store "files": arquivo completo { id, name, sheets, activeSheetId, charts, views, meta, createdAt, updatedAt }
 *  - store "index": resumo para listar rapido { id, name, updatedAt, rows, cols, sheets, bytes }
 */
(() => {
    const QS = window.QS;
    let dbPromise = null;

    function open(userId) {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                if (!window.indexedDB) { reject(new Error('IndexedDB indisponivel')); return; }
                const req = indexedDB.open(`quosheets-u${userId}`, 1);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
                    if (!db.objectStoreNames.contains('index')) db.createObjectStore('index', { keyPath: 'id' });
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }
        return dbPromise;
    }

    function tx(storeNames, mode, work) {
        return dbPromise.then((db) => new Promise((resolve, reject) => {
            const transaction = db.transaction(storeNames, mode);
            let result;
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('abort'));
            result = work(transaction);
        }));
    }

    function summary(file) {
        let rows = 0; let cols = 0; let cells = 0;
        file.sheets.forEach((s) => { rows += s.rows.length; cols = Math.max(cols, s.columns.length); cells += s.rows.length * s.columns.length; });
        return { id: file.id, name: file.name, updatedAt: file.updatedAt, createdAt: file.createdAt, rows, cols, sheets: file.sheets.length, bytes: cells * 14, source: file.meta && file.meta.source };
    }

    function list() {
        return dbPromise.then((db) => new Promise((resolve, reject) => {
            const req = db.transaction(['index'], 'readonly').objectStore('index').getAll();
            req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.updatedAt - a.updatedAt));
            req.onerror = () => reject(req.error);
        }));
    }

    function load(id) {
        return dbPromise.then((db) => new Promise((resolve, reject) => {
            const req = db.transaction(['files'], 'readonly').objectStore('files').get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        }));
    }

    function save(file) {
        file.updatedAt = Date.now();
        return tx(['files', 'index'], 'readwrite', (t) => {
            t.objectStore('files').put(file);
            t.objectStore('index').put(summary(file));
        });
    }

    function remove(id) {
        return tx(['files', 'index'], 'readwrite', (t) => {
            t.objectStore('files').delete(id);
            t.objectStore('index').delete(id);
        });
    }

    async function rename(id, name) {
        const file = await load(id);
        if (!file) return;
        file.name = name;
        await save(file);
    }

    async function duplicate(id, suffix) {
        const file = await load(id);
        if (!file) return null;
        const copy = JSON.parse(JSON.stringify(file));
        copy.id = QS.uid('f');
        copy.name = `${file.name} ${suffix}`.trim();
        copy.createdAt = Date.now();
        await save(copy);
        return copy;
    }

    async function estimate() {
        try { return navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) { return null; }
    }

    async function persist() {
        try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* opcional */ }
    }

    QS.store = { open, list, load, save, remove, rename, duplicate, estimate, persist };
})();
