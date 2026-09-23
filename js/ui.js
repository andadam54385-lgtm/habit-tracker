// Briques d'interface partagées : échappement, feuilles modales, toasts.

export function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Texte multi-ligne -> HTML, avec les retours conservés.
export function escLines(s) {
  return esc(s).replace(/\n/g, "<br>");
}

export function el(id) { return document.getElementById(id); }

export function fmtDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function fmtShort(d) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// ------------------------------------------------------------ toasts

let toastTimer = null;

export function toast(message, kind) {
  const host = el("toast");
  if (!host) return;
  host.textContent = message;
  host.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { host.className = "toast"; }, 3200);
}

// ------------------------------------------------ feuille modale (sheet)

let sheetCloser = null;

/**
 * Ouvre une feuille par le bas. `render` reçoit le conteneur et une fonction
 * de fermeture ; elle est responsable du contenu et de ses écouteurs.
 */
export function openSheet(title, render, options) {
  closeSheet();
  const opts = options || {};
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML =
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="sheet-head">' +
        '<h2>' + esc(title) + '</h2>' +
        '<button class="sheet-close" type="button" aria-label="Fermer">✕</button>' +
      '</div>' +
      '<div class="sheet-body"></div>' +
    '</div>';

  document.body.appendChild(backdrop);
  document.body.classList.add("no-scroll");

  const close = function () {
    if (!backdrop.parentNode) return;
    backdrop.classList.add("closing");
    document.body.classList.remove("no-scroll");
    setTimeout(() => { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 150);
    document.removeEventListener("keydown", onKey);
    sheetCloser = null;
    if (opts.onClose) opts.onClose();
  };

  function onKey(e) { if (e.key === "Escape") close(); }

  backdrop.querySelector(".sheet-close").addEventListener("click", close);
  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey);
  sheetCloser = close;

  render(backdrop.querySelector(".sheet-body"), close);

  // Laisse le navigateur peindre avant d'animer, sinon la transition saute.
  requestAnimationFrame(() => backdrop.classList.add("open"));
  return close;
}

export function closeSheet() {
  if (sheetCloser) sheetCloser();
}

// ------------------------------------------------------- confirmation

// ----------------------------------------------- glisser pour réordonner

// Un doigt sur la poignée .drag-handle d'un <li> déplace la ligne parmi ses
// sœurs dans la même <ul> ; au lâcher, `onDrop` reçoit l'ordre final des
// valeurs de l'attribut `idAttr` — à l'appelant de le persister. Le
// glisser-déposer HTML5 se prête mal au tactile ; les pointer events
// couvrent souris et doigt avec le même code.
export function initSortable(list, idAttr, onDrop) {
  if (!list) return;
  list.querySelectorAll(".drag-handle").forEach(function (handle) {
    handle.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      startDrag(e, list, handle, idAttr, onDrop);
    });
  });
}

function startDrag(e, list, handle, idAttr, onDrop) {
  const row = handle.closest("li");
  if (!row) return;
  e.preventDefault();
  row.classList.add("is-dragging");

  const pointerId = e.pointerId;
  const startY = e.clientY;
  // Centres de toutes les lignes gelés une fois pour toutes au début du
  // geste : comparer à des mesures qui bougent à chaque déplacement (une
  // ligne déjà réinsérée) ne fait avancer la ligne tirée que d'un cran par
  // évènement, ce qui la fait rater sa place sur un glissé rapide.
  const rows = Array.from(list.children);
  const others = rows.filter((r) => r !== row);
  const centers = rows.map(function (r) {
    const rc = r.getBoundingClientRect();
    return rc.top + rc.height / 2;
  });
  const startIndex = rows.indexOf(row);

  function onMove(ev) {
    if (ev.pointerId !== pointerId) return;
    const dy = ev.clientY - startY;
    row.style.transform = "translateY(" + dy + "px)";
    const center = centers[startIndex] + dy;

    // Combien des AUTRES lignes le centre courant a-t-il dépassées ? C'est
    // la place cible parmi elles — leur ordre entre elles ne bouge jamais,
    // seule la ligne tirée se déplace parmi elles.
    let target = 0;
    for (let i = 0; i < rows.length; i++) {
      if (i !== startIndex && center > centers[i]) target++;
    }
    target = Math.max(0, Math.min(others.length, target));

    const anchor = others[target] || null;
    if (row.nextSibling !== anchor) list.insertBefore(row, anchor);
  }

  // Écouteurs posés sur document, pas sur la poignée : une capture de
  // pointeur qui ne « prend » pas (vu en pratique avec certains pilotes
  // tactiles/automatisations) laisserait sinon la ligne bloquée à mi-glisser,
  // avec sa transformation jamais nettoyée et rien de persisté.
  function finish(ev) {
    if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    row.classList.remove("is-dragging");
    row.style.transform = "";
    onDrop(Array.from(list.children).map((li) => li.getAttribute(idAttr)).filter(Boolean));
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
}

export function confirmSheet(title, message, confirmLabel, onConfirm) {
  openSheet(title, function (body, close) {
    body.innerHTML =
      '<p class="sheet-text">' + escLines(message) + '</p>' +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="cancel">Annuler</button>' +
        '<button type="button" class="btn btn-danger" data-act="ok">' + esc(confirmLabel) + '</button>' +
      '</div>';
    body.querySelector('[data-act="cancel"]').addEventListener("click", close);
    body.querySelector('[data-act="ok"]').addEventListener("click", function () {
      close();
      onConfirm();
    });
  });
}
