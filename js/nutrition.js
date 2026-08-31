// Moteur nutrition : cibles réglables, quantités libres, compléments calibrés.
//
// Les cibles de macros sont saisies par l'utilisateur (protéines, glucides,
// lipides) ; les calories en découlent — 4 kcal par gramme de protéines et
// de glucides, 9 pour les lipides — et s'affichent en fourchette, jamais en
// valeur exacte : viser 3 000 kcal au gramme près n'a aucun sens.
//
// Certains nutriments se jouent à la JOURNÉE, d'autres à la SEMAINE
// (vitamine D, B12, sélénium, oméga-3) : personne ne mange du maquereau
// tous les jours.

import { state, save, dayKey, weekDayKeys } from "./state.js";
import { CATALOGUE, FOOD_CATS, CAT_MAP, UNIT_LABEL } from "./foods.js";

export { FOOD_CATS, CAT_MAP, UNIT_LABEL };

export const DEFAULT_TARGETS = { prot: 190, glu: 335, lip: 100, tolerance: 0.08 };

// Micronutriments : cibles fixes, non éditables depuis l'app pour l'instant.
const MICROS = [
  // Fibres et sucres : composantes des glucides, mais suivies à part —
  // les fibres ont un plancher, les sucres un plafond.
  { key: "fibres", label: "Fibres",     unit: "g",  target: 30, period: "day" },
  { key: "sucres", label: "Sucres",     unit: "g",  target: 110, min: 0, ceil: 110, period: "day",
    warn: "Au-delà de 110 g, c'est le piège du jus de fruits quotidien." },

  { key: "k",   label: "Potassium",     unit: "mg", target: 4250, min: 4000, period: "day" },
  { key: "na",  label: "Sodium",        unit: "mg", target: 3250, min: 3000, ceil: 3500, period: "day",
    warn: "Au-delà de 3 500 mg, tu dépasses ta cible haute." },
  { key: "mg",  label: "Magnésium",     unit: "mg", target: 420, period: "day" },
  { key: "ca",  label: "Calcium",       unit: "mg", target: 950, period: "day" },
  { key: "fe",  label: "Fer",           unit: "mg", target: 11, period: "day" },
  { key: "zn",  label: "Zinc",          unit: "mg", target: 11, period: "day" },
  { key: "c",   label: "Vitamine C",    unit: "mg", target: 110, period: "day" },
  { key: "b9",  label: "Folates (B9)",  unit: "µg", target: 330, period: "day" },
  { key: "e",   label: "Vitamine E",    unit: "mg", target: 13, period: "day" },
  { key: "vk",  label: "Vitamine K",    unit: "µg", target: 100, period: "day" },
  { key: "vita", label: "Vitamine A",   unit: "µg", target: 900, period: "day" },
  { key: "b6",  label: "Vitamine B6",   unit: "mg", target: 1.7, period: "day" },
  { key: "iode", label: "Iode",         unit: "µg", target: 150, period: "day",
    note: "À surveiller vu le bilan thyroïdien à venir (TSH, T4, T3, anti-TPO)." },
  { key: "d",   label: "Vitamine D",    unit: "µg", target: 105, period: "week",
    note: "15 µg/j — quasi impossible par l'alimentation seule : c'est ce que le dosage 25-OH-D doit trancher." },
  { key: "b12", label: "Vitamine B12",  unit: "µg", target: 28, period: "week" },
  { key: "se",  label: "Sélénium",      unit: "µg", target: 490, ceil: 2800, period: "week",
    warn: "Plafond ≈ 400 µg/j — d'où la règle des 2 noix du Brésil." },
  { key: "om3", label: "Oméga-3 EPA+DHA", unit: "mg", target: 3500, period: "week",
    note: "Couvert par sardines ou maquereau 2×/semaine." }
];

// ------------------------------------------------------------- cibles

export function targets() {
  return Object.assign({}, DEFAULT_TARGETS, state.settings.targets || {});
}

