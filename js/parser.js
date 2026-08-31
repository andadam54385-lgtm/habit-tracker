// Parseur du format d'échange « suivi » (spec §4 bis).
//
//   [sante/rendezvous] Téléconsultation prise — mardi 2 sept, 20h30, Qare
//   [suivi] sommeil=7.5 fc=58 energie=3
//
// Règles : un tag par ligne, en tête, entre crochets. Tag inconnu ou absent
// -> Boîte de réception. Bloc mal formé -> tout le texte brut en inbox.
// Rien n'est jamais perdu.

import { IMPORT_TAGS } from "./seed.js";

const METRIC_KEYS = { sommeil: "sommeil", fc: "fc", energie: "energie", "énergie": "energie" };

function localDayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0");
}

// Hash stable d'une ligne, pour rendre l'import idempotent (spec §4 bis).
export function hashLine(str) {
  let h = 0x811c9dc5;
  const s = String(str).trim().replace(/\s+/g, " ").toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "h" + h.toString(36) + "-" + s.length.toString(36);
}

// Isole le contenu des blocs ```suivi ... ``` (ou fences génériques) s'il y en
// a ; sinon rend le texte tel quel. Les lignes taguées restées HORS fence sont
// conservées — rien ne se perd — mais pas la prose qui les entoure.
function extractBlocks(text) {
  const fence = /```[^\n]*\r?\n([\s\S]*?)```/g;
  const inside = [];
  let m;
  while ((m = fence.exec(text)) !== null) inside.push(m[1]);
  if (!inside.length) return text;
  const tagged = text.replace(fence, "\n").split(/\r?\n/)
    .filter((l) => /^\s*(?:[-*+•]|\d+[.)])?\s*\[[^\]]{1,40}\]/.test(l));
  return inside.join("\n") + (tagged.length ? "\n" + tagged.join("\n") : "");
}

function stripBullet(line) {
  return line.replace(/^\s*(?:[-*+•]|\d+[.)])\s+/, "").trim();
}

// Valeurs de micronutriments renvoyées par Claude pour un aliment.
// « vk » = vitamine K ; « k » est déjà le potassium.
const MICRO_KEYS = ["fibres", "sucres", "k", "na", "mg", "ca", "fe", "zn",
  "c", "b9", "e", "vk", "vita", "b6", "iode", "d", "b12", "se", "om3"];

function parseNutrientValues(rest) {
  const values = {};
  const re = /([a-zA-Z0-9]+)\s*[=:]\s*(-?[0-9]+(?:[.,][0-9]+)?)/g;
  let m;
  while ((m = re.exec(rest)) !== null) {
    const key = m[1].toLowerCase();
    if (MICRO_KEYS.indexOf(key) < 0) continue;
    const v = parseFloat(m[2].replace(",", "."));
    if (Number.isFinite(v) && v >= 0) values[key] = v;
  }
  return values;
}

function parseMetrics(rest) {
  const values = {};
  const re = /([a-zA-Zéà]+)\s*[=:]\s*([0-9]+(?:[.,][0-9]+)?)/g;
  let m;
  while ((m = re.exec(rest)) !== null) {
    const key = METRIC_KEYS[m[1].toLowerCase()];
    if (!key) continue;
    values[key] = parseFloat(m[2].replace(",", "."));
  }
  const dateMatch = rest.match(/date\s*[=:]\s*(\d{4}-\d{2}-\d{2})/);
  return { values: values, date: dateMatch ? dateMatch[1] : null };
}

/**
 * @param {string} text  texte collé, partagé ou lu dans un fichier
 * @param {object} knownHashes  state.importedHashes, pour marquer les doublons
 * @returns {{entries: Array, malformed: boolean, total: number, fresh: number, duplicates: number}}
 */
