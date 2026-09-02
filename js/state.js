// Store unique : tout l'état de l'app tient dans un seul objet JSON,
// ce qui rend l'export Markdown et la sauvegarde triviaux (spec §6).

import { SEED_ITEMS, SECTION_MAP } from "./seed.js";
import { toast } from "./ui.js";

const STORAGE_KEY = "suivi.v1";
const SCHEMA = 1;

const listeners = [];

export const state = emptyState();

function emptyState() {
  return {
    schema: SCHEMA,
    items: [],
    checks: {},          // itemId -> { "2026-08-30": true }
    daily: {},           // "2026-08-30" -> { sommeil, fc, energie }
    nutrition: {},       // "2026-08-30" -> { items: {foodId: qté}, supps: {id: unités}, libre: [] }
    customFoods: [],     // aliments créés dans l'app
    foodOverrides: {},   // micros complétés par import : foodId -> { mg: 140, … }
    supplements: [],     // compléments calibrés par l'utilisateur
    recipes: [],         // recettes : ingrédients + nombre de parts
    workouts: [],        // séances : muscu (séries), course (LISS/HIIT/fractionné), mobilité
    customExercises: [], // exercices créés dans l'app
    objectives: { weekly: {}, monthly: {} },  // periodKey -> [{id,text,done}]
    notes: {},           // sectionKey -> texte libre
    importedHashes: {},  // hash -> timestamp (idempotence des imports)
    settings: {
      theme: "auto",
      reminders: { retour: "18:30", matin: "07:00", on: false },
      folded: {}         // sectionKey -> true si le thème est replié
    },
    seededIds: []        // ids de graine déjà injectés — permet d'en ajouter plus tard
  };
}

// ---------------------------------------------------------------- dates

export function dayKey(d) {
  const date = d || new Date();
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
}

export function weekStart(d) {
  const date = new Date((d || new Date()).getTime());
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();              // 0 = dimanche
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

export function weekDayKeys(d) {
  const start = weekStart(d);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start.getTime());
    x.setDate(start.getDate() + i);
    keys.push(dayKey(x));
  }
  return keys;
}

// ---------------------------------------------------------- persistance

export function load() {
  let parsed = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null; // stockage illisible : on repart d'un état vide plutôt que de planter
  }

  const base = emptyState();
  Object.assign(state, base, parsed || {});
  state.schema = SCHEMA;
  // Un merge superficiel laisserait les sous-objets absents à undefined.
  for (const k of ["checks", "daily", "nutrition", "notes", "importedHashes"]) {
    if (!state[k] || typeof state[k] !== "object") state[k] = {};
  }
  if (!Array.isArray(state.items)) state.items = [];
  if (!Array.isArray(state.seededIds)) state.seededIds = [];
  if (!Array.isArray(state.customFoods)) state.customFoods = [];
  if (!state.foodOverrides || typeof state.foodOverrides !== "object") state.foodOverrides = {};
  if (!Array.isArray(state.supplements)) state.supplements = [];
  if (!Array.isArray(state.recipes)) state.recipes = [];
  if (!Array.isArray(state.workouts)) state.workouts = [];
  if (!Array.isArray(state.customExercises)) state.customExercises = [];
  // Un élément null dans ces tableaux planterait chaque rendu suivant.
  state.customFoods = state.customFoods.filter((f) => f && typeof f === "object");
  state.supplements = state.supplements.filter((x) => x && typeof x === "object");
  state.recipes = state.recipes.filter((r) => r && typeof r === "object");
  state.workouts = state.workouts.filter((w) => w && typeof w === "object");
  state.customExercises = state.customExercises.filter((e) => e && typeof e === "object");
  state.settings = Object.assign(base.settings, state.settings || {});
  state.settings.reminders = Object.assign(base.settings.reminders, state.settings.reminders || {});
  if (!state.settings.folded || typeof state.settings.folded !== "object") state.settings.folded = {};
  if (!state.settings.targets || typeof state.settings.targets !== "object") state.settings.targets = {};

  if (!state.objectives || typeof state.objectives !== "object") state.objectives = { weekly: {}, monthly: {} };
  if (!state.objectives.weekly || typeof state.objectives.weekly !== "object") state.objectives.weekly = {};
  if (!state.objectives.monthly || typeof state.objectives.monthly !== "object") state.objectives.monthly = {};

  migrateHabitTracker();
  applySeed();
  refreshBlockedStatuses();
  return state;
}

// Récupération des données du tracker d'habitudes : l'app vit à la même
// adresse, ses données sont donc toujours dans le stockage du navigateur.
// Une seule fois, sans jamais toucher à la clé d'origine — elle reste
// disponible comme filet.
export const MIGRATION_RESULT = { habits: 0, objectives: 0, done: false };