export function setTarget(key, value) {
  if (!state.settings.targets) state.settings.targets = {};
  const n = parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return false;
  state.settings.targets[key] = key === "tolerance" ? n : Math.round(n);
  save();
  return true;
}

export function kcalTarget() {
  const t = targets();
  return t.prot * 4 + t.glu * 4 + t.lip * 9;
}

// La liste complète des nutriments, cibles utilisateur comprises.
export function nutrients() {
  const t = targets();
  const tol = t.tolerance;
  const kcal = kcalTarget();
  const band = (v) => ({ min: Math.round(v * (1 - tol)), max: Math.round(v * (1 + tol)) });

  const kb = band(kcal), pb = band(t.prot), gb = band(t.glu), lb = band(t.lip);

  return [
    // Les protéines n'ont pas de plafond : en dépasser n'est pas un échec,
    // et le débordement calorique est déjà attrapé par la fourchette kcal.
    { key: "kcal", label: "Calories", unit: "kcal", target: kcal, min: kb.min, ceil: kb.max, period: "day", main: true, derived: true },
    { key: "prot", label: "Protéines", unit: "g", target: t.prot, min: pb.min, period: "day", main: true },
    { key: "glu", label: "Glucides", unit: "g", target: t.glu, min: gb.min, ceil: gb.max, period: "day", main: true },
    { key: "lip", label: "Lipides", unit: "g", target: t.lip, min: lb.min, ceil: lb.max, period: "day", main: true }
  ].concat(MICROS);
}

export function nutrientMap() {
  return nutrients().reduce(function (a, n) { a[n.key] = n; return a; }, {});
}

export function fmtRange(n) {
  if (n.ceil && n.min) return n.min + " – " + n.ceil;
  if (n.min && n.min !== n.target) return "≥ " + n.min;
  return String(n.target);
}

// ------------------------------------------------------------ aliments

// Les compléments de micronutriments arrivés par import sont stockés à part :
// ils enrichissent aussi bien un aliment du catalogue qu'un aliment perso,
// sans dupliquer l'entrée dans la recherche.
function withOverride(f) {
  const ov = (state.foodOverrides || {})[f.id];
  return ov ? Object.assign({}, f, { n: Object.assign({}, f.n, ov) }) : f;
}

export function allFoods() {
  return CATALOGUE.concat(state.customFoods || []).map(withOverride);
}

export function foodById(id) {
  const base = CATALOGUE.find((f) => f.id === id) ||
    (state.customFoods || []).find((f) => f.id === id);
  return base ? withOverride(base) : null;
}

// Clés de micronutriments, dans l'ordre d'affichage.
export const MICRO_KEYS = MICROS.map((m) => m.key);

// Un aliment sans aucun micro renseigné crée un trou : ses vitamines et
// minéraux comptent pour zéro dans les totaux, sans que ça se voie.
export function microCompleteness(food) {
  const known = MICRO_KEYS.filter((k) => food.n[k] !== undefined && food.n[k] !== null).length;
  return { known: known, total: MICRO_KEYS.length, complete: known >= MICRO_KEYS.length };
}

export function foodsNeedingMicros() {
  return allFoods().filter(function (f) {
    if (f.id === "sel") return false;                 // le sel n'apporte que du sodium
    return microCompleteness(f).known === 0;
  });
}

// Applique les valeurs renvoyées par Claude. `ref` = id ou nom de l'aliment.
export function applyFoodValues(ref, values) {
  const key = String(ref || "").trim().toLowerCase();
  const target = allFoods().find(function (f) {
    return f.id.toLowerCase() === key || f.label.toLowerCase() === key;
  });
  if (!target) return null;
  if (!state.foodOverrides) state.foodOverrides = {};
  const cur = Object.assign({}, state.foodOverrides[target.id] || {});
  let applied = 0;
  for (const [k, v] of Object.entries(values || {})) {
    if (MICRO_KEYS.indexOf(k) < 0) continue;
    const num = parseFloat(String(v).replace(",", "."));
    if (!Number.isFinite(num) || num < 0) continue;
    cur[k] = num;
    applied++;
  }
  if (!applied) return null;
  state.foodOverrides[target.id] = cur;
  save();
  return { food: target, applied: applied };
}