export function parseImport(text, knownHashes) {
  const known = knownHashes || {};
  const body = extractBlocks(String(text || ""));
  const lines = body.split(/\r?\n/);

  const entries = [];
  const seen = new Set();  // doublons à l'intérieur du même bloc
  let bracketCount = 0;    // lignes qui *ressemblent* à du format suivi

  // Deux lignes identiques dans un même bloc = un seul ajout.
  function mark(entry) {
    if (seen.has(entry.hash)) entry.duplicate = true;
    seen.add(entry.hash);
    return entry;
  }

  for (const rawLine of lines) {
    const line = stripBullet(rawLine);
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) continue;          // titre markdown : pas une entrée
    if (/^[-–—=_]{3,}$/.test(line)) continue;      // séparateur

    const m = line.match(/^\[([^\]]{1,40})\]\s*(.*)$/);
    const tag = m ? m[1].trim().toLowerCase() : null;
    const rest = m ? m[2].trim() : line;
    const dest = tag ? IMPORT_TAGS[tag] : null;

    if (tag) bracketCount++;

    const hash = hashLine(line);

    // [aliment:<id>] k=350 mg=140 … -> complète un aliment existant.
    if (tag && tag.startsWith("aliment:")) {
      const ref = tag.slice(8).trim();
      const values = parseNutrientValues(rest);
      if (ref && Object.keys(values).length) {
        entries.push(mark({
          type: "food",
          hash: hash,
          raw: line,
          ref: ref,
          values: values,
          duplicate: !!known[hash],
          label: ref + " — " + Object.keys(values).length + " valeur" +
            (Object.keys(values).length > 1 ? "s" : "")
        }));
        continue;
      }
    }

    if (dest && dest.section === "suivi") {
      const parsed = parseMetrics(rest);
      if (Object.keys(parsed.values).length) {
        // Le même relevé un autre jour est un nouveau relevé, pas un doublon :
        // la date effective entre dans le hash d'idempotence.
        const mhash = hashLine(line + " @" + (parsed.date || localDayKey()));
        entries.push(mark({
          type: "metric",
          hash: mhash,
          raw: line,
          date: parsed.date,
          values: parsed.values,
          duplicate: !!known[mhash],
          label: metricLabel(parsed.values)
        }));
        continue;
      }
      // [suivi] sans paire clé=valeur exploitable : on garde le texte en note.
      entries.push(mark(makeItemEntry(hash, line, rest, { section: "suivi", sub: null }, known, tag, true)));
      continue;
    }

    if (dest) {
      entries.push(mark(makeItemEntry(hash, line, rest, dest, known, tag, false)));
    } else {
      // Tag inconnu ou absent -> inbox, jamais perdu.
      entries.push(mark(makeItemEntry(hash, line, rest, { section: "inbox", sub: null }, known, tag, false, !!tag)));
    }
  }

  // Bloc mal formé : pas une seule ligne balisée, donc pas un bloc `suivi`.
  // On préfère un import brut intégral à un échec — et à l'éclatement d'un
  // paragraphe en dizaines de lignes d'inbox. Un tag simplement inconnu ne
  // compte pas comme « mal formé » : la ligne suit la règle tag -> inbox.
  const malformed = bracketCount === 0 && entries.length > 0;
  if (malformed) {
    const whole = body.trim();
    const hash = hashLine(whole);
    return {
      entries: [{
        type: "item",
        hash: hash,
        raw: whole,
        title: firstLine(whole),
        detail: whole,
        section: "inbox",
        sub: null,
        duplicate: !!known[hash],
        unknownTag: false,
        fallback: true
      }],
      malformed: true,
      total: 1,
      fresh: known[hash] ? 0 : 1,
      duplicates: known[hash] ? 1 : 0
    };
  }

  const duplicates = entries.filter((e) => e.duplicate).length;
  return {
    entries: entries,
    malformed: false,
    total: entries.length,
    fresh: entries.length - duplicates,
    duplicates: duplicates
  };
}

function makeItemEntry(hash, raw, rest, dest, known, tag, asNote, unknownTag) {
  const text = rest || raw;
  return {
    type: "item",
    hash: hash,
    raw: raw,
    title: firstLine(text),
    detail: text.length > 120 ? text : "",
    section: dest.section,
    sub: dest.sub,
    duplicate: !!known[hash],
    unknownTag: !!unknownTag,
    originalTag: unknownTag ? tag : null,
    kind: asNote ? "info" : "task",
    fallback: false
  };
}

function firstLine(s) {
  const t = String(s).split(/\r?\n/)[0].trim();
  return t.length > 160 ? t.slice(0, 157) + "…" : t;
}

function metricLabel(values) {
  const parts = [];
  if (values.sommeil !== undefined) parts.push(values.sommeil + " h de sommeil");
  if (values.fc !== undefined) parts.push("FC repos " + values.fc);
  if (values.energie !== undefined) parts.push("énergie " + values.energie + "/5");
  return parts.join(" · ");
}
