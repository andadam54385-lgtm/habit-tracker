// Rendu d'un item. Tout passe par de la délégation d'événements :
// le balisage porte data-id / data-act, les vues n'attachent rien par ligne.

import { esc, escLines } from "./ui.js";
import { SECTION_MAP } from "./seed.js";
import { hasHowto } from "./howto.js";
import { isDone, isRecurring, weekProgress, rootBlocker, dayKey } from "./state.js";

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
    const p = weekProgress(item);
    const cls = p.done >= p.target ? "badge badge-ok" : "badge";
    badges.push('<span class="' + cls + '">' + p.done + " sur " + p.target + " cette semaine</span>");
  }

  if (blocker && !done) {
    badges.push('<span class="badge badge-blocked" data-act="goto-blocker" data-blocker="' +
      esc(blocker.id) + '">🔒 ' + esc(blocker.title) + "</span>");
  } else if (!done && item.status !== "todo" && STATE_LABEL[item.status]) {
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

  return '' +
    '<li class="' + itemClasses(item, key) + '" data-id="' + esc(item.id) + '">' +
      box +
      '<div class="item-main" data-act="open" role="button" tabindex="0">' +
        '<div class="item-title">' + esc(item.title) + "</div>" +
        (item.detail ? '<div class="item-detail">' + escLines(item.detail) + "</div>" : "") +
        (item.warn ? '<div class="item-warn">⚠️ ' + escLines(item.warn) + "</div>" : "") +
        (badges.length ? '<div class="item-badges">' + badges.join("") + "</div>" : "") +
      "</div>" +
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
  const groups = new Map();
  for (const i of items) {
    const g = i.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  let html = "";
  for (const [group, list] of groups) {
    if (group) html += '<h3 class="group-title">' + esc(group) + "</h3>";
    html += '<ul class="items">' + list.map((i) => renderItem(i, opts)).join("") + "</ul>";
  }
  return html;
}
