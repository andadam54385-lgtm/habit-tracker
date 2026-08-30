// Point d'entrée : routage par hash, rendu, délégation d'événements.
// Toute la logique métier vit dans js/ ; ce fichier ne fait que brancher.

import { load, subscribe, toggle, setStatus, byId } from "./js/state.js";
import { el, toast } from "./js/ui.js";
import { openQuickAdd, openItem } from "./js/sheets.js";
import { applyTheme, scheduleReminders } from "./js/notify.js";
import {
  viewHome, viewToday, viewBlocked, viewSections, viewSection,
  viewSearch, viewDaily, mount
} from "./js/views.js";
import { viewImport, mountImport } from "./js/importview.js";
import { viewSettings, mountSettings } from "./js/settings.js";
import { viewNutrition, mountNutrition, bumpFood, removeLibre } from "./js/nutrition.js";
import { viewObjectives, mountObjectives, toggleObjective, removeObjective } from "./js/objectives.js";
import { MIGRATION_RESULT } from "./js/state.js";

const NAV = [
  { href: "#/", label: "Accueil", icon: "🏠", match: (r) => r.name === "home" },
  { href: "#/jour", label: "Jour", icon: "✅", match: (r) => r.name === "today" },
  { href: "#/nutrition", label: "Diète", icon: "🍽️", match: (r) => r.name === "nutrition" },
  { href: "#/bloque", label: "Bloqué", icon: "🔒", match: (r) => r.name === "blocked" },
  { href: "#/rubriques", label: "Rubriques", icon: "☰", match: (r) => ["sections", "section", "daily", "search", "import", "settings", "objectives"].includes(r.name) }
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
    case "nutrition": return { name: "nutrition", params };
    case "objectifs": return { name: "objectives", params };
    case "recherche": return { name: "search", params };
    case "import": return { name: "import", params };
    case "reglages": return { name: "settings", params };
    default: return { name: "home", params };
  }
}

let sharedPrefill = null;

function renderRoute(route) {
  switch (route.name) {
    case "today": return viewToday();
    case "blocked": return viewBlocked();
    case "sections": return viewSections();
    case "section": return viewSection(route.key, route.sub);
    case "daily": return viewDaily();
    case "nutrition": return viewNutrition();
    case "objectives": return viewObjectives(route.params.get("w") || 0);
    case "search": return viewSearch(route.params.get("q") || "");
    case "import": return viewImport();
    case "settings": return viewSettings();
    default: return viewHome();
  }
}

function render() {
  const route = parseRoute();
  const host = el("app");
  const scrollKey = route.name;

  host.innerHTML = renderRoute(route);

  if (route.name === "import") {
    mountImport(sharedPrefill);
    sharedPrefill = null;
  } else if (route.name === "settings") {
    mountSettings();
  } else if (route.name === "nutrition") {
    mountNutrition();
  } else if (route.name === "objectives") {
    mountObjectives();
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
  // On garde l'écouteur jusqu'à un vrai rendu : si le focus saute directement
  // d'un champ à un autre, on attend le focusout suivant au lieu d'abandonner
  // le rendu en route.
  document.addEventListener("focusout", function onOut() {
    setTimeout(function () {
      if (isEditing()) return;
      document.removeEventListener("focusout", onOut);
      renderQueued = false;
      render();
    }, 0);
  });
}

function isEditing() {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT");
}

// -------------------------------------------------------- délégation

function onClick(e) {
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

  const step = e.target.closest('[data-act="nut-plus"], [data-act="nut-minus"]');
  if (step) {
    bumpFood(step.dataset.food, step.dataset.act === "nut-plus" ? 1 : -1);
    return;
  }

  const libreDel = e.target.closest('[data-act="nut-del"]');
  if (libreDel) {
    removeLibre(parseInt(libreDel.dataset.idx, 10));
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
    if (li) toggle(li.dataset.id);
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

  const heroDone = e.target.closest('[data-act="hero-done"]');
  if (heroDone) {
    const hero = heroDone.closest("[data-id]");
    if (hero) {
      const item = byId(hero.dataset.id);
      toggle(hero.dataset.id);
      if (item) toast("« " + item.title + " » marqué fait");
    }
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

  // L'ancien worker OneSignal du tracker d'habitudes n'a plus lieu d'être.
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (reg) {
      const url = (reg.active && reg.active.scriptURL) || "";
      if (/OneSignalSDKWorker/i.test(url)) reg.unregister();
    });
  }).catch(function () { /* sans conséquence */ });
}

// Le partage système (Web Share Target) arrive en POST : le worker le range
// dans un cache, la page vient le chercher ici.
function collectSharedPayload() {
  if (!("caches" in window)) return Promise.resolve(null);
  return caches.open("suivi-share")
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
