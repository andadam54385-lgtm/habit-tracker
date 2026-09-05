// Entrées / sorties : validation d'un import, export Markdown (pour Obsidian),
// sauvegarde et restauration JSON.

import { state, save, addItem, setDaily, dayKey, isDone, isRecurring, weekProgress, rootBlocker, makeId } from "./state.js";
import { SECTIONS, SECTION_MAP, SEED_PATCHES } from "./seed.js";
import { GROUP_MAP, EXERCISE_MAP } from "./exercises.js";
import { totalsFor, applyFoodValues, CAT_MAP } from "./nutrition.js";
import {
  trackedItems, weekDates, monthDates, weekStartAt,
  computeRate, computeTotalRate, formatPercent, frequencyOf
} from "./objectives.js";

// ------------------------------------------------------------- import

// Écrit les entrées validées. Jamais appelé sans aperçu préalable (spec §4 bis).
export function commitImport(entries, sourceLabel) {
  const source = sourceLabel || "import";
  let added = 0, metrics = 0, skipped = 0, foods = 0;

  for (const e of entries) {
    if (e.duplicate) { skipped++; continue; }

    if (e.type === "food") {
      const res = applyFoodValues(e.ref, e.values);
      if (res) foods++;
      else {
        // Aliment introuvable : on garde la ligne plutôt que de la jeter.
        addItem({ section: "inbox", title: "Valeurs non appliquées : " + e.ref, detail: e.raw, source: source });
        added++;
      }
    } else if (e.type === "metric") {
      const key = e.date || dayKey();
      for (const [field, value] of Object.entries(e.values)) setDaily(key, field, value);
      metrics++;
    } else {
      let detail = e.detail || "";
      if (e.unknownTag && e.originalTag) {
        detail = (detail ? detail + "\n" : "") + "Tag d'origine non reconnu : [" + e.originalTag + "]";
      }
      addItem({
        section: e.section,
        sub: e.sub,
        title: e.title,
        detail: detail,
        kind: e.kind || "task",
        source: source
      });
      added++;
    }
    state.importedHashes[e.hash] = Date.now();
  }

  save();
  return { added: added, metrics: metrics, skipped: skipped, foods: foods };
}

// ---------------------------------------------------- export Markdown

function statusLabel(item) {
  if (isDone(item)) return "x";
  return " ";
}

function itemLine(item) {
  const bits = [];
  if (isRecurring(item)) {
    const p = weekProgress(item);
    bits.push(p.done + "/" + p.target + " cette semaine");
  }
  const blocker = rootBlocker(item);
  if (blocker) bits.push("bloqué par : " + blocker.title);
  if (item.status === "rejected") bits.push("écarté");
  if (item.status === "queue") bits.push("file d'attente");
  if (item.status === "optional") bits.push("optionnel");
  if (item.priority === "critical") bits.push("prioritaire");
  if (item.source && item.source !== "seed" && item.source !== "manual") {
    bits.push("importé depuis Claude");
  }

  let line = "- [" + statusLabel(item) + "] " + item.title;
  if (bits.length) line += "  _(" + bits.join(" · ") + ")_";
  if (item.detail) {
    line += "\n" + item.detail.split("\n").map((l) => "      " + l).join("\n");
  }
  if (item.warn) line += "\n      > " + item.warn;
  return line;
}

