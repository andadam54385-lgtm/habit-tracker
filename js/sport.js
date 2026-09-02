// Module entraînement : séances de muscu série par série, sorties course
// (LISS, HIIT, fractionné) et routines guidées. Chaque séance enregistrée
// coche la case du jour correspondante, pour que les taux de réussite et
// l'évolution par rubrique en tiennent compte sans double saisie.

import { state, save, dayKey, weekDayKeys, byId, isDone, toggle, makeId } from "./state.js";
import {
  EXERCISES, EXERCISE_MAP, TEMPLATES, ROUTINE_MAP, GROUP_MAP
} from "./exercises.js";

// ------------------------------------------------------------- exercices

export function allExercises() {
  return EXERCISES.concat(state.customExercises || []);
}

export function exerciseById(id) {
  return EXERCISE_MAP[id] || (state.customExercises || []).find((e) => e.id === id) || null;
}

export function addCustomExercise(fields) {
  const label = String(fields.label || "").trim();
  if (!label) return null;
  if (!state.customExercises) state.customExercises = [];
  const entry = {
    id: makeId("ex"),
    label: label.slice(0, 60),
    group: GROUP_MAP[fields.group] ? fields.group : "gainage",
    cue: String(fields.cue || "").slice(0, 200),
    load: ["kg", "corps", "temps"].indexOf(fields.load) >= 0 ? fields.load : "kg",
    custom: true
  };
  state.customExercises.push(entry);
  save();
  return entry;
}

export function searchExercises(query, group) {
  const q = String(query || "").trim().toLowerCase();
  return allExercises().filter(function (e) {
    if (group && group !== "all" && e.group !== group) return false;
    return !q || e.label.toLowerCase().includes(q);
  });
}

// --------------------------------------------------------------- modèles

// Un modèle = un nom, une liste d'exercices avec séries × reps visées, et
// la case du jour qu'il valide. `link` vaut "auto" (première des séances
// A/B pas encore faite), "none", ou l'id d'un item précis.
export function customTemplates() {
  return state.workoutTemplates || [];
}

export function allTemplates() {
  return TEMPLATES.map((t) => ({ key: t.key, label: t.label, plan: t.plan, link: t.item || "auto", builtin: true }))
    .concat(customTemplates().map((t) => ({ key: t.id, label: t.label, plan: t.plan, link: t.link || "auto", builtin: false })));
}

export function templateByKey(key) {
  return allTemplates().find((t) => t.key === key) || null;
}

export function upsertTemplate(tpl) {
  if (!state.workoutTemplates) state.workoutTemplates = [];
  const label = String(tpl.label || "").trim();
  if (!label) return null;
  const plan = (tpl.plan || [])
    .filter((p) => p && exerciseById(p.ex))
    .map((p) => ({
      ex: p.ex,
      sets: Math.min(12, Math.max(1, Math.round(num(p.sets, 3)))),
      reps: Math.min(300, Math.max(1, Math.round(num(p.reps, 8)))),
      tempo: cleanTempo(p.tempo)
    }));
  if (!plan.length) return null;
  const link = (tpl.link === "auto" || tpl.link === "none") ? tpl.link
    : (byId(tpl.link) ? tpl.link : "auto");

  const existing = tpl.id ? customTemplates().find((t) => t.id === tpl.id) : null;
  if (existing) {
    existing.label = label.slice(0, 60);
    existing.plan = plan;
    existing.link = link;
    save();
    return existing;
  }
  const entry = { id: makeId("tpl"), label: label.slice(0, 60), plan: plan, link: link };
  state.workoutTemplates.push(entry);
  save();
  return entry;
}

export function removeTemplate(id) {
  if (!state.workoutTemplates) return;
  state.workoutTemplates = state.workoutTemplates.filter((t) => t.id !== id);
  save();
}

// Les séances A et B viennent de la spec : on ne les supprime pas, on les
// masque. Elles restent restaurables d'un tap.
export function hiddenTemplates() {
  return (state.settings && Array.isArray(state.settings.hiddenTemplates)) ? state.settings.hiddenTemplates : [];
}