// Texte à coller dans une conversation avec Claude.
export function buildCompletionRequest(foods) {
  const list = foods && foods.length ? foods : foodsNeedingMicros();
  if (!list.length) return null;
  const lignes = list.map(function (f) {
    const unit = f.unit === "u" ? "1 pièce" : f.base + " " + f.unit;
    return "- " + f.id + " · " + f.label + " · pour " + unit + " : " +
      (f.n.kcal || 0) + " kcal, " + (f.n.prot || 0) + " g P, " +
      (f.n.glu || 0) + " g G, " + (f.n.lip || 0) + " g L";
  });
  const cles = MICROS.map((m) => m.key + " (" + m.label + ", " + m.unit + ")").join(", ");

  return [
    "Complète les vitamines et minéraux de ces aliments.",
    "",
    "Donne les valeurs pour la quantité indiquée sur chaque ligne (pas pour 100 g si l'unité est différente).",
    "Réponds uniquement par un bloc de code balisé `suivi`, une ligne par aliment, au format :",
    "",
    "```suivi",
    "[aliment:<id>] " + MICRO_KEYS.map((k) => k + "=0").join(" "),
    "```",
    "",
    "Clés attendues : " + cles + ".",
    "Omets une clé si la valeur est négligeable.",
    "",
    "Aliments à compléter :",
    lignes.join("\n")
  ].join("\n");
}

export function addCustomFood(food) {
  if (!food || !food.label) return null;
  if (!state.customFoods) state.customFoods = [];
  const entry = {
    id: "cf_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
    label: String(food.label).slice(0, 80),
    cat: CAT_MAP[food.cat] ? food.cat : "divers",
    unit: ["g", "ml", "u", "portion"].indexOf(food.unit) >= 0 ? food.unit : "g",
    base: food.unit === "u" || food.unit === "portion" ? 1 : 100,
    step: food.unit === "u" || food.unit === "portion" ? 1 : (food.unit === "ml" ? 50 : 10),
    custom: true,
    n: {}
  };
  for (const [k, v] of Object.entries(food.n || {})) {
    const num = parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(num) && num !== 0) entry.n[k] = num;
  }
  state.customFoods.push(entry);
  save();
  return entry;
}

export function removeCustomFood(id) {
  if (!state.customFoods) return;
  state.customFoods = state.customFoods.filter((f) => f.id !== id);
  save();
}

export function searchFoods(query, cat) {
  const q = String(query || "").trim().toLowerCase();
  return allFoods().filter(function (f) {
    if (cat && cat !== "all" && f.cat !== cat) return false;
    if (!q) return true;
    return f.label.toLowerCase().includes(q);
  });
}

// --------------------------------------------------------- compléments

export const SEED_SUPPLEMENTS = [
  { id: "sup-magnesium", label: "Magnésium bisglycinate", unit: "gélule", n: { mg: 100 } },
  { id: "sup-creatine", label: "Créatine monohydrate", unit: "dose 5 g", n: {} },
  { id: "sup-omega3", label: "Oméga-3 EPA+DHA", unit: "capsule", n: { om3: 500 } },
  { id: "sup-vitd", label: "Vitamine D3", unit: "goutte", n: { d: 25 } },
  { id: "sup-zinc", label: "Zinc bisglycinate", unit: "gélule", n: { zn: 15 } }
];

export function supplements() {
  return state.supplements || [];
}

export function upsertSupplement(sup) {
  if (!state.supplements) state.supplements = [];
  const label = String(sup.label || "").trim();
  if (!label) return null;
  const clean = {};
  for (const [k, v] of Object.entries(sup.n || {})) {
    const num = parseFloat(String(v).replace(",", "."));
    if (Number.isFinite(num) && num !== 0) clean[k] = num;
  }
  const existing = sup.id ? state.supplements.find((s) => s.id === sup.id) : null;
  if (existing) {
    existing.label = label.slice(0, 80);
    existing.unit = String(sup.unit || "unité").slice(0, 20);
    existing.n = clean;
    save();
    return existing;
  }
  const entry = {
    id: "sup_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
    label: label.slice(0, 80),
    unit: String(sup.unit || "unité").slice(0, 20),
    n: clean
  };
  state.supplements.push(entry);
  save();
  return entry;
}

