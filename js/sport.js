// Module entraînement : séances de muscu série par série, sorties course
// (LISS, HIIT, fractionné) et routines guidées. Chaque séance enregistrée
// coche la case du jour correspondante, pour que les taux de réussite et
// l'évolution par rubrique en tiennent compte sans double saisie.

import { state, save, dayKey, weekDayKeys, byId, isDone, toggle, makeId } from "./state.js";
import {
  EXERCISES, EXERCISE_MAP, TEMPLATE_MAP, ROUTINE_MAP, GROUP_MAP
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

// --------------------------------------------------------------- séances

function num(v, def) {
  const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
  return Number.isFinite(n) ? n : (def === undefined ? 0 : def);
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
    entry.template = TEMPLATE_MAP[w.template] ? w.template : "libre";
    entry.label = String(w.label || TEMPLATE_MAP[entry.template].label).slice(0, 60);
    entry.exercises = (w.exercises || [])
      .map(function (e) {
        const ex = exerciseById(e.ex);
        if (!ex) return null;
        const sets = (e.sets || []).map(function (s) {
          return { reps: Math.max(0, Math.round(num(s.reps))), weight: Math.max(0, num(s.weight)) };
        }).filter((s) => s.reps > 0);
        return sets.length ? { ex: ex.id, sets: sets } : null;
      })
      .filter(Boolean);
    if (!entry.exercises.length) return null;
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
    const t = TEMPLATE_MAP[w.template];
    if (t && t.item) return t.item;
    // Séance libre : la première des deux qui n'est pas encore faite.
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
        best = { rm: rm, weight: s.weight, reps: s.reps };
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
