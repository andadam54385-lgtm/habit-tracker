// Calculateur nutrition — calories, minéraux et vitamines.
//
// Certaines cibles se jouent à la JOURNÉE (potassium, sodium, vitamine C…),
// d'autres à la SEMAINE (vitamine D, B12, sélénium, oméga-3) : personne ne
// mange du maquereau tous les jours, et c'est très bien comme ça.
//
// Les valeurs par portion sont des moyennes arrondies (CIQUAL / USDA) :
// l'outil suit des tendances, il ne pèse pas au milligramme.

import { state, save, dayKey, weekDayKeys } from "./state.js";
import { esc } from "./ui.js";

// ------------------------------------------------------------- nutriments

export const NUTRIENTS = [
  { key: "kcal", label: "Calories", unit: "kcal", target: 3000, period: "day", main: true },
  { key: "prot", label: "Protéines", unit: "g", target: 190, period: "day", main: true },

  { key: "k",   label: "Potassium",     unit: "mg", target: 4250, min: 4000, range: "4 000 – 4 500", period: "day" },
  { key: "na",  label: "Sodium",        unit: "mg", target: 3250, min: 3000, range: "3 000 – 3 500", period: "day",
    ceil: 3500, warn: "Au-delà de 3 500 mg, tu dépasses ta cible haute." },
  { key: "mg",  label: "Magnésium",     unit: "mg", target: 420, period: "day" },
  { key: "ca",  label: "Calcium",       unit: "mg", target: 950, period: "day" },
  { key: "fe",  label: "Fer",           unit: "mg", target: 11, period: "day" },
  { key: "zn",  label: "Zinc",          unit: "mg", target: 11, period: "day" },
  { key: "c",   label: "Vitamine C",    unit: "mg", target: 110, period: "day" },
  { key: "b9",  label: "Folates (B9)",  unit: "µg", target: 330, period: "day" },

  { key: "d",   label: "Vitamine D",    unit: "µg", target: 105, period: "week",
    note: "15 µg/j — quasi impossible par l'alimentation seule : c'est justement ce que le dosage 25-OH-D doit trancher." },
  { key: "b12", label: "Vitamine B12",  unit: "µg", target: 28, period: "week" },
  { key: "se",  label: "Sélénium",      unit: "µg", target: 490, period: "week",
    ceil: 2800, warn: "Plafond ≈ 400 µg/j — d'où la règle des 2 noix du Brésil, jamais plus." },
  { key: "om3", label: "Oméga-3 EPA+DHA", unit: "mg", target: 3500, period: "week",
    note: "Couvert par sardines/maquereau 2×/semaine." }
];

export const NUTRIENT_MAP = NUTRIENTS.reduce(function (a, n) { a[n.key] = n; return a; }, {});

// ------------------------------------------------------------- aliments