export function exportMarkdown() {
  const now = new Date();
  const out = [];
  out.push("# Suivi personnel");
  out.push("");
  out.push("_Export du " + now.toLocaleString("fr-FR") + "_");
  out.push("");

  out.push(...exportObjectivesSection());
  out.push(...exportWorkoutsSection());

  for (const section of SECTIONS) {
    const items = state.items.filter((i) => i.section === section.key);
    const note = state.notes[section.key];
    if (!items.length && !note && section.key !== "suivi") continue;

    out.push("## " + section.label);
    out.push("");

    if (section.key === "suivi") {
      out.push(exportDailyTable());
      out.push("");
      const nutTable = exportNutritionTable();
      if (nutTable) { out.push("**Nutrition**"); out.push(""); out.push(nutTable); out.push(""); }
      if (note) { out.push(note); out.push(""); }
      continue;
    }

    if (section.subs.length) {
      for (const sub of section.subs) {
        const subItems = items.filter((i) => i.sub === sub.key);
        const subNote = state.notes[section.key + "/" + sub.key];
        if (!subItems.length && !subNote) continue;
        out.push("### " + sub.label);
        out.push("");
        out.push(...groupedLines(subItems));
        if (subNote) { out.push(""); out.push(subNote); }
        out.push("");
      }
      const orphans = items.filter((i) => !i.sub);
      if (orphans.length) {
        out.push("### Autres");
        out.push("");
        out.push(...groupedLines(orphans));
        out.push("");
      }
    } else {
      out.push(...groupedLines(items));
      out.push("");
    }

    if (note) { out.push(note); out.push(""); }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function groupedLines(items) {
  const lines = [];
  const groups = new Map();
  for (const i of items) {
    const g = i.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  for (const [group, list] of groups) {
    if (group) { lines.push(""); lines.push("**" + group + "**"); lines.push(""); }
    list.forEach((i) => lines.push(itemLine(i)));
  }
  return lines;
}

function exportDailyTable() {
  const keys = Object.keys(state.daily).sort();
  if (!keys.length) return "_Aucune donnée de suivi._";
  const rows = ["| Date | Poids | Gras | Muscle | Sommeil | Forme | Journée |", "|---|---|---|---|---|---|---|"];
  for (const k of keys) {
    const v = state.daily[k];
    rows.push("| " + k + " | " + val(v.poids, " kg") + " | " + val(v.gras, " %") + " | " + val(v.muscle, " %") +
      " | " + val(v.sommeil, " h") + " | " + val(v.forme, "/10") + " | " + val(v.journee, "/10") + " |");
  }
  return rows.join("\n");
}

function exportObjectivesSection() {
  const out = [];
  const items = trackedItems();
  const wDates = weekDates(weekStartAt(0));
  const mDates = monthDates(new Date());
  const w = computeTotalRate(items, wDates);
  const m = computeTotalRate(items, mDates);

  out.push("## Objectifs & réussite");
  out.push("");
  out.push("- Réussite de la semaine : **" + formatPercent(w) + "**");
  out.push("- Réussite du mois : **" + formatPercent(m) + "**");
  out.push("");

  if (items.length) {
    out.push("| Habitude | Objectif | Moy. sem. | Moy. mois |");
    out.push("|---|---|---|---|");
    for (const it of items) {
      const f = frequencyOf(it);
      out.push("| " + it.title + " | " + (f === 7 ? "tous les jours" : f + "×/sem") +
        " | " + formatPercent(computeRate(it, wDates)) +
        " | " + formatPercent(computeRate(it, mDates)) + " |");
    }
    out.push("");
  }

  for (const [scope, label] of [["weekly", "Objectifs de la semaine"], ["monthly", "Objectifs du mois"]]) {
    const root = state.objectives[scope] || {};
    const keys = Object.keys(root).sort().reverse();
    if (!keys.length) continue;
    out.push("### " + label);
    out.push("");
    for (const k of keys) {
      if (!root[k] || !root[k].length) continue;
      out.push("**" + k + "**");
      out.push("");
      for (const o of root[k]) out.push("- [" + (o.done ? "x" : " ") + "] " + o.text);
      out.push("");
    }
  }

  return out;
}

function exportWorkoutsSection() {
  const list = (state.workouts || []).slice().sort((a, b) => b.at - a.at).slice(0, 30);
  if (!list.length) return [];
  const out = ["## Entraînement — séances", "", "| Date | Type | Détail | RPE |", "|---|---|---|---|"];
  for (const w of list) {
    let type = "", detail = "";
    if (w.type === "muscu") {
      type = "Muscu · " + w.label;
      detail = w.exercises.map((e) => e.ex + " " + e.sets.map((s) => s.reps + "×" + s.weight).join("/")).join(" ; ");
    } else if (w.type === "course") {
      type = "Course · " + w.mode;
      detail = Math.round(w.duration / 60) + " min" + (w.distance ? ", " + w.distance + " km" : "") +
        (w.rounds ? ", " + w.rounds + "×" + w.work + "/" + w.rest + " s" : "");
    } else {
      type = "Mobilité · " + w.routine;
      detail = Math.round(w.duration / 60) + " min" + (w.completed === false ? " (interrompue)" : "");
    }
    out.push("| " + w.date + " | " + type + " | " + detail.replace(/\|/g, "/") + " | " + (w.rpe || "—") + " |");
  }
  out.push("");
  return out;
}

function exportNutritionTable() {
  const keys = Object.keys(state.nutrition || {}).sort();
  if (!keys.length) return "";
  const rows = ["| Date | Calories | Protéines |", "|---|---|---|"];
  for (const k of keys) {
    const t = totalsFor([k]);
    rows.push("| " + k + " | " + Math.round(t.kcal) + " kcal | " + Math.round(t.prot) + " g |");
  }
  return rows.join("\n");
}

function val(v, suffix) {
  if (v === undefined || v === null) return "—";
  return v + (suffix || "");
}

// ------------------------------------------------------ sauvegarde JSON

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    throw new Error("Ce fichier ne ressemble pas à une sauvegarde de l'app.");
  }
  return sanitizeState(parsed);
}

// Un JSON restauré est une entrée externe : sans normalisation, un item null
// ferait avorter la restauration à mi-chemin, et une section inconnue
// planterait l'accueil à chaque lancement.
const VALID_STATUS = ["todo", "doing", "done", "blocked", "optional", "rejected", "queue"];
const VALID_KIND = ["task", "info", "marqueur", "rejected", "queue"];

function numOr(v, def) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

// { clé: nombre } — tout le reste est écarté.
function cleanNutrientObj(src) {
  const out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  for (const [k, v] of Object.entries(src)) {
    if (k.length > 20) continue;
    const n = parseFloat(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

// { id: quantité positive }
function cleanQtyMap(src) {
  const out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  for (const [k, v] of Object.entries(src)) {
    const n = parseFloat(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

// Rappels : heures au format HH:MM, intervalles bornés. Une heure invalide
// ferait taire le rappel sans rien dire.
// Secondes mesurées pendant une série : null si absurde ou absent.
function secondsOr(v, max) {
  const n = Math.round(numOr(v, 0));
  return n > 0 && n <= max ? n : null;
}

// Groupes musculaires : un groupe inconnu (ou disparu d'une version à
// l'autre) ne doit pas rendre un exercice introuvable dans les filtres.
function cleanGroup(v, fallback) {
  return (typeof v === "string" && GROUP_MAP[v]) ? v : fallback;
}

function cleanGroups(v, main) {
  const out = [];
  for (const g of (Array.isArray(v) ? v : [])) {
    if (typeof g !== "string" || !GROUP_MAP[g] || g === main || out.indexOf(g) >= 0) continue;
    out.push(g);
  }
  return out.slice(0, 6);
}

function cleanReminders(raw) {
  const r = (raw && typeof raw === "object") ? raw : {};
  const time = (v, def) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? String(v) : def);
  const days = (v, def, max) => {
    const n = Math.round(parseFloat(v));
    return Number.isFinite(n) && n >= 1 && n <= max ? n : def;
  };
  return {
    matin: time(r.matin, "07:00"), retour: time(r.retour, "18:30"), on: !!r.on,
    peseeOn: !!r.peseeOn, peseeHeure: time(r.peseeHeure, "18:00"), peseeJours: days(r.peseeJours, 1, 30),
    photoOn: !!r.photoOn, photoHeure: time(r.photoHeure, "07:30"), photoJours: days(r.photoJours, 14, 90)
  };
}

function sanitizeState(parsed) {
  const out = Object.assign({}, parsed);

  for (const k of ["checks", "daily", "nutrition", "notes", "importedHashes"]) {
    if (!out[k] || typeof out[k] !== "object" || Array.isArray(out[k])) out[k] = {};
  }

  // Le suivi quotidien porte maintenant des mesures corporelles et le
  // check-in du matin : un JSON forgé ne doit pas y injecter n'importe quoi.
  const DAILY_NUM = {
    sommeil: [0, 24], fc: [20, 220], hrv: [1, 300], energie: [1, 5],
    poids: [30, 250], gras: [3, 60], muscle: [10, 70], ventre: [40, 200], bras: [15, 70],
    forme: [1, 10], journee: [1, 10],
    sommeil_q: [1, 4], energie_q: [1, 4], douleur_q: [1, 4], humeur_q: [1, 4]
  };
  const DAILY_INT = ["sommeil_q", "energie_q", "douleur_q", "humeur_q", "forme", "journee", "fc", "energie"];
  const dailyIn = out.daily;
  out.daily = {};
  for (const [dkey, raw] of Object.entries(dailyIn)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dkey) || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const clean = {};
    for (const [field, bounds] of Object.entries(DAILY_NUM)) {
      // « 81,9 » vient d'un clavier français : c'est un nombre, pas 81.
      const n = parseFloat(String(raw[field]).replace(",", "."));
      if (!Number.isFinite(n) || n < bounds[0] || n > bounds[1]) continue;
      clean[field] = DAILY_INT.indexOf(field) >= 0 ? Math.round(n) : Math.round(n * 10) / 10;
    }
    if (typeof raw.reussites === "string" && raw.reussites.trim()) clean.reussites = raw.reussites.slice(0, 600);
    if (typeof raw.bloque === "string" && raw.bloque.trim()) clean.bloque = raw.bloque.slice(0, 400);
    if (Object.keys(clean).length) out.daily[dkey] = clean;
  }

  const obj = (parsed.objectives && typeof parsed.objectives === "object") ? parsed.objectives : {};
  out.objectives = { weekly: {}, monthly: {} };
  for (const scope of ["weekly", "monthly"]) {
    const src = (obj[scope] && typeof obj[scope] === "object") ? obj[scope] : {};
    for (const [periodKey, list] of Object.entries(src)) {
      if (!Array.isArray(list)) continue;
      const clean = list
        .filter((o) => o && typeof o.text === "string" && o.text.trim())
        .map((o) => ({
          id: typeof o.id === "string" && o.id ? o.id : makeId("o"),
          text: o.text.slice(0, 200),
          done: !!o.done
        }));
      if (clean.length) out.objectives[scope][periodKey] = clean;
    }
  }

  // Numéro de correctifs de graine : une valeur au-dessus de ce que cette
  // version connaît ferait sauter en silence toutes les corrections à venir.
  const maxPatch = SEED_PATCHES.reduce((a, p) => Math.max(a, Number(p.v) || 0), 0);
  const patchV = Math.floor(numOr(parsed.seedPatchVersion, 0));
  out.seedPatchVersion = Math.min(maxPatch, Math.max(0, patchV));

  const s = (out.settings && typeof out.settings === "object") ? out.settings : {};
  out.settings = {
    theme: ["auto", "clair", "sombre"].indexOf(s.theme) >= 0 ? s.theme : "auto",
    reminders: cleanReminders(s.reminders),
    folded: (s.folded && typeof s.folded === "object" && !Array.isArray(s.folded)) ? s.folded : {},
    templateSort: ["recent", "name", "order"].indexOf(s.templateSort) >= 0 ? s.templateSort : "order",
    templateOrder: (Array.isArray(s.templateOrder) ? s.templateOrder : [])
      .filter((k) => typeof k === "string").slice(0, 60),
    volumeMetric: ["tonnage", "sets", "reps", "rpe"].indexOf(s.volumeMetric) >= 0 ? s.volumeMetric : "tonnage",
    rapportJours: [7, 14, 30].indexOf(Math.round(parseFloat(s.rapportJours))) >= 0 ? Math.round(parseFloat(s.rapportJours)) : 14,
    hiddenTemplates: (Array.isArray(s.hiddenTemplates) ? s.hiddenTemplates : []).filter((x) => typeof x === "string"),
    // Les cibles macros de l'utilisateur font partie de la sauvegarde :
    // les jeter remettrait ses fourchettes aux défauts en silence.
    targets: (function () {
      const t = (s.targets && typeof s.targets === "object") ? s.targets : {};
      const clean = {};
      for (const k of ["prot", "glu", "lip"]) {
        const v = parseFloat(t[k]);
        if (Number.isFinite(v) && v >= 0 && v <= 2000) clean[k] = Math.round(v);
      }
      const tol = parseFloat(t.tolerance);
      if (Number.isFinite(tol) && tol > 0 && tol <= 0.5) clean.tolerance = tol;
      return clean;
    })()
  };

  // ---- nouvelles clés d'état : un JSON forgé ne doit ni planter l'app au
  // prochain lancement, ni injecter des chaînes là où des nombres sont attendus.

  const foodIds = new Set();
  out.customFoods = (Array.isArray(parsed.customFoods) ? parsed.customFoods : [])
    .filter((f) => f && typeof f === "object" && typeof f.label === "string" && f.label.trim())
    .map(function (raw) {
      const unit = ["g", "ml", "u", "portion"].indexOf(raw.unit) >= 0 ? raw.unit : "g";
      let fid = typeof raw.id === "string" && raw.id ? raw.id : "";
      if (!fid || foodIds.has(fid)) fid = makeId("cf");
      foodIds.add(fid);
      return {
        id: fid,
        label: raw.label.slice(0, 80),
        cat: CAT_MAP[raw.cat] ? raw.cat : "divers",
        unit: unit,
        base: unit === "u" || unit === "portion" ? 1 : 100,
        step: unit === "u" || unit === "portion" ? 1 : (unit === "ml" ? 50 : 10),
        custom: true,
        n: cleanNutrientObj(raw.n)
      };
    });

  out.supplements = (Array.isArray(parsed.supplements) ? parsed.supplements : [])
    .filter((x) => x && typeof x === "object" && typeof x.label === "string" && x.label.trim())
    .map((raw) => ({
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("sup"),
      label: raw.label.slice(0, 80),
      unit: typeof raw.unit === "string" ? raw.unit.slice(0, 20) : "unité",
      n: cleanNutrientObj(raw.n)
    }));

  out.recipes = (Array.isArray(parsed.recipes) ? parsed.recipes : [])
    .filter((r) => r && typeof r === "object" && typeof r.label === "string" && r.label.trim())
    .map((raw) => ({
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("rec"),
      label: raw.label.slice(0, 80),
      portions: Math.max(1, Math.round(numOr(raw.portions, 1))),
      items: cleanQtyMap(raw.items)
    }));

  out.foodOverrides = {};
  if (parsed.foodOverrides && typeof parsed.foodOverrides === "object" && !Array.isArray(parsed.foodOverrides)) {
    for (const [fid, vals] of Object.entries(parsed.foodOverrides)) {
      const clean = cleanNutrientObj(vals);
      if (Object.keys(clean).length) out.foodOverrides[fid] = clean;
    }
  }

  out.customExercises = (Array.isArray(parsed.customExercises) ? parsed.customExercises : [])
    .filter((e) => e && typeof e === "object" && typeof e.label === "string" && e.label.trim())
    .map((raw) => ({
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("ex"),
      label: raw.label.slice(0, 60),
      group: cleanGroup(raw.group, "gainage"),
      sec: cleanGroups(raw.sec, cleanGroup(raw.group, "gainage")),
      cue: typeof raw.cue === "string" ? raw.cue.slice(0, 200) : "",
      load: ["kg", "corps", "temps"].indexOf(raw.load) >= 0 ? raw.load : "kg",
      custom: true
    }));

  // Corrections d'exercices du catalogue : mêmes règles que les exercices
  // perso, et jamais un id inventé.
  const ovIn = (parsed.exerciseOverrides && typeof parsed.exerciseOverrides === "object" && !Array.isArray(parsed.exerciseOverrides))
    ? parsed.exerciseOverrides : {};
  out.exerciseOverrides = {};
  for (const [id, raw] of Object.entries(ovIn)) {
    if (!EXERCISE_MAP[id] || !raw || typeof raw !== "object" || typeof raw.label !== "string" || !raw.label.trim()) continue;
    const group = cleanGroup(raw.group, EXERCISE_MAP[id].group);
    out.exerciseOverrides[id] = {
      label: raw.label.slice(0, 60),
      group: group,
      sec: cleanGroups(raw.sec, group),
      cue: typeof raw.cue === "string" ? raw.cue.slice(0, 200) : "",
      load: ["kg", "corps", "temps"].indexOf(raw.load) >= 0 ? raw.load : EXERCISE_MAP[id].load
    };
  }

  out.workoutTemplates = (Array.isArray(parsed.workoutTemplates) ? parsed.workoutTemplates : [])
    .filter((t) => t && typeof t === "object" && typeof t.label === "string" && t.label.trim() && Array.isArray(t.plan))
    .map(function (raw) {
      const base = {
        id: typeof raw.id === "string" && raw.id ? raw.id : makeId("tpl"),
        label: raw.label.slice(0, 60),
        link: typeof raw.link === "string" ? raw.link.slice(0, 40) : "auto"
      };
      const entries = raw.plan.filter((p) => p && typeof p === "object" && typeof p.ex === "string");
      if (raw.kind === "circuit") {
        return Object.assign(base, {
          kind: "circuit",
          mode: raw.mode === "amrap" ? "amrap" : "rounds",
          rounds: Math.min(30, Math.max(0, Math.round(numOr(raw.rounds, 3)))),
          cap: Math.min(7200, Math.max(0, Math.round(numOr(raw.cap, 0)))),
          plan: entries.map((p) => ({
            ex: p.ex,
            qty: Math.min(10000, Math.max(1, Math.round(numOr(p.qty, 10)))),
            unit: ["reps", "s", "m"].indexOf(p.unit) >= 0 ? p.unit : "reps"
          }))
        });
      }
      return Object.assign(base, {
        plan: entries.map((p) => ({
          ex: p.ex,
          sets: Math.min(12, Math.max(1, Math.round(numOr(p.sets, 3)))),
          reps: Math.min(300, Math.max(1, Math.round(numOr(p.reps, 8)))),
          tempo: String(p.tempo || "").toUpperCase().replace(/[^0-9X]/g, "").slice(0, 4)
        }))
      });
    })
    .filter((t) => t.plan.length);

  out.workouts = (Array.isArray(parsed.workouts) ? parsed.workouts : [])
    .filter((w) => w && typeof w === "object" && ["muscu", "course", "mobilite", "circuit"].indexOf(w.type) >= 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(w.date || ""))
    .map(function (raw) {
      const w = {
        id: typeof raw.id === "string" && raw.id ? raw.id : makeId("w"),
        type: raw.type, date: raw.date,
        at: Number.isFinite(parseFloat(raw.at)) ? parseFloat(raw.at) : Date.now(),
        duration: Math.max(0, Math.round(numOr(raw.duration, 0))),
        rpe: Number.isFinite(parseFloat(raw.rpe)) ? Math.min(10, Math.max(1, Math.round(parseFloat(raw.rpe)))) : null,
        note: typeof raw.note === "string" ? raw.note.slice(0, 300) : "",
        linked: typeof raw.linked === "string" ? raw.linked : null
      };
      if (w.type === "muscu") {
        w.template = typeof raw.template === "string" ? raw.template : "libre";
        w.label = typeof raw.label === "string" ? raw.label.slice(0, 60) : "Séance";
        w.exercises = (Array.isArray(raw.exercises) ? raw.exercises : [])
          .filter((e) => e && typeof e === "object" && typeof e.ex === "string")
          .map((e) => ({
            ex: e.ex,
            tempo: String(e.tempo || "").toUpperCase().replace(/[^0-9X]/g, "").slice(0, 4),
            sets: (Array.isArray(e.sets) ? e.sets : [])
              .filter((s) => s && typeof s === "object")
              .map((s) => ({
                reps: Math.max(0, Math.round(numOr(s.reps, 0))),
                weight: Math.max(0, numOr(s.weight, 0)),
                rpe: (function () { const r = Math.round(numOr(s.rpe, 0)); return r >= 1 && r <= 10 ? r : null; })(),
                dur: secondsOr(s.dur, 3600),
                rest: secondsOr(s.rest, 7200)
              }))
              .filter((s) => s.reps > 0)
          }))
          .filter((e) => e.sets.length);
      } else if (w.type === "course") {
        w.mode = ["liss", "hiit", "fractionne"].indexOf(raw.mode) >= 0 ? raw.mode : "liss";
        w.distance = Number.isFinite(parseFloat(raw.distance)) ? Math.max(0, parseFloat(raw.distance)) : null;
        w.work = Math.max(0, Math.round(numOr(raw.work, 0)));
        w.rest = Math.max(0, Math.round(numOr(raw.rest, 0)));
        w.rounds = Math.max(0, Math.round(numOr(raw.rounds, 0)));
      } else if (w.type === "circuit") {
        w.template = typeof raw.template === "string" ? raw.template : null;
        w.label = typeof raw.label === "string" ? raw.label.slice(0, 60) : "Circuit";
        w.mode = raw.mode === "amrap" ? "amrap" : "rounds";
        w.rounds = Math.max(0, Math.round(numOr(raw.rounds, 0)));
        w.stationsDone = Math.max(0, Math.round(numOr(raw.stationsDone, 0)));
        w.stations = (Array.isArray(raw.stations) ? raw.stations : [])
          .filter((p) => p && typeof p === "object" && typeof p.ex === "string")
          .map((p) => ({
            ex: p.ex,
            qty: Math.min(10000, Math.max(1, Math.round(numOr(p.qty, 10)))),
            unit: ["reps", "s", "m"].indexOf(p.unit) >= 0 ? p.unit : "reps"
          }));
      } else {
        w.routine = typeof raw.routine === "string" ? raw.routine : "";
        w.completed = raw.completed !== false;
      }
      return w;
    })
    .filter((w) => w.type !== "muscu" || w.exercises.length);

  out.nutrition = {};
  if (parsed.nutrition && typeof parsed.nutrition === "object" && !Array.isArray(parsed.nutrition)) {
    for (const [dk, log] of Object.entries(parsed.nutrition)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || !log || typeof log !== "object") continue;
      const clean = {
        items: cleanQtyMap(log.items),
        supps: cleanQtyMap(log.supps),
        recipes: cleanQtyMap(log.recipes),
        libre: (Array.isArray(log.libre) ? log.libre : [])
          .filter((l) => l && typeof l === "object")
          .map((l) => ({
            label: typeof l.label === "string" ? l.label.slice(0, 60) : "Ajout libre",
            kcal: numOr(l.kcal, 0), prot: numOr(l.prot, 0),
            glu: numOr(l.glu, 0), lip: numOr(l.lip, 0)
          }))
      };
      // Ancien format « portions » : conservé pour que la migration le rejoue.
      if (log.foods && typeof log.foods === "object") clean.foods = cleanQtyMap(log.foods);
      if (Object.keys(clean.items).length || Object.keys(clean.supps).length ||
          Object.keys(clean.recipes).length || clean.libre.length || clean.foods) {
        out.nutrition[dk] = clean;
      }
    }
  }

  const ids = new Set();
  out.items = parsed.items
    .filter((raw) => raw && typeof raw === "object" && (raw.title || raw.id))
    .map(function (raw) {
      const i = Object.assign({
        id: "", section: "inbox", sub: null, group: null, title: "", detail: "",
        warn: "", kind: "task", status: "todo", priority: "normal",
        blockedBy: null, recurrence: null, source: "manual",
        createdAt: Date.now(), doneAt: null, pinned: false
      }, raw);
      if (!SECTION_MAP[i.section]) { i.section = "inbox"; i.sub = null; }
      i.title = String(i.title || "(sans titre)").slice(0, 300);
      i.detail = typeof i.detail === "string" ? i.detail : "";
      i.warn = typeof i.warn === "string" ? i.warn : "";
      if (VALID_KIND.indexOf(i.kind) < 0) i.kind = "task";
      if (VALID_STATUS.indexOf(i.status) < 0) i.status = "todo";
      if (["critical", "normal", "low"].indexOf(i.priority) < 0) i.priority = "normal";
      if (typeof i.blockedBy !== "string") i.blockedBy = null;
      const r = i.recurrence;
      if (r && r.type === "daily") i.recurrence = { type: "daily" };
      else if (r && r.type === "week" && +r.perWeek >= 1 && +r.perWeek <= 7) {
        i.recurrence = { type: "week", perWeek: Math.round(+r.perWeek) };
      } else i.recurrence = null;
      if (!i.id || typeof i.id !== "string" || ids.has(i.id)) i.id = makeId("r");
      ids.add(i.id);
      return i;
    });

  // blockedBy vers un id absent : l'item ne doit pas rester bloqué par un fantôme.
  out.items.forEach(function (i) {
    if (i.blockedBy && !ids.has(i.blockedBy)) {
      i.blockedBy = null;
      if (i.status === "blocked") i.status = "todo";
    }
  });

  out.seededIds = Array.isArray(parsed.seededIds)
    ? parsed.seededIds.filter((x) => typeof x === "string")
    : [];

  return out;
}

// -------------------------------------------------------- téléchargement

export function download(filename, text, mime) {
  const blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function stamp() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}
