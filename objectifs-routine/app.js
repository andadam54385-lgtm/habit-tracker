// Point d'entrée : routage par hash, rendu, délégation d'événements.
// Toute la logique métier vit dans js/ ; ce fichier ne fait que brancher.
// App "Objectifs & Routine" — scindée de "Suivi personnel" le 2026-09-24.

import { load, subscribe, toggle, setStatus, byId } from "./js/state.js";
import { el, toast } from "./js/ui.js";
import { openQuickAdd, openItem, openHowto } from "./js/sheets.js";
import { applyTheme, scheduleReminders } from "./js/notify.js";
import {
  viewToday, viewBlocked, viewSections, viewSection,
  viewSearch, viewDaily, mount
} from "./js/views.js";
import { viewImport, mountImport } from "./js/importview.js";
import { viewSettings, mountSettings } from "./js/settings.js";
import {
  viewRoutine, mountRoutine, openRoutine, openWorkout, confirmDeleteWorkout
} from "./js/routineview.js";
import { state, save } from "./js/state.js";
import { viewObjectives, mountObjectives, toggleObjective, removeObjective, openObjectiveEdit } from "./js/objectives.js";
import { openCheckin, openJournal, viewBilan, bilanMarkdown } from "./js/formeview.js";
import { MIGRATION_RESULT } from "./js/state.js";

const NAV = [
  { href: "#/", label: "Accueil", icon: "🏠", match: (r) => ["home", "sections", "section", "daily", "search", "import", "settings", "objectives", "bilan"].includes(r.name) },
  { href: "#/jour", label: "Jour", icon: "✅", match: (r) => r.name === "today" },
  { href: "#/routine", label: "Routine", icon: "🧘", match: (r) => r.name === "routine" },
  { href: "#/bloque", label: "Bloqué", icon: "🔒", match: (r) => r.name === "blocked" }
];

// ------------------------------------------------------------- routage

function parseRoute() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query || "");
  const parts = path.split("/").filter(Boolean);

  if (!parts.length) return { name: "home", params };
  switch (parts[0]) {
    case "jour": return { name: "today", params };
    case "bloque": return { name: "blocked", params };
    case "rubriques": return { name: "sections", params };
    case "s": return { name: "section", key: parts[1], sub: parts[2], params };
    case "suivi": return { name: "daily", params };
    case "routine": return { name: "routine", params };
    case "objectifs": return { name: "objectives", params };
    case "bilan": return { name: "bilan", params };
    case "recherche": return { name: "search", params };
    case "import": return { name: "import", params };
    case "reglages": return { name: "settings", params };
    default: return { name: "home", params };
  }
}

let sharedPrefill = null;

function renderRoute(route) {
  switch (route.name) {
    case "today": return viewToday(route.params.get("d"));
    case "blocked": return viewBlocked();
    case "sections": return viewSections();
    case "section": return viewSection(route.key, route.sub);
    case "daily": return viewDaily();
    case "routine": return viewRoutine(route.params.get("d"));
    case "objectives": return viewObjectives(route.params.get("w") || 0);
    case "bilan": return viewBilan(route.params.get("w") || 0);
    case "search": return viewSearch(route.params.get("q") || "");
    case "import": return viewImport();
    case "settings": return viewSettings();
    default: return viewSections();
  }
}

function render() {
  const route = parseRoute();
  const host = el("app");
  const scrollKey = route.name;

  host.innerHTML = renderRoute(route);

  if (route.name === "import") {
    // Un Raccourci iOS peut ouvrir #/import?t=… avec le relevé du matin.
    mountImport(sharedPrefill || route.params.get("t") || null);
    sharedPrefill = null;
  } else if (route.name === "settings") {
    mountSettings();
  } else if (route.name === "objectives") {
    mountObjectives();
  } else if (route.name === "routine") {
    mountRoutine();
  } else {
    mount();
  }

  document.querySelectorAll(".nav-item").forEach(function (a) {
    const spec = NAV.find((n) => n.href === a.getAttribute("href"));
    a.classList.toggle("is-active", !!(spec && spec.match(route)));
  });

  if (lastRoute !== scrollKey) window.scrollTo(0, 0);
  lastRoute = scrollKey;
}

let lastRoute = null;

// Un rendu pendant la saisie ferait perdre le focus et le curseur.
let renderQueued = false;

function scheduleRender() {
  if (!isEditing()) { render(); return; }
  if (renderQueued) return;
  renderQueued = true;

  let poll = null;
  function flush() {
    if (isEditing()) return false;
    document.removeEventListener("focusout", onOut);
    clearInterval(poll);
    renderQueued = false;
    render();
    return true;
  }
  // On garde l'écouteur jusqu'à un vrai rendu : si le focus saute directement
  // d'un champ à un autre, on attend le focusout suivant au lieu d'abandonner
  // le rendu en route.
  function onOut() { setTimeout(flush, 0); }
  document.addEventListener("focusout", onOut);
  // Filet : une feuille fermée alors qu'un champ avait le focus ne produit
  // pas toujours de focusout — sans ce contrôle, la vue resterait périmée.
  poll = setInterval(flush, 300);
}

