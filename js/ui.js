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
