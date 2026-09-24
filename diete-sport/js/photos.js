// Photos de suivi (visage et corps).
//
// Elles vivent dans IndexedDB, pas dans l'état : une seule photo pèse plus
// que tout le reste de l'app réuni. Conséquence assumée : elles ne partent
// ni dans l'export Markdown, ni dans la sauvegarde JSON, ni dans le compte
// rendu — elles restent sur l'appareil et ne servent qu'à l'œil.

import { state, dayKey } from "./state.js";

const DB_NAME = "suivi-photos";
const STORE = "photos";
const MAX_SIDE = 1280;

export const PHOTO_KINDS = [
  { key: "visage", label: "Visage", icon: "🙂" },
  { key: "corps", label: "Corps", icon: "🧍" }
];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB indisponible")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("kind_date", ["kind", "date"]);
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error); };
    });
  });
}

// Redimensionne et recomprime : une photo d'iPhone fait 3 à 5 Mo, on vise
// ~150 Ko, largement assez pour comparer deux visages.
export function shrink(file) {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(function (blob) {
        if (blob) resolve({ blob: blob, w: w, h: h });
        else reject(new Error("Conversion impossible"));
      }, "image/jpeg", 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

export function addPhoto(file, kind, key) {
  const k = PHOTO_KINDS.some((x) => x.key === kind) ? kind : "corps";
  return shrink(file).then(function (out) {
    const entry = {
      id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      kind: k, date: key || dayKey(), at: Date.now(),
      w: out.w, h: out.h, size: out.blob.size, blob: out.blob
    };
    return tx("readwrite", (s) => s.put(entry)).then(() => entry);
  });
}

// Métadonnées seulement (sans les blobs) : de quoi construire une liste.
export function listPhotos(kind) {
  return tx("readonly", (s) => s.getAll()).then(function (rows) {
    return (rows || [])
      .filter((r) => !kind || r.kind === kind)
      .sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1))
      .map((r) => ({ id: r.id, kind: r.kind, date: r.date, at: r.at, w: r.w, h: r.h, size: r.size }));
  });
}

export function photoUrl(id) {
  return tx("readonly", (s) => s.get(id)).then(function (row) {
    return row && row.blob ? URL.createObjectURL(row.blob) : null;
  });
}

export function removePhoto(id) {
  return tx("readwrite", (s) => s.delete(id));
}

export function clearPhotos() {
  return tx("readwrite", (s) => s.clear());
}

export function photoStats() {
  return listPhotos().then(function (rows) {
    const out = { total: rows.length, bytes: rows.reduce((a, r) => a + (r.size || 0), 0), last: {} };
    for (const k of PHOTO_KINDS) {
      const list = rows.filter((r) => r.kind === k.key);
      out.last[k.key] = list.length ? list[list.length - 1].date : null;
    }
    return out;
  });
}

export function photoInterval() {
  const r = state.settings.reminders || {};
  const n = Math.round(+r.photoJours);
  return n >= 1 && n <= 90 ? n : 14;
}

export function daysSincePhoto(lastDate) {
  if (!lastDate) return null;
  return Math.round((new Date(dayKey() + "T12:00:00") - new Date(lastDate + "T12:00:00")) / 86400000);
}

export function fmtBytes(n) {
  if (n < 1024) return n + " o";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " Ko";
  return Math.round(n / 1024 / 102.4) / 10 + " Mo";
}