export function hideTemplate(key) {
  if (!state.settings.hiddenTemplates) state.settings.hiddenTemplates = [];
  if (state.settings.hiddenTemplates.indexOf(key) < 0) state.settings.hiddenTemplates.push(key);
  save();
}

export function unhideTemplates() {
  state.settings.hiddenTemplates = [];
  save();
}

// Les N dernières séances faites avec ce modèle, la plus récente d'abord.
export function lastWorkoutsForTemplate(key, n) {
  return workouts()
    .filter((w) => w.type === "muscu" && w.template === key)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at))
    .slice(0, n || 2);
}

// Dernière performance sur un exercice : ses séries telles quelles.
export function lastSetsFor(exId) {
  const hist = exerciseHistory(exId);
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const w = workoutById(last.workoutId);
  const e = w && (w.exercises || []).find((x) => x.ex === exId);
  return e ? { date: last.date, sets: e.sets } : null;
}

// Date de la dernière séance faite avec ce modèle, ou null.
export function templateLastUsed(key) {
  let last = null;
  for (const w of workouts()) {
    if (w.type !== "muscu" || w.template !== key) continue;
    if (!last || w.date > last) last = w.date;
  }
  return last;
}

export const TEMPLATE_SORTS = [
  { key: "recent", label: "Récentes" },
  { key: "name", label: "A → Z" },
  { key: "order", label: "Ordre" }
];

export function templateSort() {
  const s = state.settings && state.settings.templateSort;
  return TEMPLATE_SORTS.some((x) => x.key === s) ? s : "order";
}

export function setTemplateSort(key) {
  if (!TEMPLATE_SORTS.some((x) => x.key === key)) return;
  state.settings.templateSort = key;
  save();
}

// Modèles visibles, triés selon la préférence. « libre » reste toujours en
// dernier : ce n'est pas une séance, c'est une porte de sortie.
export function sortedTemplates() {
  const hidden = hiddenTemplates();
  const list = allTemplates()
    .filter((t) => hidden.indexOf(t.key) < 0)
    .map((t) => Object.assign({}, t, { lastUsed: templateLastUsed(t.key) }));
  const libre = list.filter((t) => t.key === "libre");
  const rest = list.filter((t) => t.key !== "libre");
  const sort = templateSort();
  if (sort === "name") {
    rest.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  } else if (sort === "recent") {
    rest.sort(function (a, b) {
      if (a.lastUsed && b.lastUsed) return a.lastUsed < b.lastUsed ? 1 : a.lastUsed > b.lastUsed ? -1 : 0;
      if (a.lastUsed) return -1;
      if (b.lastUsed) return 1;
      return 0;
    });
  }
  return rest.concat(libre);
}

// --------------------------------------------------------------- séances

function num(v, def) {
  const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
  return Number.isFinite(n) ? n : (def === undefined ? 0 : def);
}

// Tempo sur 4 positions, convention de l'utilisateur :
// début de mouvement · concentrique · fin de mouvement · excentrique.
// Chiffres en secondes, X = explosif. "0101" par défaut si on en veut un.
export function cleanTempo(v) {
  return String(v === undefined || v === null ? "" : v).toUpperCase().replace(/[^0-9X]/g, "").slice(0, 4);
}

export function tempoLabel(t) {
  const c = cleanTempo(t);
  if (c.length !== 4) return "";
  const s = (ch) => (ch === "X" ? "explosif" : ch + " s");
  return "début " + s(c[0]) + " · montée " + s(c[1]) + " · fin " + s(c[2]) + " · descente " + s(c[3]);
}

// RPE optionnel, borné 1-10 ; null si absent.
function cleanRpe(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Math.round(num(v));
  return n >= 1 && n <= 10 ? n : null;
}

export function workouts() {
  return state.workouts || [];
}

export function workoutById(id) {
  return workouts().find((w) => w.id === id) || null;
}