function migrateHabitTracker() {
  if (state.migratedFromHabitTracker) return;

  let old = null;
  try {
    const raw = localStorage.getItem("habitTracker.v1");
    if (raw) old = JSON.parse(raw);
  } catch (e) {
    old = null;
  }

  state.migratedFromHabitTracker = true;
  if (!old || typeof old !== "object") return;

  // Objectifs hebdo / mensuels, repris tels quels.
  for (const scope of ["weekly", "monthly"]) {
    const src = old.objectives && old.objectives[scope];
    if (!src || typeof src !== "object") continue;
    for (const [periodKey, list] of Object.entries(src)) {
      if (!Array.isArray(list) || !list.length) continue;
      const target = state.objectives[scope][periodKey] || [];
      for (const o of list) {
        if (!o || typeof o.text !== "string" || !o.text.trim()) continue;
        if (target.some((x) => x.text === o.text)) continue;
        target.push({ id: makeId("o"), text: o.text.slice(0, 200), done: !!o.done });
        MIGRATION_RESULT.objectives++;
      }
      if (target.length) state.objectives[scope][periodKey] = target;
    }
  }

  // Habitudes + historique de complétion.
  if (Array.isArray(old.habits)) {
    for (const h of old.habits) {
      if (!h || typeof h.name !== "string" || !h.name.trim()) continue;
      const freq = (h.frequency >= 1 && h.frequency <= 7) ? Math.round(h.frequency) : 7;
      const id = "hab_" + String(h.id || makeId("h"));
      if (state.items.some((i) => i.id === id)) continue;
      state.items.push({
        id: id,
        section: "suivi",
        sub: null,
        group: "Habitudes reprises du tracker",
        title: h.name.slice(0, 200),
        detail: "",
        warn: "",
        kind: "task",
        status: "todo",
        priority: "normal",
        blockedBy: null,
        recurrence: freq === 7 ? { type: "daily" } : { type: "week", perWeek: freq },
        source: "tracker",
        createdAt: Date.now(),
        doneAt: null,
        pinned: false
      });
      MIGRATION_RESULT.habits++;

      const comp = old.completions && old.completions[h.id];
      if (comp && typeof comp === "object") {
        if (!state.checks[id]) state.checks[id] = {};
        for (const [dateKey, val] of Object.entries(comp)) {
          if (val && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) state.checks[id][dateKey] = true;
        }
      }
    }
  }

  MIGRATION_RESULT.done = MIGRATION_RESULT.habits > 0 || MIGRATION_RESULT.objectives > 0;
}

// N'injecte que les items de graine jamais vus. Un item supprimé par
// l'utilisateur ne revient donc pas, et une graine enrichie plus tard s'ajoute.
function applySeed() {
  const seen = new Set(state.seededIds);
  const existing = new Set(state.items.map((i) => i.id));
  let added = 0;
  for (const s of SEED_ITEMS) {
    if (seen.has(s.id) || existing.has(s.id)) continue;
    state.items.push(Object.assign({}, s, { createdAt: Date.now() }));
    state.seededIds.push(s.id);
    added++;
  }
  if (added) save();
}

export function save() {
  refreshBlockedStatuses();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Échec silencieux = l'utilisateur croit ses notes enregistrées alors
    // qu'elles vivent seulement en mémoire. On le dit, fort.
    console.error("Sauvegarde impossible", e);
    try { toast("⚠️ Sauvegarde impossible — exporte tes données via Réglages", "error"); } catch (e2) { /* hors DOM */ }
  }
  listeners.forEach((fn) => fn());
}

// Le statut « bloqué » est dérivé, pas saisi : dès qu'une racine est faite,
// ce qui en dépendait redevient « à faire », et inversement. Sans ça, un
// item pourrait afficher « bloqué » alors que plus rien ne le bloque.
function refreshBlockedStatuses() {
  for (const i of state.items) {
    if (!i.blockedBy) continue;
    if (i.status === "done" || i.status === "rejected" ||
        i.status === "queue" || i.status === "optional") continue;
    const blocked = !!rootBlocker(i);
    if (blocked && i.status === "todo") i.status = "blocked";
    else if (!blocked && i.status === "blocked") i.status = "todo";
  }
}

export function subscribe(fn) { listeners.push(fn); }

// Persiste sans notifier : pour les préférences purement visuelles (plier un
// thème), où un re-rendu complet couperait l'animation du navigateur.
export function saveQuiet() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Sauvegarde impossible", e);
  }
}

export function replaceAll(next) {
  const base = emptyState();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, base, next);
  state.schema = SCHEMA;
  save();
}

// -------------------------------------------------------------- lookups

export function byId(id) {
  return state.items.find((i) => i.id === id) || null;
}

export function makeId(prefix) {
  return (prefix || "x") + "_" + Date.now().toString(36) + "_" +
    Math.random().toString(36).slice(2, 7);
}