// n = apports par portion. Seules les valeurs non négligeables sont notées.
export const FOOD_GROUPS = [
  {
    label: "Base quotidienne",
    foods: [
      { id: "oeuf", label: "Œuf (1)", n: { kcal: 78, prot: 6.5, k: 70, na: 70, mg: 6, ca: 28, fe: 0.9, zn: 0.6, b9: 24, d: 1.1, b12: 0.5, se: 15, om3: 40 } },
      { id: "avoine", label: "Avoine (80 g)", n: { kcal: 300, prot: 11, k: 344, na: 3, mg: 140, ca: 43, fe: 3.4, zn: 3, b9: 26, se: 23 } },
      { id: "banane", label: "Banane (1)", n: { kcal: 105, prot: 1.3, k: 430, mg: 32, ca: 6, fe: 0.3, zn: 0.2, c: 10, b9: 24 } },
      { id: "puree-amande", label: "Purée d'amande (20 g)", n: { kcal: 128, prot: 4.2, k: 150, mg: 54, ca: 52, fe: 0.7, zn: 0.6, b9: 10 } },
      { id: "lait", label: "Lait entier (250 ml)", n: { kcal: 163, prot: 8, k: 390, na: 108, mg: 28, ca: 300, zn: 0.9, b9: 12, d: 0.3, b12: 1.1, se: 2.5 } },
      { id: "amandes", label: "Amandes (30 g)", n: { kcal: 174, prot: 6.3, k: 220, mg: 81, ca: 80, fe: 1.1, zn: 0.9, b9: 13, se: 1 } },
      { id: "bresil", label: "Noix du Brésil (1 noix)", warnQty: 2, warnText: "2 par jour, jamais plus (sélénium).",
        n: { kcal: 33, prot: 0.7, k: 33, mg: 19, ca: 8, fe: 0.1, zn: 0.2, se: 95 } },
      { id: "avocat", label: "Avocat (1)", n: { kcal: 224, prot: 2.8, k: 680, mg: 40, fe: 0.8, zn: 0.9, c: 14, b9: 113 } },
      { id: "fruit", label: "Fruit (1)", n: { kcal: 80, prot: 0.5, k: 200, c: 30, b9: 15 } }
    ]
  },
  {
    label: "Plats & protéines",
    foods: [
      { id: "poulet", label: "Poulet (150 g)", n: { kcal: 248, prot: 46, k: 380, na: 110, mg: 40, fe: 1.1, zn: 1.5, b9: 6, b12: 0.5, se: 33 } },
      { id: "boeuf", label: "Bœuf 5-15 % (150 g)", n: { kcal: 260, prot: 39, k: 500, na: 90, mg: 30, fe: 3.9, zn: 8, b12: 3.8, se: 30 } },
      { id: "sardines", label: "Sardines (boîte 90 g)", n: { kcal: 187, prot: 22, k: 350, na: 400, mg: 35, ca: 350, fe: 2.5, zn: 1.2, d: 6, b12: 8, se: 47, om3: 1500 } },
      { id: "maquereau", label: "Maquereau (150 g)", n: { kcal: 305, prot: 28, k: 470, na: 130, mg: 45, fe: 1.9, zn: 1, d: 12, b12: 12, se: 60, om3: 2500 } },
      { id: "poisson-blanc", label: "Poisson blanc (150 g)", n: { kcal: 150, prot: 32, k: 500, na: 120, mg: 40, fe: 0.4, zn: 0.7, d: 2, b12: 2, se: 50, om3: 300 } },
      { id: "riz", label: "Riz cuit (200 g)", n: { kcal: 260, prot: 5, k: 70, mg: 24, fe: 0.4, zn: 1.2, b9: 8 } },
      { id: "pates", label: "Pâtes cuites (200 g)", n: { kcal: 290, prot: 10, k: 88, mg: 36, fe: 1, zn: 1.4, b9: 14 } },
      { id: "patates", label: "Pommes de terre (300 g)", n: { kcal: 260, prot: 6, k: 1260, na: 18, mg: 69, ca: 30, fe: 2.4, zn: 0.9, c: 29, b9: 54 } },
      { id: "julienne", label: "Julienne courgette-carotte (200 g)", n: { kcal: 60, prot: 2.4, k: 480, mg: 24, ca: 40, fe: 0.8, c: 15, b9: 40 } },
      { id: "plat-pause", label: "Pause : salade de riz / wrap / boulettes", n: { kcal: 600, prot: 30, k: 450, na: 800, mg: 50, fe: 2.5, zn: 2.5, b9: 40 } },
      { id: "huile", label: "Huile d'olive (1 c. à s.)", n: { kcal: 120 } }
    ]
  },
  {
    label: "Boissons",
    foods: [
      { id: "boisson-jour", label: "Boisson de journée (1 L complet)", n: { kcal: 107, prot: 1, k: 1300, na: 1900, mg: 60, ca: 120, c: 31 } },
      { id: "betterave", label: "Jus betterave-carotte (pré-salle)", n: { kcal: 180, prot: 4, k: 900, na: 200, c: 15, b9: 250 } },
      { id: "grenade", label: "Jus de grenade (250 ml)", n: { kcal: 135, prot: 0.4, k: 530, na: 10 } }
    ]
  }
];

export const FOOD_MAP = (function () {
  const map = {};
  for (const g of FOOD_GROUPS) for (const f of g.foods) map[f.id] = f;
  return map;
})();

// ------------------------------------------------------------- journal

function emptyLog() { return { foods: {}, libre: [] }; }

export function logFor(key) {
  return state.nutrition[key || dayKey()] || emptyLog();
}

export function bumpFood(id, delta) {
  if (!FOOD_MAP[id]) return;
  const k = dayKey();
  if (!state.nutrition[k]) state.nutrition[k] = emptyLog();
  const log = state.nutrition[k];
  if (!log.foods) log.foods = {};
  const q = (log.foods[id] || 0) + delta;
  if (q <= 0) delete log.foods[id];
  else log.foods[id] = q;
  if (!Object.keys(log.foods).length && !(log.libre && log.libre.length)) {
    delete state.nutrition[k];
  }
  save();
}

export function addLibre(label, kcal, prot) {
  label = String(label || "").trim();
  kcal = parseFloat(String(kcal).replace(",", "."));
  prot = parseFloat(String(prot).replace(",", "."));
  if (!label && !kcal) return false;
  const k = dayKey();
  if (!state.nutrition[k]) state.nutrition[k] = emptyLog();
  if (!state.nutrition[k].libre) state.nutrition[k].libre = [];
  state.nutrition[k].libre.push({
    label: label || "Ajout libre",
    kcal: Number.isFinite(kcal) ? kcal : 0,
    prot: Number.isFinite(prot) ? prot : 0
  });
  save();
  return true;
}

