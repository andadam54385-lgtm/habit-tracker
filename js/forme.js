// Forme du jour, journal du soir et séries : la partie « Bevel » de l'app,
// saisie à la main en dix secondes. Tout vit dans state.daily[jour], à côté
// des mesures importées (sommeil=7.2, fc=58, hrv=45…).

import { state, save, dayKey, weekDayKeys, weekStart, isRecurring } from "./state.js";

// Quatre questions, quatre réponses chacune, de 1 (mauvais) à 4 (top).
export const CHECKIN = [
  { key: "sommeil_q", label: "Sommeil", opts: [["😵", "< 5 h"], ["😪", "5-6 h"], ["🙂", "6-7 h"], ["😴", "7 h +"]] },
  { key: "energie_q", label: "Énergie", opts: [["🪫", "À plat"], ["😮‍💨", "Fatigué"], ["👍", "Correct"], ["⚡", "En forme"]] },
  { key: "douleur_q", label: "Douleurs", opts: [["🤕", "Fortes"], ["😬", "Gênantes"], ["🤏", "Légères"], ["✅", "Aucune"]] },
  { key: "humeur_q", label: "Humeur", opts: [["🌧️", "Bas"], ["🌥️", "Moyen"], ["🌤️", "Bien"], ["☀️", "Top"]] }
];

export function dayData(key) { return state.daily[key || dayKey()] || {}; }

export function checkinFor(key) {
  const d = dayData(key);
  return CHECKIN.every((q) => d[q.key] >= 1 && d[q.key] <= 4) ? d : null;
}

// Score sur 10 : 4 réponses de 1 à 4, somme de 4 (→ 1) à 16 (→ 10).
export function formeScore(values) {
  const sum = CHECKIN.reduce((a, q) => a + (values[q.key] || 0), 0);
  return Math.max(1, Math.min(10, Math.round(1 + (sum - 4) * 9 / 12)));
}

export function formeAdvice(score) {
  if (score >= 8) return { level: "go", face: "🔥", label: "Feu vert", hint: "Séance normale, tu peux pousser un peu." };
  if (score >= 5) return { level: "easy", face: "🙂", label: "Lève le pied", hint: "Séance courte, RPE 6 max, ou une marche." };
  return { level: "rest", face: "🛌", label: "Repos", hint: "Mobilité, respiration, sommeil. Pas de séance dure aujourd'hui." };
}

// Sleep Cycle / Apple Santé : les heures importées (sommeil=7.2) proposent
// la réponse Sommeil toute seule.
export function sleepOption(hours) {
  if (typeof hours !== "number" || Number.isNaN(hours)) return null;
  return hours < 5 ? 1 : hours < 6 ? 2 : hours < 7 ? 3 : 4;
}

export function saveCheckin(values, key) {
  const k = key || dayKey();
  if (!state.daily[k]) state.daily[k] = {};
  for (const q of CHECKIN) {
    const v = Math.round(+values[q.key]);
    if (v >= 1 && v <= 4) state.daily[k][q.key] = v;
  }
  state.daily[k].forme = formeScore(state.daily[k]);
  save();
  return state.daily[k].forme;
}

// ---------------------------------------------------------- journal du soir

export function saveJournal(fields, key) {
  const k = key || dayKey();
  if (!state.daily[k]) state.daily[k] = {};
  const d = state.daily[k];
  const note = Math.round(+fields.note);
  if (note >= 1 && note <= 10) d.journee = note; else delete d.journee;
  const r = String(fields.reussites || "").trim().slice(0, 600);
  if (r) d.reussites = r; else delete d.reussites;
  const b = String(fields.bloque || "").trim().slice(0, 400);
  if (b) d.bloque = b; else delete d.bloque;
  if (!Object.keys(d).length) delete state.daily[k];
  save();
}

export function journalFor(key) {
  const d = dayData(key);
  if (!d.journee && !d.reussites && !d.bloque) return null;
  return { note: d.journee || null, reussites: d.reussites || "", bloque: d.bloque || "" };
}

// ------------------------------------------------------------------ séries

function prevKey(k, n) {
  const d = new Date(k + "T12:00:00");
  d.setDate(d.getDate() - (n || 1));
  return dayKey(d);
}

// Jours consécutifs, jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas
// encore fait : la série n'est pas cassée avant minuit).
function dayStreak(pred) {
  let k = dayKey();
  if (!pred(k)) k = prevKey(k);
  let n = 0;
  while (pred(k) && n < 3660) { n++; k = prevKey(k); }
  return n;
}

function bestDayStreak(sortedKeys) {
  let best = 0, run = 0, prev = null;
  for (const k of sortedKeys) {
    run = (prev && prevKey(k) === prev) ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }
  return best;
}

export function checkinStreak() {
  const has = (k) => !!checkinFor(k);
  return { current: dayStreak(has), best: bestDayStreak(Object.keys(state.daily).filter(has).sort()) };
}

// Série d'une habitude : jours consécutifs pour une quotidienne, semaines
// consécutives à l'objectif pour une hebdomadaire.
export function streakFor(item) {
  if (!isRecurring(item)) return null;
  const checks = state.checks[item.id] || {};
  const has = (k) => !!checks[k];
  if (item.recurrence.type === "daily") {
    return { unit: "jour", current: dayStreak(has), best: bestDayStreak(Object.keys(checks).filter(has).sort()) };
  }
  const target = item.recurrence.perWeek;
  const weekOk = (ref) => weekDayKeys(ref).filter(has).length >= target;
  const ref = new Date();
  let current = 0;
  if (!weekOk(ref)) ref.setDate(ref.getDate() - 7);
  while (weekOk(ref) && current < 520) { current++; ref.setDate(ref.getDate() - 7); }
  const keys = Object.keys(checks).filter(has).sort();
  let best = 0;
  if (keys.length) {
    const d = weekStart(new Date(keys[0] + "T12:00:00"));
    const end = new Date();
    let run = 0;
    while (d <= end && best < 520) {
      if (weekOk(d)) { run++; if (run > best) best = run; } else run = 0;
      d.setDate(d.getDate() + 7);
    }
  }
  return { unit: "semaine", current: current, best: best };
}

export function topStreaks(limit) {
  return state.items
    .filter((i) => isRecurring(i) && i.status !== "rejected" && i.status !== "queue")
    .map((i) => ({ item: i, s: streakFor(i) }))
    .filter((x) => x.s && x.s.current >= 2)
    .sort((a, b) => b.s.current - a.s.current)
    .slice(0, limit || 5);
}

// Moyenne d'une mesure quotidienne sur des jours donnés (null si aucune).
export function averageOf(field, keys) {
  const vals = keys.map((k) => dayData(k)[field]).filter((v) => typeof v === "number");
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10;
}