export function removeSupplement(id) {
  if (!state.supplements) return;
  state.supplements = state.supplements.filter((s) => s.id !== id);
  for (const log of Object.values(state.nutrition || {})) {
    if (log.supps) delete log.supps[id];
  }
  save();
}

// -------------------------------------------------------------- recettes

// Une recette est une liste d'ingrédients divisée en parts. On enregistre
// ensuite un nombre de parts dans la journée, pas la liste des ingrédients.
export function recipes() {
  return state.recipes || [];
}

export function recipeById(id) {
  return recipes().find((r) => r.id === id) || null;
}

export function upsertRecipe(rec) {
  if (!state.recipes) state.recipes = [];
  const label = String(rec.label || "").trim();
  if (!label) return null;
  const parts = Math.max(1, Math.round(parseFloat(String(rec.portions).replace(",", ".")) || 1));
  const items = {};
  for (const [id, qty] of Object.entries(rec.items || {})) {
    const q = Math.max(0, Math.round(parseFloat(String(qty).replace(",", ".")) || 0));
    if (q > 0 && foodById(id)) items[id] = q;
  }
  const existing = rec.id ? recipeById(rec.id) : null;
  if (existing) {
    existing.label = label.slice(0, 80);
    existing.portions = parts;
    existing.items = items;
    save();
    return existing;
  }
  const entry = {
    id: "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
    label: label.slice(0, 80),
    portions: parts,
    items: items
  };
  state.recipes.push(entry);
  save();
  return entry;
}

export function removeRecipe(id) {
  if (!state.recipes) return;
  state.recipes = state.recipes.filter((r) => r.id !== id);
  for (const log of Object.values(state.nutrition || {})) {
    if (log.recipes) delete log.recipes[id];
  }
  save();
}

// Apports d'UNE part.
export function recipePerPart(rec) {
  const out = {};
  if (!rec) return out;
  const parts = Math.max(1, rec.portions || 1);
  for (const [id, qty] of Object.entries(rec.items || {})) {
    const f = foodById(id);
    if (!f) continue;
    const factor = qty / f.base / parts;
    for (const nk in f.n) out[nk] = (out[nk] || 0) + f.n[nk] * factor;
  }
  return out;
}

export function setRecipeParts(recId, parts, key) {
  const k = key || dayKey();
  const log = ensureLog(k);
  const n = Math.max(0, parseFloat(String(parts).replace(",", ".")) || 0);
  if (n <= 0) delete log.recipes[recId];
  else log.recipes[recId] = n;
  pruneLog(k);
  save();
}

export function addRecipeParts(recId, delta, key) {
  const k = key || dayKey();
  const cur = (logFor(k).recipes || {})[recId] || 0;
  setRecipeParts(recId, cur + delta, k);
}

// ------------------------------------------------------------- journal

function emptyLog() { return { items: {}, supps: {}, recipes: {}, libre: [] }; }

export function logFor(key) {
  return state.nutrition[key || dayKey()] || emptyLog();
}

function ensureLog(k) {
  if (!state.nutrition[k]) state.nutrition[k] = emptyLog();
  const log = state.nutrition[k];
  if (!log.items) log.items = {};
  if (!log.supps) log.supps = {};
  if (!log.recipes) log.recipes = {};
  if (!log.libre) log.libre = [];
  return log;
}

function pruneLog(k) {
  const log = state.nutrition[k];
  if (!log) return;
  if (!Object.keys(log.items || {}).length &&
      !Object.keys(log.supps || {}).length &&
      !Object.keys(log.recipes || {}).length &&
      !(log.libre || []).length) {
    delete state.nutrition[k];
  }
}