export function removeLibre(index) {
  const k = dayKey();
  const log = state.nutrition[k];
  if (!log || !log.libre || index < 0 || index >= log.libre.length) return;
  log.libre.splice(index, 1);
  if (!Object.keys(log.foods || {}).length && !log.libre.length) delete state.nutrition[k];
  save();
}

// --------------------------------------------------------------- totaux

export function totalsFor(keys) {
  const t = {};
  for (const n of NUTRIENTS) t[n.key] = 0;
  for (const k of keys) {
    const log = state.nutrition[k];
    if (!log) continue;
    for (const [id, qty] of Object.entries(log.foods || {})) {
      const f = FOOD_MAP[id];
      if (!f) continue;
      for (const nk in f.n) t[nk] += f.n[nk] * qty;
    }
    for (const l of log.libre || []) {
      t.kcal += l.kcal || 0;
      t.prot += l.prot || 0;
    }
  }
  return t;
}

export function dayTotals() { return totalsFor([dayKey()]); }
export function weekTotals() { return totalsFor(weekDayKeys()); }

// ------------------------------------------------- cibles atteintes

// Un jour sans rien de saisi n'est pas un échec : c'est un jour non
// renseigné. Le score ne porte que sur les jours effectivement remplis,
// sinon oublier de logger ressemblerait à ne pas manger.
export function loggedDayKeys(keys) {
  return keys.filter(function (k) {
    const log = state.nutrition[k];
    return !!log && (Object.keys(log.foods || {}).length > 0 || (log.libre || []).length > 0);
  });
}

export function isMet(n, value) {
  const min = n.min !== undefined ? n.min : n.target;
  if (value < min) return false;
  if (n.ceil && value > n.ceil) return false;   // le sodium se rate aussi par le haut
  return true;
}

// Par cible quotidienne : combien de jours renseignés l'ont atteinte.
export function dailyTargetStats(keys) {
  const logged = loggedDayKeys(keys);
  return NUTRIENTS.filter((n) => n.period === "day").map(function (n) {
    const hit = logged.filter((k) => isMet(n, totalsFor([k])[n.key])).length;
    return { n: n, hit: hit, days: logged.length, rate: logged.length ? hit / logged.length : null };
  });
}

// Cibles hebdomadaires : c'est le cumul de la semaine qui compte.
export function weeklyTargetStats(keys) {
  const totals = totalsFor(keys);
  return NUTRIENTS.filter((n) => n.period === "week").map(function (n) {
    return { n: n, value: totals[n.key], met: isMet(n, totals[n.key]) };
  });
}

// Taux de réussite diète : moyenne des cibles quotidiennes tenues.
export function dietRate(keys) {
  const stats = dailyTargetStats(keys).filter((s) => s.rate !== null);
  if (!stats.length) return null;
  return stats.reduce((a, s) => a + s.rate, 0) / stats.length;
}

// ---------------------------------------------------------------- format

function fmtN(v) {
  const r = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return r.toLocaleString("fr-FR");
}

// ------------------------------------------------------------------ vue

function bar(n, value) {
  const pct = Math.min(100, (value / n.target) * 100);
  const over = n.ceil && value > n.ceil;
  const full = !over && value >= n.target;
  const cls = over ? " is-over" : (full ? " is-full" : "");
  const targetLabel = n.range ? n.range : fmtN(n.target);
  return '' +
    '<div class="nut' + cls + '">' +
      '<div class="nut-head">' +
        '<span class="nut-label">' + esc(n.label) + "</span>" +
        '<span class="nut-val">' + fmtN(value) + ' <span class="nut-target">/ ' +
          targetLabel + " " + esc(n.unit) + "</span></span>" +
      "</div>" +
      '<div class="bar"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      (over && n.warn ? '<p class="nut-warn">⚠️ ' + esc(n.warn) + "</p>" : "") +
      (n.note && !over ? '<p class="nut-note">' + esc(n.note) + "</p>" : "") +
    "</div>";
}

function heroTile(n, value) {
  const pct = Math.min(100, (value / n.target) * 100);
  return '<div class="nut-tile' + (value >= n.target ? " is-full" : "") + '">' +
    '<span class="nut-tile-label">' + esc(n.label) + "</span>" +
    '<span class="nut-tile-val">' + fmtN(value) + "</span>" +
    '<span class="nut-tile-target">/ ' + fmtN(n.target) + " " + esc(n.unit) + "</span>" +
    '<div class="bar"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
    "</div>";
}

