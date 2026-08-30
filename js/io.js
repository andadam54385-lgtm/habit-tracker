// Entrées / sorties : validation d'un import, export Markdown (pour Obsidian),
// sauvegarde et restauration JSON.

import { state, save, addItem, setDaily, dayKey, isDone, isRecurring, weekProgress, rootBlocker, makeId } from "./state.js";
import { SECTIONS, SECTION_MAP } from "./seed.js";
import { totalsFor } from "./nutrition.js";
import {
  trackedItems, weekDates, monthDates, weekStartAt,
  computeRate, computeTotalRate, formatPercent, frequencyOf
} from "./objectives.js";

// ------------------------------------------------------------- import

// Écrit les entrées validées. Jamais appelé sans aperçu préalable (spec §4 bis).
export function commitImport(entries, sourceLabel) {
  const source = sourceLabel || "import";
  let added = 0, metrics = 0, skipped = 0;

  for (const e of entries) {
    if (e.duplicate) { skipped++; continue; }

    if (e.type === "metric") {
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
  return { added: added, metrics: metrics, skipped: skipped };
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
  const rows = ["| Date | Sommeil | FC repos | Énergie |", "|---|---|---|---|"];
  for (const k of keys) {
    const v = state.daily[k];
    rows.push("| " + k + " | " + val(v.sommeil, " h") + " | " + val(v.fc) + " | " + val(v.energie, "/5") + " |");
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

function sanitizeState(parsed) {
  const out = Object.assign({}, parsed);

  for (const k of ["checks", "daily", "nutrition", "notes", "importedHashes"]) {
    if (!out[k] || typeof out[k] !== "object" || Array.isArray(out[k])) out[k] = {};
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

  const s = (out.settings && typeof out.settings === "object") ? out.settings : {};
  out.settings = {
    theme: ["auto", "clair", "sombre"].indexOf(s.theme) >= 0 ? s.theme : "auto",
    reminders: Object.assign(
      { matin: "07:00", retour: "18:30", on: false },
      (s.reminders && typeof s.reminders === "object") ? s.reminders : {}
    ),
    folded: (s.folded && typeof s.folded === "object" && !Array.isArray(s.folded)) ? s.folded : {}
  };

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