// Quantité absolue, dans l'unité de l'aliment (g, ml, pièce).
export function setQuantity(foodId, qty, key) {
  const k = key || dayKey();
  if (!foodById(foodId)) return;
  const log = ensureLog(k);
  const q = Math.max(0, Math.round(parseFloat(String(qty).replace(",", ".")) || 0));
  if (q <= 0) delete log.items[foodId];
  else log.items[foodId] = q;
  pruneLog(k);
  save();
}

export function addQuantity(foodId, delta, key) {
  const k = key || dayKey();
  const current = (logFor(k).items || {})[foodId] || 0;
  setQuantity(foodId, current + delta, k);
}

export function setSupplement(suppId, units, key) {
  const k = key || dayKey();
  const log = ensureLog(k);
  const n = Math.max(0, parseFloat(String(units).replace(",", ".")) || 0);
  if (n <= 0) delete log.supps[suppId];
  else log.supps[suppId] = n;
  pruneLog(k);
  save();
}

export function addSupplementUnits(suppId, delta, key) {
  const k = key || dayKey();
  const current = (logFor(k).supps || {})[suppId] || 0;
  setSupplement(suppId, current + delta, k);
}

function num(v) {
  const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function addLibre(label, kcal, prot, glu, lip, key) {
  label = String(label || "").trim();
  const k1 = num(kcal);
  if (!label && !k1) return false;
  const k = key || dayKey();
  ensureLog(k).libre.push({
    label: label || "Ajout libre",
    kcal: k1, prot: num(prot), glu: num(glu), lip: num(lip)
  });
  save();
  return true;
}

export function removeLibre(index, key) {
  const k = key || dayKey();
  const log = state.nutrition[k];
  if (!log || !log.libre || index < 0 || index >= log.libre.length) return;
  log.libre.splice(index, 1);
  pruneLog(k);
  save();
}

// --------------------------------------------------------------- totaux

export function totalsFor(keys) {
  const t = {};
  for (const n of nutrients()) t[n.key] = 0;

  for (const k of keys) {
    const log = state.nutrition[k];
    if (!log) continue;

    for (const [id, qty] of Object.entries(log.items || {})) {
      const f = foodById(id);
      if (!f) continue;
      const factor = qty / f.base;      // valeurs données pour `base` unités
      for (const nk in f.n) if (t[nk] !== undefined) t[nk] += f.n[nk] * factor;
    }

    // Un complément dosé à 400 mg pris 2 fois apporte 800 mg.
    for (const [id, units] of Object.entries(log.supps || {})) {
      const s = supplements().find((x) => x.id === id);
      if (!s) continue;
      for (const nk in s.n) if (t[nk] !== undefined) t[nk] += s.n[nk] * units;
    }

    for (const [id, parts] of Object.entries(log.recipes || {})) {
      const per = recipePerPart(recipeById(id));
      for (const nk in per) if (t[nk] !== undefined) t[nk] += per[nk] * parts;
    }

    for (const l of log.libre || []) {
      t.kcal += l.kcal || 0;
      t.prot += l.prot || 0;
      t.glu += l.glu || 0;
      t.lip += l.lip || 0;
    }
  }
  return t;
}

export function dayTotals(key) { return totalsFor([key || dayKey()]); }
export function weekTotals() { return totalsFor(weekDayKeys()); }

// Ce qu'un aliment apporterait pour une quantité donnée — sert à l'aperçu.
export function preview(food, qty) {
  const out = {};
  const factor = (parseFloat(String(qty).replace(",", ".")) || 0) / food.base;
  for (const nk in food.n) out[nk] = food.n[nk] * factor;
  return out;
}

// ------------------------------------------- que manger pour combler ?

// Portion réaliste servant de référence dans les suggestions. Sans `serv`
// explicite, 100 g / 200 ml ; sinon on proposerait 200 ml d'huile, soit
// 1 800 kcal, pour combler une vitamine E.
function servingOf(f) {
  if (f.serv) return f.serv;
  if (f.unit === "u" || f.unit === "portion") return 1;
  return f.unit === "ml" ? 200 : 100;
}

export function servingLabel(f) {
  const s = servingOf(f);
  if (f.unit === "u") return s + " pièce" + (s > 1 ? "s" : "");
  if (f.unit === "portion") return s + " portion";
  return s + " " + f.unit;
}

/**
 * Meilleures sources pour un nutriment, aliments et recettes confondus.
 * `gap` = ce qu'il reste à combler, pour dire combien il en faut.
 */
export function bestSourcesFor(key, gap) {
  const out = [];

  for (const f of allFoods()) {
    const per = f.n[key];
    if (!per) continue;
    const serv = servingOf(f);
    const amount = per * (serv / f.base);
    if (amount <= 0) continue;
    out.push({
      kind: "food", id: f.id, label: f.label, cat: f.cat,
      serving: servingLabel(f), amount: amount, unit: f.unit,
      kcal: (f.n.kcal || 0) * (serv / f.base),
      // Quantité nécessaire pour combler le manque, dans l'unité de l'aliment.
      needed: gap > 0 ? Math.ceil(gap / (per / f.base)) : 0
    });
  }

  for (const r of recipes()) {
    const per = recipePerPart(r);
    if (!per[key]) continue;
    out.push({
      kind: "recipe", id: r.id, label: r.label, cat: "recette",
      serving: "1 part", amount: per[key], unit: "part",
      kcal: per.kcal || 0,
      needed: gap > 0 ? Math.ceil(gap / per[key]) : 0
    });
  }

  return out.sort((a, b) => b.amount - a.amount);
}

// Écarts aux cibles, quotidiennes ET hebdomadaires. La période compte :
// rater la vitamine D un mardi ne veut rien dire, la rater sur la semaine si.
export function gapsFor(period, key) {
  const totals = period === "week"
    ? totalsFor(weekDayKeys())
    : totalsFor([key || dayKey()]);

  return nutrients()
    .filter((n) => n.period === period && !n.main && !isMet(n, totals[n.key]))
    .map(function (n) {
      const min = n.min !== undefined ? n.min : n.target;
      const over = !!(n.ceil && totals[n.key] > n.ceil);
      return {
        n: n,
        period: period,
        value: totals[n.key],
        gap: over ? 0 : Math.max(0, min - totals[n.key]),
        excess: over ? totals[n.key] - n.ceil : 0,
        share: min > 0 ? totals[n.key] / min : 1,
        over: over
      };
    })
    .sort((a, b) => a.share - b.share);
}

export function gapsToday(key) { return gapsFor("day", key); }
export function gapsThisWeek() { return gapsFor("week"); }

// Les manques les plus criants, périodes confondues.
export function topGaps(limit) {
  return gapsToday().concat(gapsThisWeek())
    .filter((g) => g.gap > 0 || g.over)
    .sort(function (a, b) {
      if (a.over !== b.over) return a.over ? 1 : -1;   // les manques d'abord
      return a.share - b.share;
    })
    .slice(0, limit || 4);
}

// ------------------------------------------------- cibles atteintes

// Un jour sans rien de saisi n'est pas un échec : c'est un jour non
// renseigné. Sinon oublier de logger ressemblerait à ne pas manger.
export function loggedDayKeys(keys) {
  return keys.filter(function (k) {
    const log = state.nutrition[k];
    return !!log && (Object.keys(log.items || {}).length > 0 ||
      Object.keys(log.supps || {}).length > 0 ||
      Object.keys(log.recipes || {}).length > 0 || (log.libre || []).length > 0);
  });
}

export function isMet(n, value) {
  const min = n.min !== undefined ? n.min : n.target;
  if (value < min) return false;
  if (n.ceil && value > n.ceil) return false;
  return true;
}

export function dailyTargetStats(keys) {
  const logged = loggedDayKeys(keys);
  return nutrients().filter((n) => n.period === "day").map(function (n) {
    const hit = logged.filter((k) => isMet(n, totalsFor([k])[n.key])).length;
    return { n: n, hit: hit, days: logged.length, rate: logged.length ? hit / logged.length : null };
  });
}

export function weeklyTargetStats(keys) {
  const totals = totalsFor(keys);
  return nutrients().filter((n) => n.period === "week").map(function (n) {
    return { n: n, value: totals[n.key], met: isMet(n, totals[n.key]) };
  });
}

export function dietRate(keys) {
  const stats = dailyTargetStats(keys).filter((s) => s.rate !== null);
  if (!stats.length) return null;
  return stats.reduce((a, s) => a + s.rate, 0) / stats.length;
}

// ------------------------------------------------------------ migration

// L'ancien modèle comptait des « portions » figées. On convertit en
// quantités réelles ; les préparations composées deviennent des aliments
// personnalisés pour ne rien perdre.
const LEGACY_PORTIONS = {
  oeuf: ["oeuf", 1], avoine: ["avoine", 80], banane: ["banane", 118],
  "puree-amande": ["puree-amande", 20], lait: ["lait-entier", 250],
  amandes: ["amandes", 30], bresil: ["noix-bresil", 5], avocat: ["avocat", 140],
  poulet: ["poulet-blanc", 150], boeuf: ["boeuf-15", 150], sardines: ["sardines", 90],
  maquereau: ["maquereau", 150], "poisson-blanc": ["cabillaud", 150],
  riz: ["riz-blanc", 200], pates: ["pates", 200], patates: ["pomme-de-terre", 300],
  grenade: ["jus-grenade", 250], huile: ["huile-olive", 13.5]
};

const LEGACY_COMPOSITES = {
  fruit: { label: "Fruit (portion)", cat: "fruits", n: { kcal: 80, prot: 0.5, glu: 20, lip: 0.3, k: 200, c: 30, b9: 15 } },
  julienne: { label: "Julienne courgette-carotte (200 g)", cat: "legumes", n: { kcal: 60, prot: 2.4, glu: 11, lip: 0.5, k: 480, mg: 24, ca: 40, fe: 0.8, c: 15, b9: 40 } },
  "plat-pause": { label: "Pause : salade de riz / wrap / boulettes", cat: "divers", n: { kcal: 600, prot: 30, glu: 70, lip: 22, k: 450, na: 800, mg: 50, fe: 2.5, zn: 2.5, b9: 40 } },
  "boisson-jour": { label: "Boisson de journée (1 L complet)", cat: "boissons", n: { kcal: 107, prot: 1, glu: 25, lip: 0.3, k: 1300, na: 1900, mg: 60, ca: 120, c: 31 } },
  betterave: { label: "Jus betterave-carotte (pré-salle)", cat: "boissons", n: { kcal: 180, prot: 4, glu: 40, lip: 0.5, k: 900, na: 200, c: 15, b9: 250 } }
};

export function migrateNutritionLogs() {
  let touched = 0;
  const madeCustom = {};

  for (const [dk, log] of Object.entries(state.nutrition || {})) {
    if (!log || !log.foods) continue;          // déjà au nouveau format
    const items = log.items || {};

    for (const [oldId, portions] of Object.entries(log.foods)) {
      if (!portions) continue;
      const map = LEGACY_PORTIONS[oldId];
      if (map) {
        items[map[0]] = (items[map[0]] || 0) + Math.round(portions * map[1]);
        touched++;
        continue;
      }
      const comp = LEGACY_COMPOSITES[oldId];
      if (comp) {
        if (!madeCustom[oldId]) {
          const created = addCustomFood({ label: comp.label, cat: comp.cat, unit: "portion", n: comp.n });
          madeCustom[oldId] = created ? created.id : null;
        }
        if (madeCustom[oldId]) {
          items[madeCustom[oldId]] = (items[madeCustom[oldId]] || 0) + portions;
          touched++;
        }
      }
    }

    delete log.foods;
    log.items = items;
    if (!log.supps) log.supps = {};
    if (!log.libre) log.libre = [];
  }

  return touched;
}
