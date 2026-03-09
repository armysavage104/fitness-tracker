const DB_NAME = "fitProgressDB";
const DB_VERSION = 1;
const STORE = "days";

let db;

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: "date" });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };

        request.onerror = () => reject("DB error");
    });
}

export function saveDay(day) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        store.put(day);
        tx.oncomplete = async () => {

            if (window.syncDayToCloud) {
                await window.syncDayToCloud(day);
            }

            resolve();
        };
        tx.onerror = () => reject();
    });
}

export function getDay(date) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(date);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject();
    });
}

export function getAllDays() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject();
    });
}