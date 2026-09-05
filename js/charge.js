// Charge d'entraînement (sRPE = RPE × minutes), volume par muscle, records.
// La charge sert la règle de la reprise : pas de bond d'une semaine à l'autre.

import { state, save } from "./state.js";
import { workouts, weekWorkouts, exerciseById, secondaryOf, circuitByKey, estimate1RM, fmtDuration } from "./sport.js";
import { GROUP_MAP } from "./exercises.js";

// ------------------------------------------------------------------ charge

export function sessionLoad(w) {
  let minutes = (w.duration || 0) / 60;
  // Séance de muscu sans durée (saisie a posteriori) : 2,5 min par série.
  if (!minutes && w.type === "muscu") minutes = w.exercises.reduce((a, e) => a + e.sets.length, 0) * 2.5;
  return Math.round((w.rpe || 6) * minutes);
}

export function weekLoad(ref) {
  return weekWorkouts(ref).reduce((a, w) => a + sessionLoad(w), 0);
}

export function loadHistory(n) {
  const out = [];
  for (let i = (n || 8) - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const ws = weekWorkouts(d);
    out.push({ offset: -i, load: ws.reduce((a, w) => a + sessionLoad(w), 0), sessions: ws.length });
  }
  return out;
}

export const LOAD_RATIO_MAX = 1.3;

// Semaine en cours contre la moyenne des 4 précédentes (celles avec des
// séances). Moins de deux semaines de référence : pas de verdict.
export function loadStatus() {
  const history = loadHistory(8);
  const current = history[7].load;
  const prev = history.slice(3, 7).filter((h) => h.load > 0);
  if (prev.length < 2) return { current: current, mean: null, ratio: null, level: "na", history: history };
  const mean = prev.reduce((a, h) => a + h.load, 0) / prev.length;
  const ratio = current / mean;
  const level = ratio > LOAD_RATIO_MAX ? "high" : ratio < 0.8 ? "low" : "ok";
  return { current: current, mean: Math.round(mean), ratio: ratio, level: level, history: history };
}

// ---------------------------------------------------------- volume par muscle

export const VOLUME_METRICS = [
  { key: "tonnage", label: "Tonnage", unit: "kg" },
  { key: "sets", label: "Séries", unit: "" },
  { key: "reps", label: "Reps", unit: "" },
  { key: "rpe", label: "RPE moyen", unit: "" }
];

export function volumeMetric() {
  const k = state.settings.volumeMetric;
  return VOLUME_METRICS.some((m) => m.key === k) ? k : "tonnage";
}

export function setVolumeMetric(k) {
  if (!VOLUME_METRICS.some((m) => m.key === k)) return;
  state.settings.volumeMetric = k;
  save();
}

function bucket(acc, group) {
  return acc[group] || (acc[group] = { group: group, tonnage: 0, sets: 0, reps: 0, rpeSum: 0, rpeN: 0 });
}

// Un muscle secondaire travaille sans être la cible : il compte pour
// moitié, sinon le dos d'un rowing pèserait autant que ses biceps.
export const SECONDARY_SHARE = 0.5;

export function muscleVolume(ref) {
  const acc = {};
  for (const w of weekWorkouts(ref)) {
    if (w.type === "muscu") {
      for (const e of w.exercises) {
        const ex = exerciseById(e.ex);
        if (!ex) continue;
        const targets = [{ group: ex.group, share: 1 }]
          .concat(secondaryOf(ex).map((g) => ({ group: g, share: SECONDARY_SHARE })));
        for (const t of targets) {
          const g = bucket(acc, t.group);
          for (const s of e.sets) {
            g.sets += t.share;
            g.reps += s.reps * t.share;
            g.tonnage += s.reps * (s.weight || 0) * t.share;
            const r = s.rpe || w.rpe;
            if (r) { g.rpeSum += r; g.rpeN++; }
          }
        }
      }
    } else if (w.type === "circuit") {
      const stations = w.stations || [];
      stations.forEach(function (p, i) {
        const ex = exerciseById(p.ex);
        if (!ex) return;
        const passes = (w.rounds || 0) + (i < (w.stationsDone || 0) ? 1 : 0);
        if (!passes) return;
        const g = bucket(acc, ex.group);
        g.sets += passes;
        if (p.unit === "reps") g.reps += p.qty * passes;
        if (w.rpe) { g.rpeSum += w.rpe * passes; g.rpeN += passes; }
      });
    }
  }
  const metric = volumeMetric();
  return Object.values(acc).map(function (g) {
    const meta = GROUP_MAP[g.group] || { label: g.group, icon: "" };
    return {
      group: g.group, label: meta.label, icon: meta.icon,
      tonnage: Math.round(g.tonnage), sets: Math.round(g.sets * 10) / 10, reps: Math.round(g.reps),
      rpe: g.rpeN ? Math.round(g.rpeSum / g.rpeN * 10) / 10 : null
    };
  }).sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
}

// ----------------------------------------------------------------- records

// Meilleur résultat sur un circuit : temps le plus court pour des tours
// fixes (circuit complet seulement), score le plus haut pour un AMRAP.
export function circuitBest(key) {
  const t = circuitByKey(key);
  if (!t) return null;
  const list = workouts().filter((w) => w.type === "circuit" && w.template === key);
  let best = null;
  if (t.mode === "amrap") {
    for (const w of list) {
      const score = (w.rounds || 0) * (w.stations || []).length + (w.stationsDone || 0);
      if (!best || score > best.score) {
        best = { w: w, score: score, label: w.rounds + " tour" + (w.rounds > 1 ? "s" : "") + (w.stationsDone ? " + " + w.stationsDone : "") };
      }
    }
  } else {
    for (const w of list) {
      if (w.rounds < t.rounds || !w.duration) continue;
      if (!best || w.duration < best.score) best = { w: w, score: w.duration, label: fmtDuration(w.duration) };
    }
  }
  return best;
}

export function isCircuitPR(w) {
  if (!w || w.type !== "circuit" || !w.template) return false;
  const b = circuitBest(w.template);
  const n = workouts().filter((x) => x.type === "circuit" && x.template === w.template).length;
  return !!b && b.w.id === w.id && n > 1;
}

// 1RM estimé le plus haut d'une liste d'exercices, pour détecter un record
// entre avant et après l'enregistrement d'une séance.
export function bestRmMap(exIds) {
  const out = {};
  for (const id of exIds) {
    let best = 0;
    for (const w of workouts()) {
      if (w.type !== "muscu") continue;
      for (const e of w.exercises) {
        if (e.ex !== id) continue;
        for (const s of e.sets) { const rm = estimate1RM(s.weight, s.reps); if (rm > best) best = rm; }
      }
    }
    out[id] = best;
  }
  return out;
}
