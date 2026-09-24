// Point d'entrée : routage par hash, rendu, délégation d'événements.
// Toute la logique métier vit dans js/ ; ce fichier ne fait que brancher.
// App "Diète & Sport" — scindée de "Suivi personnel" le 2026-09-24.

import { load, subscribe, toggle, setStatus, byId } from "./js/state.js";
import { el, toast } from "./js/ui.js";
import { openQuickAdd, openItem, openHowto } from "./js/sheets.js";
import { applyTheme, scheduleReminders } from "./js/notify.js";
import {
  viewToday, viewSections, viewSection,
  viewSearch, mount
} from "./js/views.js";
import { viewImport, mountImport } from "./js/importview.js";
import { viewSettings, mountSettings } from "./js/settings.js";
import {
  viewNutrition, mountNutrition, openFoodSearch, openQuantity,
  openTargets, openSupplements, openLibre, openGapFiller
} from "./js/nutritionview.js";
import { viewRecipes, mountRecipes, openRecipeEditor, openRecipePercent } from "./js/recipes.js";
import {
  viewSport, mountSport, openMuscuSession, openIntervalTimer, openRunForm,
  openWorkout, openExerciseHistory, confirmDeleteWorkout,
  openTemplateEditor, confirmDeleteTemplate, changeTemplateSort, restoreHiddenTemplates,
  openCircuitEditor, openCircuitRun, openActivityForm
} from "./js/sportview.js";
import { addRecipeParts, upsertRecipe, recipeById } from "./js/nutrition.js";
import { SEED_RECIPES } from "./js/seedrecipes.js";
import {
  removeLibre, addQuantity, addSupplementUnits, foodById,
  SEED_SUPPLEMENTS, migrateNutritionLogs, upsertSupplement
} from "./js/nutrition.js";
import { state, save } from "./js/state.js";
import { viewCorps, mountCorps, openWeighIn, openMeasure, setPhotoKind, pickPhoto, confirmDeletePhoto } from "./js/corpsview.js";
import { moveTemplate } from "./js/sport.js";
import { setVolumeMetric } from "./js/charge.js";
import { MIGRATION_RESULT } from "./js/state.js";

