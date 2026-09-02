// Les vues produisent du HTML. Le câblage se fait par délégation dans app.js,
// sauf pour les champs de saisie, montés par `mount` après l'injection.

import { esc, escLines, fmtDate, fmtShort } from "./ui.js";
import { renderList, renderGrouped } from "./components.js";
import { SECTIONS, SECTION_MAP } from "./seed.js";
import { weekSuccess, pendingObjectives, formatPercent, rateClass } from "./objectives.js";
import {
  state, isDone, isRecurring, weekProgress, rootBlocker, dependentCount,
  dayKey, dailyHistory, setDaily, setNote, saveQuiet
} from "./state.js";

// ------------------------------------------------------------- sélecteurs

function live(item) {
  return item.status !== "rejected" && item.status !== "queue" && item.kind !== "info";
}

export function dueToday(key) {
  const k = key || dayKey();
  return state.items.filter(function (i) {
    if (!live(i)) return false;
    if (!isRecurring(i)) return false;
    // Une routine dont le prérequis n'est pas fait n'est pas « à faire
    // aujourd'hui » (ex. trétinoïne pas encore prescrite) — spec §5.3.
    if (rootBlocker(i)) return false;
    if (i.recurrence.type === "daily") return true;
    const p = weekProgress(i);
    return p.done < p.target || isDone(i, k);
  });
}

function loneTasks() {
  return state.items.filter(function (i) {
    return live(i) && !isRecurring(i) && !isDone(i) &&
      i.status !== "optional" && i.status !== "blocked" && !rootBlocker(i);
  });
}

function blockedItems() {
  // Deux façons d'être bloqué : par un autre item (blockedBy), ou à la main
  // via la fiche (statut « Bloqué » sans lien) — les deux doivent se voir ici.
  return state.items.filter(function (i) {
    return !isDone(i) && i.status !== "rejected" &&
      (!!rootBlocker(i) || i.status === "blocked");
  });
}

