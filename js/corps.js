// Suivi corporel : poids, masse grasse, masse musculaire.
//
// Le poids se prend souvent, la composition rarement (balance de la salle).
// On ne compare donc jamais deux mesures isolées : on compare des moyennes
// de fenêtres (7 et 14 jours), et on dit toujours sur combien de mesures.

import { state, save, dayKey } from "./state.js";

export const BODY_FIELDS = [
  { key: "poids", label: "Poids", short: "Poids", unit: "kg", min: 30, max: 250, step: 0.1, dec: 1, better: "any" },
  { key: "gras", label: "Masse grasse", short: "Gras", unit: "%", min: 3, max: 60, step: 0.1, dec: 1, better: "down" },
  { key: "muscle", label: "Masse musculaire", short: "Muscle", unit: "%", min: 10, max: 70, step: 0.1, dec: 1, better: "up" }
];

export const BODY_MAP = BODY_FIELDS.reduce(function (a, f) { a[f.key] = f; return a; }, {});

export const WINDOWS = [7, 14];

function clean(field, v) {
  const f = BODY_MAP[field];
  if (!f) return null;
  const n = parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < f.min || n > f.max) return null;
  return Math.round(n * 10) / 10;
}

// Enregistre ce qui est renseigné, efface ce qui est vidé. Les trois champs
// sont indépendants : peser sans balance à impédance reste utile.
export function setBody(values, key) {
  const k = key || dayKey();
  if (!state.daily[k]) state.daily[k] = {};
  const d = state.daily[k];
  for (const f of BODY_FIELDS) {
    if (!(f.key in values)) continue;
    const v = clean(f.key, values[f.key]);
    if (v === null) delete d[f.key]; else d[f.key] = v;
  }
  if (!Object.keys(d).length) delete state.daily[k];
  save();
  return state.daily[k] || {};
}

export function bodyEntries(field) {
  return Object.keys(state.daily).sort()
    .map((k) => ({ key: k, value: state.daily[k][field] }))
    .filter((e) => typeof e.value === "number");
}

export function lastEntry(field) {
  const list = bodyEntries(field);
  return list.length ? list[list.length - 1] : null;
}

function shiftKey(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dayKey(d);
}

// Moyenne des mesures dans [aujourd'hui - from - days + 1, aujourd'hui - from].
export function windowAverage(field, days, from) {
  const start = shiftKey((from || 0) + days - 1);
  const end = shiftKey(from || 0);
  const vals = bodyEntries(field).filter((e) => e.key >= start && e.key <= end).map((e) => e.value);
  if (!vals.length) return { avg: null, n: 0 };
  return { avg: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10, n: vals.length };
}

// Tendance : fenêtre courante contre la fenêtre précédente de même durée.
export function trendFor(field, days) {
  const cur = windowAverage(field, days, 0);
  const prev = windowAverage(field, days, days);
  const delta = (cur.avg !== null && prev.avg !== null) ? Math.round((cur.avg - prev.avg) * 10) / 10 : null;
  return { field: field, days: days, current: cur.avg, n: cur.n, previous: prev.avg, prevN: prev.n, delta: delta };
}

export function allTrends() {
  return BODY_FIELDS.map((f) => ({ field: f, windows: WINDOWS.map((w) => trendFor(f.key, w)) }));
}

// Une variation compte quand elle dépasse le bruit de la balance.
export const NOISE = { poids: 0.3, gras: 0.5, muscle: 0.5 };

export function trendLevel(field, delta) {
  if (delta === null || Math.abs(delta) < (NOISE[field] || 0.3)) return "flat";
  const better = BODY_MAP[field].better;
  if (better === "any") return delta > 0 ? "up" : "down";
  const good = better === "up" ? delta > 0 : delta < 0;
  return good ? "good" : "bad";
}

// Kilos de gras et de muscle : plus parlant qu'un pourcentage quand le poids
// bouge. Calculé sur les dernières valeurs connues, avec leurs dates.
export function composition() {
  const p = lastEntry("poids"), g = lastEntry("gras"), m = lastEntry("muscle");
  if (!p) return null;
  return {
    date: p.key, poids: p.value,
    gras: g ? { pct: g.value, kg: Math.round(p.value * g.value / 10) / 10, date: g.key } : null,
    muscle: m ? { pct: m.value, kg: Math.round(p.value * m.value / 10) / 10, date: m.key } : null
  };
}

export function daysSince(field) {
  const last = lastEntry(field);
  if (!last) return null;
  return Math.round((new Date(dayKey() + "T12:00:00") - new Date(last.key + "T12:00:00")) / 86400000);
}

// Pesée attendue : tous les jours par défaut, réglable dans les rappels.
export function weighInterval() {
  const r = state.settings.reminders || {};
  const n = Math.round(+r.peseeJours);
  return n >= 1 && n <= 30 ? n : 1;
}

export function weighDue() {
  const since = daysSince("poids");
  return since === null || since >= weighInterval();
}