const NAV = [
  { href: "#/", label: "Accueil", icon: "🏠", match: (r) => ["home", "sections", "section", "search", "import", "settings", "corps"].includes(r.name) },
  { href: "#/jour", label: "Jour", icon: "✅", match: (r) => r.name === "today" },
  { href: "#/nutrition", label: "Diète", icon: "🍽️", match: (r) => r.name === "nutrition" || r.name === "recipes" },
  { href: "#/sport", label: "Sport", icon: "🏋️", match: (r) => r.name === "sport" }
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
    case "rubriques": return { name: "sections", params };
    case "s": return { name: "section", key: parts[1], sub: parts[2], params };
    case "nutrition": return { name: "nutrition", params };
    case "corps": return { name: "corps", params };
    case "recettes": return { name: "recipes", params };
    case "sport": return { name: "sport", params };
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
    case "sections": return viewSections();
    case "section": return viewSection(route.key, route.sub);
    case "nutrition": return viewNutrition(route.params.get("d"));
    case "corps": return viewCorps();
    case "recipes": return viewRecipes();
    case "sport": return viewSport(route.params.get("t") || "muscu", route.params.get("d"));
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
  } else if (route.name === "nutrition") {
    mountNutrition();
    mount();   // persistance des blocs repliables (Cibles du jour / semaine)
  } else if (route.name === "recipes") {
    mountRecipes();
  } else if (route.name === "corps") {
    mountCorps();
  } else if (route.name === "sport") {
    mountSport();
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
  // ---- corps : pesée, mensurations, photos
  const corpsAct = e.target.closest('[data-act="weigh-in"], [data-act="measure"], [data-act="ph-kind"], [data-act="ph-add"], [data-act="ph-del"]');
  if (corpsAct) {
    const act = corpsAct.dataset.act;
    if (act === "weigh-in") { openWeighIn(); return; }
    if (act === "measure") { openMeasure(corpsAct.dataset.field); return; }
    if (act === "ph-kind") { setPhotoKind(corpsAct.dataset.kind); return; }
    if (act === "ph-add") { pickPhoto(); return; }
    if (act === "ph-del") { confirmDeletePhoto(corpsAct.dataset.photo); return; }
    return;
  }

  // ---- entraînement
  const sportAct = e.target.closest('[data-act="start-muscu"], [data-act="start-run"], [data-act="log-run"],' +
    '[data-act="log-activity"], [data-act="open-workout"], [data-act="del-workout"], [data-act="open-exercise"],' +
    '[data-act="new-template"], [data-act="edit-template"], [data-act="del-template"],' +
    '[data-act="tpl-sort"], [data-act="unhide-templates"], [data-act="tpl-move-up"], [data-act="tpl-move-down"],' +
    '[data-act="start-circuit"], [data-act="new-circuit"], [data-act="edit-circuit"]');
  if (sportAct) {
    const act = sportAct.dataset.act;
    if (act === "new-template") { openTemplateEditor(null); return; }
    if (act === "new-circuit") { openCircuitEditor(null); return; }
    if (act === "edit-circuit") { openCircuitEditor(sportAct.dataset.template); return; }
    if (act === "start-circuit") { openCircuitRun(sportAct.dataset.template, sportAct.dataset.day); return; }
    if (act === "edit-template") { openTemplateEditor(sportAct.dataset.template); return; }
    if (act === "del-template") { confirmDeleteTemplate(sportAct.dataset.template); return; }
    if (act === "tpl-sort") { changeTemplateSort(sportAct.dataset.sort); return; }
    if (act === "tpl-move-up" || act === "tpl-move-down") {
      moveTemplate(sportAct.dataset.template, act === "tpl-move-up" ? -1 : 1);
      return;
    }
    if (act === "unhide-templates") { restoreHiddenTemplates(); return; }
    if (act === "start-muscu") openMuscuSession(sportAct.dataset.template, false, sportAct.dataset.day);
    else if (act === "start-run") openIntervalTimer(sportAct.dataset.preset, sportAct.dataset.day);
    else if (act === "log-run") openRunForm({ mode: "liss" }, sportAct.dataset.day);
    else if (act === "log-activity") openActivityForm(sportAct.dataset.day);
    else if (act === "open-workout") openWorkout(sportAct.dataset.workout);
    else if (act === "del-workout") confirmDeleteWorkout(sportAct.dataset.workout);
    else if (act === "open-exercise") openExerciseHistory(sportAct.dataset.ex);
    return;
  }

  // ---- diète
  const nutAct = e.target.closest('[data-act^="qty-"], [data-act^="sup-"], [data-act^="rec-"], [data-act="edit-qty"],' +
    '[data-act="open-search"], [data-act="edit-targets"], [data-act="manage-supps"], [data-act="add-libre"],' +
    '[data-act="fill-gap"], [data-act="new-recipe"], [data-act="edit-recipe"]');
  if (nutAct) {
    const act = nutAct.dataset.act;
    const day = nutAct.dataset.day || undefined;
    if (act === "fill-gap") { openGapFiller(nutAct.dataset.nut, nutAct.dataset.period, day); return; }
    if (act === "new-recipe") { openRecipeEditor(null); return; }
    if (act === "edit-recipe") { openRecipeEditor(nutAct.dataset.recipe); return; }
    if (act === "rec-pct") { openRecipePercent(nutAct.dataset.recipe, day); return; }
    if (act === "rec-plus" || act === "rec-minus") {
      addRecipeParts(nutAct.dataset.recipe, act === "rec-plus" ? 1 : -1, day);
      return;
    }
    if (act === "open-search") { openFoodSearch(day); return; }
    if (act === "edit-targets") { openTargets(); return; }
    if (act === "manage-supps") { openSupplements(); return; }
    if (act === "add-libre") { openLibre(day); return; }
    if (act === "edit-qty") { openQuantity(nutAct.dataset.food, day); return; }
    if (act === "qty-plus" || act === "qty-minus") {
      const f = foodById(nutAct.dataset.food);
      if (f) addQuantity(f.id, act === "qty-plus" ? f.step : -f.step, day);
      return;
    }
    if (act === "sup-plus" || act === "sup-minus") {
      addSupplementUnits(nutAct.dataset.sup, act === "sup-plus" ? 1 : -1, day);
      return;
    }
  }

  const libreDel = e.target.closest('[data-act="nut-del"]');
  if (libreDel) {
    removeLibre(parseInt(libreDel.dataset.idx, 10), libreDel.dataset.day || undefined);
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
  return caches.open("diete-sport-share")
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

  // Journaux nutrition de l'ancien modèle « portions » -> quantités réelles.
  if (migrateNutritionLogs() > 0) save();

  // Compléments de départ, une seule fois : ensuite ils t'appartiennent.
  if (!state.seededSupplements) {
    state.seededSupplements = true;
    if (!state.supplements.length) SEED_SUPPLEMENTS.forEach((s) => upsertSupplement(s));
    save();
  }

  // Recettes construites avec Claude les 21-22 sept. 2026 : pâtisseries,
  // pâte à tartiner maison, pad thaï, sauces. Injectées UNE fois, puis
  // elles t'appartiennent — l'app ne les réécrit jamais, les grammages
  // bougent avec les tests en cuisine.
  if (!state.seededPatisseries) {
    state.seededPatisseries = true;
    let added = 0;
    for (const r of SEED_RECIPES) {
      if (recipeById(r.id)) continue;
      upsertRecipe(r);
      added++;
    }
    if (added) console.info("Recettes : " + added + " ajoutée(s).");
    save();
  }

  // Les recettes avaient été semées sans préparation écrite. On pose les notes
  // une fois, et seulement sur celles qui n'en ont pas : si tu as déjà écrit la
  // tienne, elle est prioritaire et rien ne l'écrase.
  if (!state.seededRecipeNotes) {
    state.seededRecipeNotes = true;
    let filled = 0;
    for (const seed of SEED_RECIPES) {
      const mine = recipeById(seed.id);
      if (mine && !mine.notes && seed.notes) { mine.notes = seed.notes; filled++; }
    }
    if (filled) console.info("Recettes : préparation ajoutée sur " + filled + ".");
    save();
  }

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