// La prochaine action bloquante : celle dont dépend le plus de choses.
export function nextBlockingAction() {
  const candidates = state.items.filter(function (i) {
    return !isDone(i) && live(i) && i.status !== "blocked" && !rootBlocker(i);
  });
  let best = null, bestScore = -1;
  for (const c of candidates) {
    const deps = dependentCount(c.id);
    const score = deps * 10 + (c.priority === "critical" ? 5 : 0) + (c.pinned ? 1 : 0);
    if (deps === 0 && c.priority !== "critical") continue;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

// ------------------------------------------------------------------ home

export function viewHome() {
  const next = nextBlockingAction();
  const today = dueToday();
  const doneToday = today.filter((i) => isDone(i)).length;
  const blocked = blockedItems();

  let html = '<div class="view view-home">';

  html += '<p class="today-date">' + esc(fmtDate(new Date())) + "</p>";

  // 1. La prochaine action bloquante, en haut et en grand.
  if (next) {
    const deps = dependentCount(next.id);
    html +=
      '<section class="hero" data-id="' + esc(next.id) + '">' +
        '<p class="hero-kicker">La prochaine action bloquante</p>' +
        '<h2 class="hero-title">' + esc(next.title) + "</h2>" +
        (next.detail ? '<p class="hero-detail">' + escLines(next.detail) + "</p>" : "") +
        (next.warn ? '<p class="hero-warn">⚠️ ' + escLines(next.warn) + "</p>" : "") +
        (deps ? '<p class="hero-deps">' + deps + (deps > 1 ? " éléments attendent" : " élément attend") + " cette action.</p>" : "") +
        '<div class="hero-actions">' +
          '<button class="btn btn-primary" type="button" data-act="hero-done">C\'est fait</button>' +
          '<button class="btn btn-ghost" type="button" data-act="open-item" data-target="' + esc(next.id) + '">Détails</button>' +
        "</div>" +
      "</section>";
  } else {
    html +=
      '<section class="hero hero-clear">' +
        '<p class="hero-kicker">Rien ne bloque</p>' +
        '<h2 class="hero-title">Aucune action bloquante en attente.</h2>' +
      "</section>";
  }

  // Réussite de la semaine + objectifs en cours : le cœur de l'app d'origine,
  // gardé visible depuis l'accueil.
  const rate = weekSuccess();
  const objs = pendingObjectives();
  html += '<a class="rate-strip ' + rateClass(rate) + '" href="#/objectifs">' +
    '<span class="rate-strip-main"><strong>' + formatPercent(rate) + "</strong>" +
      "<span>de réussite cette semaine</span></span>" +
    '<span class="rate-strip-obj">' +
      (objs.total
        ? objs.done + " / " + objs.total + " objectif" + (objs.total > 1 ? "s" : "")
        : "Aucun objectif fixé") +
    " →</span>" +
  "</a>";

  // 2. Les cases du jour.
  html += '<section class="block">' +
    '<div class="block-head">' +
      "<h2>Les cases du jour</h2>" +
      '<span class="counter">' + doneToday + " / " + today.length + "</span>" +
    "</div>";

  const bySection = new Map();
  for (const i of today) {
    if (!bySection.has(i.section)) bySection.set(i.section, []);
    bySection.get(i.section).push(i);
  }
  if (!today.length) {
    html += '<p class="empty">Aucune case aujourd\'hui.</p>';
  } else {
    for (const [key, items] of bySection) {
      const sec = SECTION_MAP[key];
      html += '<h3 class="group-title">' + esc(sec.icon + " " + sec.label) + "</h3>";
      html += renderList(items, {});
    }
  }
  html += "</section>";

  // Rappel du volume bloqué, pour que ce soit visible depuis l'accueil.
  if (blocked.length) {
    html += '<a class="callout" href="#/bloque">' +
      "<strong>" + blocked.length + " éléments sont en attente</strong>" +
      "<span>Voir ce qui bloque →</span>" +
      "</a>";
  }

  html += "</div>";
  return html;
}

// --------------------------------------------------------------- today

// Thème pliable. Les deux compteurs sont rendus d'avance et c'est le CSS qui
// choisit lequel montrer selon [open] : le pliage reste instantané, sans
// attendre un re-rendu.
function foldBlock(foldKey, title, doneCount, total, body) {
  const open = !(state.settings.folded && state.settings.folded[foldKey]);
  const left = total - doneCount;
  const closed = left > 0
    ? left + (left > 1 ? " à faire" : " à faire")
    : "✓ terminé";
  return '<details class="fold" data-fold="' + esc(foldKey) + '"' + (open ? " open" : "") + ">" +
    '<summary class="fold-head">' +
      '<span class="fold-caret" aria-hidden="true">›</span>' +
      "<h2>" + title + "</h2>" +
      '<span class="counter">' +
        '<span class="when-open">' + doneCount + " / " + total + "</span>" +
        '<span class="when-closed' + (left ? "" : " is-done") + '">' + closed + "</span>" +
      "</span>" +
    "</summary>" +
    '<div class="fold-body">' + body + "</div>" +
  "</details>";
}

export function viewToday() {
  const key = dayKey();
  const today = dueToday(key);
  const lone = loneTasks();

  let html = '<div class="view">';

  const doneAll = today.filter((i) => isDone(i, key)).length;
  html += '<header class="view-head"><h1>Aujourd\'hui</h1><p class="sub">' +
    esc(fmtDate(new Date())) +
    (today.length ? " · " + (today.length - doneAll) + " case" +
      (today.length - doneAll > 1 ? "s" : "") + " restante" +
      (today.length - doneAll > 1 ? "s" : "") : "") +
    "</p></header>";

  const bySection = new Map();
  for (const i of today) {
    if (!bySection.has(i.section)) bySection.set(i.section, []);
    bySection.get(i.section).push(i);
  }

  if (!today.length && !lone.length) {
    html += '<p class="empty">Rien à faire aujourd\'hui.</p>';
  }

  if (bySection.size > 1) {
    html += '<div class="fold-actions">' +
      '<button type="button" class="btn btn-small btn-ghost" data-act="fold-all">Tout replier</button>' +
      '<button type="button" class="btn btn-small btn-ghost" data-act="unfold-all">Tout déplier</button>' +
      "</div>";
  }

  for (const [k, items] of bySection) {
    const sec = SECTION_MAP[k];
    const done = items.filter((i) => isDone(i, key)).length;
    html += foldBlock(
      "jour:" + k,
      esc(sec.icon + " " + sec.label),
      done,
      items.length,
      renderList(items, {})
    );
  }

  if (lone.length) {
    html += foldBlock(
      "jour:ponctuelles",
      "Actions ponctuelles",
      0,
      lone.length,
      renderList(lone, { showSectionName: true })
    );
  }

  html += "</div>";
  return html;
}

// -------------------------------------------------------------- blocked

export function viewBlocked() {
  const blocked = blockedItems();
  const roots = new Map();
  const manual = [];
  for (const i of blocked) {
    const r = rootBlocker(i);
    if (!r) { manual.push(i); continue; }
    if (!roots.has(r.id)) roots.set(r.id, { root: r, items: [] });
    roots.get(r.id).items.push(i);
  }
  const groups = Array.from(roots.values()).sort((a, b) => b.items.length - a.items.length);

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Bloqué</h1><p class="sub">' +
    (blocked.length
      ? blocked.length + " éléments attendent " + groups.length + (groups.length > 1 ? " actions." : " action.")
      : "Rien n'attend quoi que ce soit.") +
    "</p></header>";

  if (groups.length) {
    const top = groups[0];
    const share = Math.round((top.items.length / blocked.length) * 100);
    if (share >= 40) {
      html += '<p class="callout callout-static"><strong>' + share +
        " % de ce qui est bloqué dépend d'une seule action :</strong> " +
        esc(top.root.title) + ".</p>";
    }
  }

  for (const g of groups) {
    html += '<section class="blocker-group">' +
      '<div class="blocker-head" data-id="' + esc(g.root.id) + '">' +
        '<span class="blocker-lock">🔒</span>' +
        '<div data-act="open" role="button" tabindex="0">' +
          '<h2>' + esc(g.root.title) + "</h2>" +
          '<p class="sub">' + g.items.length + (g.items.length > 1 ? " éléments en attente" : " élément en attente") + "</p>" +
        "</div>" +
        '<button class="btn btn-small" type="button" data-act="unblock" data-target="' + esc(g.root.id) + '">Fait</button>' +
      "</div>" +
      renderList(g.items, {}) +
      "</section>";
  }

  if (manual.length) {
    html += '<section class="blocker-group">' +
      '<div class="blocker-head">' +
        '<span class="blocker-lock">🔒</span>' +
        "<div>" +
          "<h2>Bloqué à la main</h2>" +
          '<p class="sub">À débloquer depuis la fiche de l\'item (état → À faire).</p>' +
        "</div>" +
      "</div>" +
      renderList(manual, {}) +
      "</section>";
  }

  if (!blocked.length) html += '<p class="empty">Aucun élément bloqué.</p>';
  html += "</div>";
  return html;
}

// ------------------------------------------------------------- rubriques

export function viewSections() {
  let html = '<div class="view"><header class="view-head"><h1>Rubriques</h1></header><nav class="section-grid">';
  for (const s of SECTIONS) {
    const items = state.items.filter((i) => i.section === s.key);
    const open = items.filter((i) => !isDone(i) && i.kind !== "info" && i.status !== "rejected" && i.status !== "queue").length;
    const href = s.key === "suivi" ? "#/suivi" : "#/s/" + s.key;
    const days = Object.keys(state.daily).length;
    const count = s.key === "suivi"
      ? days + (days > 1 ? " jours" : " jour")
      : open + (open > 1 ? " ouverts" : " ouvert");
    html += '<a class="section-card' + (s.priority ? " is-priority" : "") + '" href="' + href + '">' +
      '<span class="section-icon">' + s.icon + "</span>" +
      '<span class="section-label">' + esc(s.label) + "</span>" +
      '<span class="section-count">' + count + "</span>" +
      "</a>";
  }
  html += "</nav>";
  html += '<div class="section-links">' +
    '<a class="row-link" href="#/objectifs">🎯 Objectifs & réussite</a>' +
    '<a class="row-link" href="#/sport">🏋️ Entraînement — séances & minuteurs</a>' +
    '<a class="row-link" href="#/nutrition">🧮 Calculateur nutrition</a>' +
    '<a class="row-link" href="#/recherche">🔍 Recherche</a>' +
    '<a class="row-link" href="#/import">📥 Importer depuis Claude</a>' +
    '<a class="row-link" href="#/reglages">⚙️ Réglages, export et sauvegarde</a>' +
    "</div>";
  html += "</div>";
  return html;
}

// --------------------------------------------------------------- section

export function viewSection(key, subKey) {
  const sec = SECTION_MAP[key];
  if (!sec) return '<div class="view"><p class="empty">Rubrique inconnue.</p></div>';

  const all = state.items.filter((i) => i.section === key);
  let html = '<div class="view">';
  html += '<header class="view-head"><h1>' + esc(sec.icon + " " + sec.label) + "</h1></header>";

  if (key === "diete") {
    html += '<a class="callout" href="#/nutrition">' +
      "<strong>🧮 Calculateur calories · minéraux · vitamines</strong>" +
      "<span>Ouvrir →</span></a>";
  }
  if (key === "entrainement") {
    html += '<a class="callout" href="#/sport">' +
      "<strong>🏋️ Séances muscu · minuteurs course · routines guidées</strong>" +
      "<span>Ouvrir →</span></a>";
  }

  if (sec.subs.length) {
    const active = subKey || sec.subs[0].key;
    html += '<nav class="tabs">';
    for (const sub of sec.subs) {
      const n = all.filter((i) => i.sub === sub.key && !isDone(i)).length;
      html += '<a class="tab' + (sub.key === active ? " is-active" : "") + '" href="#/s/' + key + "/" + sub.key + '">' +
        esc(sub.label) + (n ? ' <span class="tab-count">' + n + "</span>" : "") + "</a>";
    }
    html += "</nav>";

    const items = all.filter((i) => i.sub === active);
    html += renderGrouped(items, { empty: "Rien dans cette sous-rubrique." });
    html += noteBlock(key + "/" + active);
  } else {
    html += renderGrouped(all, { empty: "Rien dans cette rubrique." });
    html += noteBlock(key);
  }

  html += "</div>";
  return html;
}

function noteBlock(noteKey) {
  const value = state.notes[noteKey] || "";
  return '<section class="note-block">' +
    "<h3>Note libre</h3>" +
    '<textarea class="note-input" data-note="' + esc(noteKey) + '" rows="3" ' +
      'placeholder="Tout ce qui ne rentre nulle part ailleurs…">' + esc(value) + "</textarea>" +
    "</section>";
}

// ------------------------------------------------------------ recherche

export function viewSearch(query) {
  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Recherche</h1></header>';
  html += '<input id="search-input" class="input input-lg" type="search" ' +
    'placeholder="Chercher dans tout le contenu…" value="' + esc(query || "") + '" autocomplete="off">';
  html += '<div id="search-results">' + renderSearchResults(query) + "</div>";
  html += "</div>";
  return html;
}

// Séparé de viewSearch : la frappe ne re-rend que cette zone, jamais le champ
// lui-même — sinon le curseur sauterait en fin de saisie à chaque caractère.
export function renderSearchResults(query) {
  const q = (query || "").trim().toLowerCase();
  if (q.length < 2) return '<p class="empty">Tape au moins deux caractères.</p>';

  const hits = state.items.filter(function (i) {
    return (i.title + " " + i.detail + " " + (i.warn || "") + " " + (i.group || ""))
      .toLowerCase().includes(q);
  });

  const noteHits = Object.entries(state.notes).filter(([, v]) => v.toLowerCase().includes(q));

  let html = '<p class="sub result-count">' + hits.length + (hits.length > 1 ? " résultats" : " résultat") + "</p>";

  const bySection = new Map();
  for (const i of hits) {
    if (!bySection.has(i.section)) bySection.set(i.section, []);
    bySection.get(i.section).push(i);
  }
  for (const [k, items] of bySection) {
    html += '<h3 class="group-title">' + esc(SECTION_MAP[k].icon + " " + SECTION_MAP[k].label) + "</h3>";
    html += renderList(items, {});
  }

  for (const [k, v] of noteHits) {
    html += '<h3 class="group-title">Note — ' + esc(k) + "</h3>";
    html += '<p class="note-preview">' + escLines(v) + "</p>";
  }

  if (!hits.length && !noteHits.length) html += '<p class="empty">Aucun résultat.</p>';
  return html;
}

// -------------------------------------------------------- suivi quotidien

export function viewDaily() {
  const k = dayKey();
  const today = state.daily[k] || {};
  const history = dailyHistory(30);

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>📈 Suivi quotidien</h1><p class="sub">' + esc(fmtDate(new Date())) + "</p></header>";

  html += '<section class="metrics">' +
    metricField("sommeil", "Heures de sommeil", today.sommeil, "0", "14", "0.5", "h") +
    metricField("fc", "FC au repos", today.fc, "30", "140", "1", "bpm") +
    metricField("energie", "Énergie ressentie", today.energie, "1", "5", "1", "/ 5") +
    "</section>";
  html += '<p class="hint">Trois champs, tous optionnels. Rien n\'est obligatoire.</p>';

  // Les notes rangées en rubrique « suivi » (import [suivi] sans clé=valeur,
  // ajout manuel…) vivent ici — sinon elles n'apparaîtraient nulle part.
  const suiviNotes = state.items.filter((i) => i.section === "suivi");
  if (suiviNotes.length) {
    html += '<div class="block-head"><h2>Notes de suivi</h2></div>';
    html += renderList(suiviNotes, {});
  }

  const cases = dueToday(k);
  if (cases.length) {
    html += '<div class="block-head"><h2>Cases du jour</h2><span class="counter">' +
      cases.filter((i) => isDone(i, k)).length + " / " + cases.length + "</span></div>";
    html += renderList(cases, {});
  }

  html += '<div class="block-head"><h2>30 derniers jours</h2></div>';
  html += sparkline(history, "sommeil", "Sommeil", "h", 0, 12);
  html += sparkline(history, "fc", "FC au repos", "bpm", 40, 100);
  html += sparkline(history, "energie", "Énergie", "/5", 1, 5);

  html += noteBlock("suivi");
  html += "</div>";
  return html;
}

function metricField(field, label, value, min, max, step, unit) {
  return '<label class="metric">' +
    '<span class="metric-label">' + esc(label) + "</span>" +
    '<span class="metric-input">' +
      '<input type="number" inputmode="decimal" data-metric="' + field + '" ' +
        'min="' + min + '" max="' + max + '" step="' + step + '" ' +
        'value="' + (value === undefined ? "" : esc(value)) + '" placeholder="—">' +
      '<span class="metric-unit">' + esc(unit) + "</span>" +
    "</span>" +
    "</label>";
}

// Une courbe par mesure : les échelles n'ont rien à voir entre elles,
// un axe partagé donnerait une lecture fausse.
function sparkline(history, field, label, unit, floor, ceil) {
  const points = history.map((h, idx) => ({ idx: idx, v: h.values[field], date: h.date }));
  const known = points.filter((p) => typeof p.v === "number");

  if (known.length < 2) {
    return '<div class="chart chart-empty"><span class="chart-label">' + esc(label) +
      '</span><span class="chart-note">Pas encore assez de données.</span></div>';
  }

  const values = known.map((p) => p.v);
  const lo = Math.min(floor, Math.floor(Math.min.apply(null, values)));
  const hi = Math.max(ceil, Math.ceil(Math.max.apply(null, values)));
  const span = hi - lo || 1;
  const W = 300, H = 64, PAD = 4;

  const x = (i) => PAD + (i / (history.length - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - lo) / span) * (H - PAD * 2);

  // Segments séparés : un jour sans valeur coupe la ligne au lieu de l'inventer.
  const segments = [];
  let current = [];
  for (const p of points) {
    if (typeof p.v === "number") current.push(x(p.idx).toFixed(1) + "," + y(p.v).toFixed(1));
    else if (current.length) { segments.push(current); current = []; }
  }
  if (current.length) segments.push(current);

  const paths = segments
    .filter((s) => s.length > 1)
    .map((s) => '<polyline points="' + s.join(" ") + '" />')
    .join("");
  const dots = segments.flat().map(function (pt) {
    const c = pt.split(",");
    return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="1.8" />';
  }).join("");

  const last = known[known.length - 1];

  return '<div class="chart">' +
    '<div class="chart-head">' +
      '<span class="chart-label">' + esc(label) + "</span>" +
      '<span class="chart-last">' + last.v + " " + esc(unit) + "</span>" +
    "</div>" +
    '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" ' +
      'aria-label="' + esc(label + " sur 30 jours, dernière valeur " + last.v + " " + unit) + '">' +
      paths + dots +
    "</svg>" +
    '<div class="chart-axis"><span>' + esc(fmtShort(history[0].date)) + "</span>" +
      "<span>" + lo + "–" + hi + " " + esc(unit) + "</span>" +
      "<span>" + esc(fmtShort(history[history.length - 1].date)) + "</span></div>" +
    "</div>";
}

// ------------------------------------------------------------- montage

// Écouteurs des champs de saisie, à rejouer après chaque rendu.
export function mount() {
  document.querySelectorAll("[data-fold]").forEach(function (box) {
    box.addEventListener("toggle", function () {
      if (!state.settings.folded) state.settings.folded = {};
      if (box.open) delete state.settings.folded[box.dataset.fold];
      else state.settings.folded[box.dataset.fold] = true;
      saveQuiet();
    });
  });

  const foldAll = document.querySelector('[data-act="fold-all"]');
  const unfoldAll = document.querySelector('[data-act="unfold-all"]');
  function setAll(open) {
    document.querySelectorAll("[data-fold]").forEach(function (box) { box.open = open; });
  }
  if (foldAll) foldAll.addEventListener("click", () => setAll(false));
  if (unfoldAll) unfoldAll.addEventListener("click", () => setAll(true));

  document.querySelectorAll("[data-metric]").forEach(function (input) {
    input.addEventListener("change", function () {
      const raw = input.value.trim();
      setDaily(dayKey(), input.dataset.metric, raw === "" ? "" : parseFloat(raw.replace(",", ".")));
    });
  });

  document.querySelectorAll("[data-note]").forEach(function (area) {
    let timer = null;
    area.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(() => setNote(area.dataset.note, area.value), 400);
    });
  });

  const search = document.getElementById("search-input");
  if (search) {
    const atEnd = search.value.length;
    search.focus();
    search.setSelectionRange(atEnd, atEnd);
    let timer = null;
    search.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        // replaceState garde l'URL partageable sans déclencher hashchange :
        // seul le bloc de résultats est re-rendu, le champ reste intact.
        history.replaceState(null, "", "#/recherche?q=" + encodeURIComponent(search.value));
        const host = document.getElementById("search-results");
        if (host) host.innerHTML = renderSearchResults(search.value);
      }, 200);
    });
  }
}