export function workoutsOn(key) {
  return workouts().filter((w) => w.date === key);
}

// Normalise puis enregistre. `w.type` ∈ muscu | course | mobilite.
export function addWorkout(w) {
  if (!state.workouts) state.workouts = [];
  const entry = {
    id: makeId("w"),
    type: ["muscu", "course", "mobilite"].indexOf(w.type) >= 0 ? w.type : "muscu",
    date: /^\d{4}-\d{2}-\d{2}$/.test(w.date || "") ? w.date : dayKey(),
    at: Date.now(),
    duration: Math.max(0, Math.round(num(w.duration))),   // secondes
    rpe: w.rpe ? Math.min(10, Math.max(1, Math.round(num(w.rpe)))) : null,
    note: String(w.note || "").slice(0, 300)
  };

  if (entry.type === "muscu") {
    entry.template = templateByKey(w.template) ? w.template : "libre";
    entry.label = String(w.label || (templateByKey(entry.template) || {}).label || "Séance").slice(0, 60);
    entry.exercises = (w.exercises || [])
      .map(function (e) {
        const ex = exerciseById(e.ex);
        if (!ex) return null;
        const sets = (e.sets || []).map(function (s) {
          return { reps: Math.max(0, Math.round(num(s.reps))), weight: Math.max(0, num(s.weight)), rpe: cleanRpe(s.rpe) };
        }).filter((s) => s.reps > 0);
        return sets.length ? { ex: ex.id, sets: sets, tempo: cleanTempo(e.tempo) } : null;
      })
      .filter(Boolean);
    if (!entry.exercises.length) return null;
    // RPE de séance : saisi, sinon moyenne des RPE de séries s'il y en a.
    if (entry.rpe === null) {
      const rpes = entry.exercises.flatMap((e) => e.sets.map((s) => s.rpe)).filter((r) => r !== null);
      if (rpes.length) entry.rpe = Math.round(rpes.reduce((a, r) => a + r, 0) / rpes.length);
    }
  }

  if (entry.type === "course") {
    entry.mode = ["liss", "hiit", "fractionne"].indexOf(w.mode) >= 0 ? w.mode : "liss";
    entry.distance = w.distance ? Math.max(0, Math.round(num(w.distance) * 100) / 100) : null;
    if (entry.mode !== "liss") {
      entry.work = Math.max(0, Math.round(num(w.work)));
      entry.rest = Math.max(0, Math.round(num(w.rest)));
      entry.rounds = Math.max(0, Math.round(num(w.rounds)));
    }
    if (!entry.duration) return null;
  }

  if (entry.type === "mobilite") {
    if (!ROUTINE_MAP[w.routine]) return null;
    entry.routine = w.routine;
    entry.completed = w.completed !== false;
  }

  state.workouts.push(entry);
  const linked = markLinkedItem(entry);
  entry.linked = linked;
  save();
  return entry;
}

export function removeWorkout(id) {
  if (!state.workouts) return;
  state.workouts = state.workouts.filter((w) => w.id !== id);
  save();
}

// ----------------------------------------------- lien avec les cases du jour

// Quelle case du jour une séance valide-t-elle ?
export function linkedItemFor(w) {
  if (w.type === "muscu") {
    const t = templateByKey(w.template);
    const link = t ? t.link : "auto";
    if (link === "none") return null;
    if (link && link !== "auto") return link;
    // Séance libre ou modèle en « auto » : la première des deux pas encore faite.
    const a = byId("entr-seance-a"), b = byId("entr-seance-b");
    if (a && !isDone(a, w.date)) return "entr-seance-a";
    if (b && !isDone(b, w.date)) return "entr-seance-b";
    return "entr-seance-a";
  }
  if (w.type === "course") return "entr-cardio";
  if (w.type === "mobilite") {
    const r = ROUTINE_MAP[w.routine];
    if (!r) return null;
    if (r.item === "relax-auto-55") {
      return new Date().getHours() < 12 ? "relax-matin" : "relax-retour";
    }
    return r.item;
  }
  return null;
}

