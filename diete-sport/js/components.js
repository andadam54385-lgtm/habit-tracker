// Rendu d'un item. Tout passe par de la délégation d'événements :
// le balisage porte data-id / data-act, les vues n'attachent rien par ligne.

import { esc, escLines } from "./ui.js";
import { SECTION_MAP } from "./seed.js";
import { hasHowto } from "./howto.js";
import { state, isDone, isRecurring, weekProgress, rootBlocker, dayKey, weekDayKeys, weekStart } from "./state.js";

// Série en cours pour une habitude récurrente — repris de forme.js (App
// "Objectifs & Routine" seulement) : cette app n'a pas ce module, mais le
// badge 🔥 de renderItem() en a besoin, donc la logique est dupliquée ici.
function prevKey(k, n) {
  const d = new Date(k + "T12:00:00");
  d.setDate(d.getDate() - (n || 1));
  return dayKey(d);
}

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

const STATE_LABEL = {
  todo: "à faire",
  doing: "en cours",
  blocked: "bloqué",
  done: "fait",
  optional: "optionnel",
  rejected: "écarté",
  queue: "en attente"
};

function itemClasses(item, key) {
  const cls = ["item", "kind-" + item.kind];
  const done = isDone(item, key);
  if (done) cls.push("is-done");
  const blocker = rootBlocker(item);
  if (blocker && !done) cls.push("is-blocked");
  if (item.status === "doing" && !done) cls.push("is-doing");
  if (item.status === "rejected") cls.push("is-rejected");
  if (item.status === "queue") cls.push("is-queue");
  if (item.status === "optional") cls.push("is-optional");
  if (item.priority === "critical" && !done) cls.push("is-critical");
  return cls.join(" ");
}

function checkable(item) {
  return item.kind !== "info" && item.status !== "rejected" && item.status !== "queue";
}

export function renderItem(item, opts) {
  const o = opts || {};
  const key = o.dayKey || dayKey();
  const done = isDone(item, key);
  const blocker = rootBlocker(item);
  const badges = [];

  if (isRecurring(item)) {
    // En consultant un autre jour, le badge doit compter la semaine de CE
    // jour-là, pas la semaine réelle en cours — sinon le chiffre affiché
    // pour un jeudi passé mélangerait deux semaines différentes.
    const p = weekProgress(item, o.weekRef);
    const cls = p.done >= p.target ? "badge badge-ok" : "badge";
    badges.push('<span class="' + cls + '">' + p.done + " sur " + p.target + " cette semaine</span>");
    // Série en cours : visible, c'est ce qui donne envie de ne pas la casser.
    const st = streakFor(item);
    if (st && st.current >= 2) {
      badges.push('<span class="badge badge-streak">🔥 ' + st.current + (st.unit === "jour" ? " j" : " sem") + "</span>");
    }
  }

  // Dans la vue Bloqué, le bloqueur est déjà le titre du groupe : le
  // répéter sur chaque ligne noyait l'information au lieu de la donner.
  if (blocker && !done && !o.hideBlocker) {
    badges.push('<span class="badge badge-blocked" data-act="goto-blocker" data-blocker="' +
      esc(blocker.id) + '">🔒 ' + esc(blocker.title) + "</span>");
  } else if (!done && item.status !== "todo" && STATE_LABEL[item.status] &&
             !(o.hideBlocker && item.status === "blocked")) {
    badges.push('<span class="badge badge-' + esc(item.status) + '">' + STATE_LABEL[item.status] + "</span>");
  }

  if (item.priority === "critical" && !done) {
    badges.push('<span class="badge badge-critical">prioritaire</span>');
  }

  if (item.source === "claude" || item.source === "partage" || item.source === "fichier") {
    badges.push('<span class="badge badge-src">importé depuis Claude</span>');
  }

  if (hasHowto(item.id)) {
    badges.push('<span class="badge badge-howto" data-act="howto" data-target="' +
      esc(item.id) + '">📖 Comment faire</span>');
  }

  if (o.showSectionName && SECTION_MAP[item.section]) {
    const sec = SECTION_MAP[item.section];
    badges.push('<span class="badge badge-quiet">' + esc(sec.icon + " " + sec.short) + "</span>");
  }

  const box = checkable(item)
    ? '<button class="check" type="button" data-act="toggle" role="checkbox" aria-checked="' +
      (done ? "true" : "false") + '" aria-label="' + esc(item.title) + '"></button>'
    : '<span class="check check-static" aria-hidden="true"></span>';

  // Réordonner : seulement là où l'appelant le demande (parcourir une
  // rubrique), jamais sur Jour où la liste change de contenu chaque jour.
  const reorder = o.reorder
    ? '<span class="drag-handle" aria-hidden="true" title="Glisser pour réordonner">⠿</span>'
    : "";

  return '' +
    // data-day porte la date affichée : c'est elle que le clic sur la case
    // doit cocher, pas la date du jour réel.
    '<li class="' + itemClasses(item, key) + '" data-id="' + esc(item.id) + '" data-day="' + esc(key) + '">' +
      box +
      '<div class="item-main" data-act="open" role="button" tabindex="0">' +
        '<div class="item-title">' + esc(item.title) + "</div>" +
        (item.detail ? '<div class="item-detail">' + escLines(item.detail) + "</div>" : "") +
        (item.warn ? '<div class="item-warn">⚠️ ' + escLines(item.warn) + "</div>" : "") +
        (badges.length ? '<div class="item-badges">' + badges.join("") + "</div>" : "") +
      "</div>" +
      reorder +
    "</li>";
}

export function renderList(items, opts) {
  if (!items.length) {
    return '<p class="empty">' + esc((opts && opts.empty) || "Rien ici.") + "</p>";
  }
  return '<ul class="items">' + items.map((i) => renderItem(i, opts)).join("") + "</ul>";
}

// Regroupe par le champ `group` en conservant l'ordre d'apparition.
export function renderGrouped(items, opts) {
  if (!items.length) {
    return '<p class="empty">' + esc((opts && opts.empty) || "Rien ici.") + "</p>";
  }
  const o = opts || {};
  const groups = new Map();
  for (const i of items) {
    const g = i.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  let html = "";
  for (const [group, list] of groups) {
    if (group) html += '<h3 class="group-title">' + esc(group) + "</h3>";
    html += '<ul class="items">' + list.map((i) => renderItem(i, o)).join("") + "</ul>";
  }
  return html;
}