function isEditing() {
  const a = document.activeElement;
  // Un champ détaché du document (feuille fermée) ne bloque plus le rendu.
  return !!a && document.contains(a) &&
    (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT");
}

// -------------------------------------------------------- délégation

function onClick(e) {
  // ---- forme : check-in, journal, bilan
  const formeAct = e.target.closest('[data-act="open-checkin"], [data-act="open-journal"], [data-act="copy-bilan"]');
  if (formeAct) {
    const act = formeAct.dataset.act;
    if (act === "copy-bilan") {
      const md = bilanMarkdown(formeAct.dataset.w || 0);
      const done = () => toast("Bilan copié — colle-le dans Claude");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(md).then(done, () => fallbackCopy(md, done));
      else fallbackCopy(md, done);
      return;
    }
    if (act === "open-checkin") openCheckin();
    else if (act === "open-journal") openJournal();
    return;
  }

  // ---- routine
  const routineAct = e.target.closest('[data-act="start-routine"], [data-act="open-workout"], [data-act="del-workout"]');
  if (routineAct) {
    const act = routineAct.dataset.act;
    if (act === "start-routine") openRoutine(routineAct.dataset.routine, routineAct.dataset.day);
    else if (act === "open-workout") openWorkout(routineAct.dataset.workout);
    else if (act === "del-workout") confirmDeleteWorkout(routineAct.dataset.workout);
    return;
  }

  const objToggle = e.target.closest('[data-act="obj-toggle"]');
  if (objToggle) {
    toggleObjective(objToggle.dataset.scope, objToggle.dataset.period, objToggle.dataset.obj);
    return;
  }

  const objDel = e.target.closest('[data-act="obj-del"]');
  if (objDel) {
    removeObjective(objDel.dataset.scope, objDel.dataset.period, objDel.dataset.obj);
    return;
  }

  const objEdit = e.target.closest('[data-act="obj-edit"]');
  if (objEdit) {
    openObjectiveEdit(objEdit.dataset.scope, objEdit.dataset.period, objEdit.dataset.obj);
    return;
  }

  const howtoBadge = e.target.closest('[data-act="howto"]');
  if (howtoBadge) {
    e.preventDefault();
    e.stopPropagation();
    openHowto(howtoBadge.dataset.target);
    return;
  }

  const blockerBadge = e.target.closest('[data-act="goto-blocker"]');
  if (blockerBadge) {
    e.preventDefault();
    e.stopPropagation();
    openItem(blockerBadge.dataset.blocker);
    return;
  }

  const toggleBtn = e.target.closest('[data-act="toggle"]');
  if (toggleBtn) {
    const li = toggleBtn.closest("[data-id]");
    // data-day porte le jour affiché : coché depuis un jour passé, la case
    // se coche ce jour-là, pas aujourd'hui.
    if (li) toggle(li.dataset.id, li.dataset.day || undefined);
    return;
  }

  const openBtn = e.target.closest('[data-act="open"]');
  if (openBtn) {
    const li = openBtn.closest("[data-id]");
    if (li) openItem(li.dataset.id);
    return;
  }

  const openTarget = e.target.closest('[data-act="open-item"]');
  if (openTarget) {
    openItem(openTarget.dataset.target);
    return;
  }

  const unblock = e.target.closest('[data-act="unblock"]');
  if (unblock) {
    const item = byId(unblock.dataset.target);
    setStatus(unblock.dataset.target, "done");
    if (item) toast("« " + item.title + " » fait — ce qui en dépendait est débloqué");
    return;
  }
}

function onKeydown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const openBtn = e.target.closest && e.target.closest('[data-act="open"]');
  if (!openBtn) return;
  e.preventDefault();
  const li = openBtn.closest("[data-id]");
  if (li) openItem(li.dataset.id);
}

// ------------------------------------------- service worker & partage

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("sw.js").catch(function (err) {
    console.warn("Service worker non enregistré", err);
  });
}

// Le partage système (Web Share Target) arrive en POST : le worker le range
// dans un cache, la page vient le chercher ici.
function collectSharedPayload() {
  if (!("caches" in window)) return Promise.resolve(null);
  return caches.open("objectifs-routine-share")
    .then(function (cache) {
      return cache.match("shared-payload").then(function (res) {
        if (!res) return null;
        return res.text().then(function (text) {
          return cache.delete("shared-payload").then(() => text);
        });
      });
    })
    .catch(() => null);
}

// ------------------------------------------------------------ démarrage

function boot() {
  load();

  applyTheme();
  scheduleReminders();

  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("hashchange", render);
  subscribe(scheduleRender);

  el("fab").addEventListener("click", function () { openQuickAdd(); });

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", applyTheme);

  render();

  if (MIGRATION_RESULT.done) {
    const bits = [];
    if (MIGRATION_RESULT.habits) bits.push(MIGRATION_RESULT.habits + " habitude" + (MIGRATION_RESULT.habits > 1 ? "s" : ""));
    if (MIGRATION_RESULT.objectives) bits.push(MIGRATION_RESULT.objectives + " objectif" + (MIGRATION_RESULT.objectives > 1 ? "s" : ""));
    toast("Récupéré de l'ancienne app : " + bits.join(" et "));
  }

  collectSharedPayload().then(function (text) {
    if (!text) return;
    sharedPrefill = text;
    // Déjà sur l'import : rendu direct. Sinon on change juste le hash et on
    // laisse hashchange déclencher l'UNIQUE rendu — un render() explicite en
    // plus consommerait le pré-remplissage puis le second rendu l'effacerait.
    if (parseRoute().name === "import") render();
    else location.hash = "#/import";
  });

  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "-1000px";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) { toast("Copie impossible", "error"); }
  document.body.removeChild(ta);
}