export function viewNutrition() {
  const day = dayTotals();
  const week = weekTotals();
  const log = logFor();
  const today = new Date();

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>🧮 Nutrition</h1><p class="sub">' +
    esc(today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })) +
    "</p></header>";

  // Calories + protéines en grand.
  html += '<div class="nut-tiles">' +
    heroTile(NUTRIENT_MAP.kcal, day.kcal) +
    heroTile(NUTRIENT_MAP.prot, day.prot) +
    "</div>";

  // Journal du jour.
  html += '<div class="block-head"><h2>Aliments du jour</h2></div>';
  for (const group of FOOD_GROUPS) {
    html += '<h3 class="group-title">' + esc(group.label) + "</h3>";
    html += '<ul class="nut-foods">';
    for (const f of group.foods) {
      const qty = (log.foods || {})[f.id] || 0;
      const overQty = f.warnQty && qty > f.warnQty;
      html += '<li class="nut-food' + (qty ? " has-qty" : "") + '">' +
        '<div class="nut-food-main">' +
          '<span class="nut-food-label">' + esc(f.label) + "</span>" +
          '<span class="nut-food-detail">' + fmtN(f.n.kcal || 0) + " kcal · " +
            fmtN(f.n.prot || 0) + " g prot</span>" +
          (overQty ? '<span class="nut-warn">⚠️ ' + esc(f.warnText) + "</span>" : "") +
        "</div>" +
        '<div class="stepper">' +
          '<button type="button" data-act="nut-minus" data-food="' + f.id + '" aria-label="Retirer ' +
            esc(f.label) + '"' + (qty ? "" : " disabled") + ">−</button>" +
          '<span class="stepper-qty">' + qty + "</span>" +
          '<button type="button" data-act="nut-plus" data-food="' + f.id + '" aria-label="Ajouter ' +
            esc(f.label) + '">+</button>' +
        "</div>" +
      "</li>";
    }
    html += "</ul>";
  }

  // Ajouts libres.
  html += '<h3 class="group-title">Ajout libre</h3>';
  if (log.libre && log.libre.length) {
    html += '<ul class="nut-foods">';
    log.libre.forEach(function (l, idx) {
      html += '<li class="nut-food has-qty">' +
        '<div class="nut-food-main">' +
          '<span class="nut-food-label">' + esc(l.label) + "</span>" +
          '<span class="nut-food-detail">' + fmtN(l.kcal) + " kcal · " + fmtN(l.prot) + " g prot</span>" +
        "</div>" +
        '<button type="button" class="nut-del" data-act="nut-del" data-idx="' + idx +
          '" aria-label="Supprimer ' + esc(l.label) + '">✕</button>' +
      "</li>";
    });
    html += "</ul>";
  }
  html += '<form class="nut-libre" id="nut-libre-form">' +
    '<input type="text" id="nut-libre-label" placeholder="Aliment hors liste" maxlength="60">' +
    '<input type="number" id="nut-libre-kcal" inputmode="numeric" min="0" max="3000" placeholder="kcal">' +
    '<input type="number" id="nut-libre-prot" inputmode="decimal" min="0" max="200" step="0.5" placeholder="g prot">' +
    '<button type="submit" class="btn btn-primary">+</button>' +
  "</form>";

  // Minéraux & vitamines du jour.
  html += '<div class="block-head"><h2>Jour — minéraux & vitamines</h2></div>';
  html += '<div class="nuts">';
  for (const n of NUTRIENTS) {
    if (n.main || n.period !== "day") continue;
    html += bar(n, day[n.key]);
  }
  html += "</div>";

  // Cibles hebdomadaires.
  html += '<div class="block-head"><h2>Semaine — cibles hebdomadaires</h2></div>' +
    '<p class="hint">Ces nutriments se jouent à la semaine, pas à la journée — ' +
    "un repas de poisson couvre plusieurs jours d'un coup.</p>";
  html += '<div class="nuts">';
  for (const n of NUTRIENTS) {
    if (n.period !== "week") continue;
    html += bar(n, week[n.key]);
  }
  html += "</div>";

  const logged = loggedDayKeys(weekDayKeys()).length;
  const dr = dietRate(weekDayKeys());
  html += '<a class="callout" href="#/objectifs">' +
    "<strong>" + (dr === null
      ? "Aucune journée saisie cette semaine"
      : Math.round(dr * 100) + " % de cibles tenues sur " + logged + " jour" + (logged > 1 ? "s" : "")) +
    "</strong><span>Voir la réussite →</span></a>";

  html += '<p class="hint nut-disclaimer">Valeurs moyennes arrondies (bases CIQUAL / USDA). ' +
    "L'outil suit des tendances sur la semaine — il ne remplace ni une pesée ni un avis médical.</p>";

  html += "</div>";
  return html;
}

export function mountNutrition() {
  const form = document.getElementById("nut-libre-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const label = document.getElementById("nut-libre-label").value;
    const kcal = document.getElementById("nut-libre-kcal").value;
    const prot = document.getElementById("nut-libre-prot").value;
    if (addLibre(label, kcal, prot) === false) {
      document.getElementById("nut-libre-label").focus();
    }
  });
}