// Coche la case si elle ne l'est pas déjà ; retourne l'id coché ou null.
export function markLinkedItem(w) {
  if (w.type === "mobilite" && w.completed === false) return null;
  const id = linkedItemFor(w);
  const item = id ? byId(id) : null;
  if (!item) return null;
  if (!isDone(item, w.date)) toggle(id, w.date);
  return id;
}

// ------------------------------------------------------------ progression

// Formule d'Epley : 1RM estimé. Sert à comparer des séries à reps différentes.
export function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function setVolume(sets) {
  return sets.reduce((a, s) => a + s.reps * (s.weight || 0), 0);
}

// Historique d'un exercice, séance par séance, du plus ancien au plus récent.
export function exerciseHistory(exId, limit) {
  const out = [];
  for (const w of workouts()) {
    if (w.type !== "muscu") continue;
    const e = (w.exercises || []).find((x) => x.ex === exId);
    if (!e) continue;
    let best = null;
    for (const s of e.sets) {
      const rm = estimate1RM(s.weight, s.reps);
      if (!best || rm > best.rm || (rm === best.rm && s.reps > best.reps)) {
        best = { rm: rm, weight: s.weight, reps: s.reps, rpe: s.rpe === undefined ? null : s.rpe };
      }
    }
    out.push({
      date: w.date, at: w.at, workoutId: w.id,
      sets: e.sets.length, volume: setVolume(e.sets),
      best: best
    });
  }
  // Par date de séance d'abord : une séance saisie après coup pour un jour
  // passé doit se ranger à sa place, pas en dernier.
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at));
  return limit ? out.slice(-limit) : out;
}

export function exerciseBest(exId) {
  const hist = exerciseHistory(exId);
  let best = null;
  for (const h of hist) {
    if (h.best && (!best || h.best.rm > best.rm)) best = Object.assign({ date: h.date }, h.best);
  }
  return best;
}

// Exercices déjà pratiqués, avec dernier résultat et record.
export function exercisesPracticed() {
  const ids = [];
  for (const w of workouts()) {
    if (w.type !== "muscu") continue;
    for (const e of w.exercises || []) if (ids.indexOf(e.ex) < 0) ids.push(e.ex);
  }
  return ids.map(function (id) {
    const hist = exerciseHistory(id);
    const last = hist[hist.length - 1];
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    return {
      ex: exerciseById(id) || { id: id, label: id, group: "gainage", load: "kg" },
      history: hist,
      last: last,
      best: exerciseBest(id),
      delta: last && prev && last.best && prev.best ? last.best.rm - prev.best.rm : null
    };
  }).sort((a, b) => (b.last ? b.last.at : 0) - (a.last ? a.last.at : 0));
}

// ---------------------------------------------------------------- semaine

export function weekWorkouts(ref) {
  const keys = weekDayKeys(ref);
  return workouts().filter((w) => keys.indexOf(w.date) >= 0);
}

export function weeklySummary() {
  const ws = weekWorkouts();
  const out = {
    muscu: ws.filter((w) => w.type === "muscu").length,
    course: ws.filter((w) => w.type === "course").length,
    mobilite: ws.filter((w) => w.type === "mobilite").length,
    minutes: Math.round(ws.reduce((a, w) => a + (w.duration || 0), 0) / 60),
    km: Math.round(ws.filter((w) => w.type === "course").reduce((a, w) => a + (w.distance || 0), 0) * 10) / 10
  };
  out.total = out.muscu + out.course + out.mobilite;
  return out;
}

export function runStats(weeks) {
  const n = weeks || 8;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const ws = weekWorkouts(d).filter((w) => w.type === "course");
    out.push({
      offset: -i,
      sessions: ws.length,
      minutes: Math.round(ws.reduce((a, w) => a + (w.duration || 0), 0) / 60),
      km: Math.round(ws.reduce((a, w) => a + (w.distance || 0), 0) * 10) / 10
    });
  }
  return out;
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
  return m + ":" + String(r).padStart(2, "0");
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