// ------------------------------------------------------------- blocages

// Remonte la chaîne blockedBy jusqu'à la racine encore non faite.
// C'est ce qui permet à la vue « Bloqué » de montrer que presque tout
// dépend d'un seul rendez-vous (spec §5.4).
export function rootBlocker(item, guard) {
  const seen = guard || new Set();
  if (!item || !item.blockedBy || seen.has(item.id)) return null;
  seen.add(item.id);
  const parent = byId(item.blockedBy);
  if (!parent) return null;
  if (isDone(parent)) return null;          // débloqué : la racine est levée
  const deeper = rootBlocker(parent, seen);
  // Cycle (possible seulement via un JSON restauré) : un item ne peut pas
  // être « bloqué par lui-même » — on s'arrête au parent, qui reste résoluble.
  if (deeper && deeper.id === item.id) return parent;
  return deeper || parent;
}

export function isBlocked(item) {
  return !!rootBlocker(item);
}

// Nombre d'items qui dépendent d'un item, transitivement.
export function dependentCount(id) {
  let n = 0;
  for (const i of state.items) {
    if (isDone(i)) continue;
    const root = rootBlocker(i);
    if (root && root.id === id) n++;
  }
  return n;
}

// ---------------------------------------------------------- avancement

export function isRecurring(item) {
  return !!(item.recurrence && item.recurrence.type);
}

export function isDone(item, key) {
  if (!item) return false;
  if (isRecurring(item)) {
    const k = key || dayKey();
    return !!(state.checks[item.id] && state.checks[item.id][k]);
  }
  return item.status === "done";
}

export function toggle(id, key) {
  const item = byId(id);
  if (!item) return;
  if (isRecurring(item)) {
    const k = key || dayKey();
    if (!state.checks[id]) state.checks[id] = {};
    if (state.checks[id][k]) delete state.checks[id][k];
    else state.checks[id][k] = true;
  } else if (item.status === "done") {
    item.status = item.blockedBy && isBlocked(item) ? "blocked" : "todo";
    item.doneAt = null;
  } else {
    item.status = "done";
    item.doneAt = Date.now();
  }
  save();
}

export function setStatus(id, status) {
  const item = byId(id);
  if (!item) return;
  item.status = status;
  item.doneAt = status === "done" ? Date.now() : null;
  save();
}

// Avancement hebdo d'un item récurrent : « 2 sur 3 », jamais un streak (spec §2.6).
export function weekProgress(item, ref) {
  if (!isRecurring(item)) return null;
  const keys = weekDayKeys(ref);
  const done = keys.filter((k) => state.checks[item.id] && state.checks[item.id][k]).length;
  const target = item.recurrence.type === "daily" ? 7 : item.recurrence.perWeek;
  return { done, target };
}

// ------------------------------------------------------------- mutations

export function addItem(fields) {
  const item = Object.assign({
    id: makeId("i"),
    section: "inbox",
    sub: null,
    group: null,
    title: "",
    detail: "",
    warn: "",
    kind: "task",
    status: "todo",
    priority: "normal",
    blockedBy: null,
    recurrence: null,
    source: "manual",
    createdAt: Date.now(),
    doneAt: null,
    pinned: false
  }, fields);
  if (!SECTION_MAP[item.section]) item.section = "inbox";
  state.items.push(item);
  save();
  return item;
}

export function updateItem(id, fields) {
  const item = byId(id);
  if (!item) return null;
  Object.assign(item, fields);
  save();
  return item;
}

export function removeItem(id) {
  const idx = state.items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  state.items.splice(idx, 1);
  delete state.checks[id];
  // Les items qui pointaient dessus ne sont plus bloqués par un fantôme.
  state.items.forEach((i) => {
    if (i.blockedBy === id) {
      i.blockedBy = null;
      if (i.status === "blocked") i.status = "todo";
    }
  });
  save();
}

// ---------------------------------------------------- suivi quotidien

export function setDaily(key, field, value) {
  const k = key || dayKey();
  if (!state.daily[k]) state.daily[k] = {};
  if (value === "" || value === null || value === undefined || Number.isNaN(value)) {
    delete state.daily[k][field];
    if (!Object.keys(state.daily[k]).length) delete state.daily[k];
  } else {
    state.daily[k][field] = value;
  }
  save();
}

export function dailyHistory(days) {
  const out = [];
  const today = new Date();
  for (let i = (days || 30) - 1; i >= 0; i--) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() - i);
    const k = dayKey(d);
    out.push({ key: k, date: d, values: state.daily[k] || {} });
  }
  return out;
}

// --------------------------------------------------------------- notes

export function setNote(sectionKey, text) {
  if (text && text.trim()) state.notes[sectionKey] = text;
  else delete state.notes[sectionKey];
  save();
}
