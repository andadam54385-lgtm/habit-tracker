// Réglages : thème, export Markdown, sauvegarde JSON.

import { esc, toast, confirmSheet } from "./ui.js";
import { state, save, replaceAll } from "./state.js";
import { exportMarkdown, exportJSON, importJSON, download, stamp } from "./io.js";
import { applyTheme } from "./notify.js";
import { migrateNutritionLogs } from "./nutrition.js";

// Actions ponctuelles encore à faire : une tâche sans récurrence, ni terminée,
// ni déjà en file. C'est ce que le ménage propose de ranger.
function oneShots() {
  return (state.items || []).filter(function (i) {
    return i.kind === "task" && !i.recurrence && !i.keep &&
      i.status !== "done" && i.status !== "queue" && i.status !== "rejected";
  });
}

function pendingOneShots() { return oneShots().length; }

export function viewSettings() {
  const s = state.settings;
  const itemCount = state.items.length;
  const dayCount = Object.keys(state.daily).length;

  return '<div class="view">' +
    '<header class="view-head"><h1>Réglages</h1></header>' +

    '<section class="panel">' +
      "<h2>Thème</h2>" +
      '<div class="chips" id="set-theme">' +
        ["auto", "clair", "sombre"].map(function (t) {
          return '<button type="button" class="chip' + (s.theme === t ? " is-active" : "") +
            '" data-theme="' + t + '">' + esc(t[0].toUpperCase() + t.slice(1)) + "</button>";
        }).join("") +
      "</div>" +
    "</section>" +

    '<section class="panel">' +
      "<h2>Faire le ménage</h2>" +
      '<p class="hint">' + pendingOneShots() + ' action' + (pendingOneShots() > 1 ? 's' : '') +
        ' ponctuelle' + (pendingOneShots() > 1 ? 's' : '') + ' encore en attente. ' +
        "Les mettre en file d'attente les sort des listes du jour sans les effacer — " +
        "elles restent consultables et se réactivent une par une.</p>" +
      '<button type="button" class="btn btn-block btn-ghost" data-act="purge-ponctuelles">' +
        "Mettre les actions ponctuelles en file d'attente</button>" +
      "<p class=\"hint\">Les habitudes récurrentes et les fiches d'info ne sont pas touchées.</p>" +
    "</section>" +

    '<section class="panel">' +
      "<h2>Export</h2>" +
      '<p class="hint">' + itemCount + " élément" + (itemCount > 1 ? "s" : "") +
        " · " + dayCount + " jour" + (dayCount > 1 ? "s" : "") + " de suivi.</p>" +
      '<button type="button" class="btn btn-block" data-act="export-md">Exporter en Markdown (Obsidian)</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="copy-md">Copier le Markdown</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="export-json">Sauvegarde JSON</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="copy-json">Copier le JSON</button>' +
      '<p class="hint">Les photos de suivi ne sont dans aucun export : elles pèsent trop lourd et ne servent qu\'à l\'œil. ' +
        "Elles restent sur cet appareil, et se suppriment une par une dans Corps.</p>" +
    "</section>" +

    '<section class="panel">' +
      "<h2>Restaurer</h2>" +
      '<p class="hint">Remplace intégralement les données actuelles par le contenu du fichier.</p>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="import-json">Restaurer depuis un JSON</button>' +
      '<input type="file" id="set-json-file" accept=".json" hidden>' +
      '<button type="button" class="btn btn-block btn-danger-ghost" data-act="reset">Tout effacer</button>' +
    "</section>" +

    '<p class="version">Diète & Sport <span id="app-version"></span><br>' +
      "Données stockées uniquement sur cet appareil.</p>" +
    "</div>";
}

export function mountSettings() {
  // Pas de numéro dupliqué à maintenir en JS : on lit le nom du cache
  // actif, que le service worker nomme déjà d'après sa propre VERSION.
  const verEl = document.getElementById("app-version");
  if (verEl && typeof caches !== "undefined") {
    caches.keys().then(function (keys) {
      const v = keys.find((k) => /^diete-sport-v\d+$/.test(k));
      verEl.textContent = v ? "· " + v.replace("diete-sport-", "") : "";
    }).catch(function () { /* pas de service worker actif ici */ });
  }

  const themeBox = document.getElementById("set-theme");
  themeBox.addEventListener("click", function (e) {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.settings.theme = chip.dataset.theme;
    save();
    applyTheme();
    themeBox.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  });

  document.querySelector('[data-act="export-md"]').addEventListener("click", function () {
    download("diete-sport-" + stamp() + ".md", exportMarkdown(), "text/markdown");
    toast("Markdown exporté");
  });

  document.querySelector('[data-act="copy-md"]').addEventListener("click", function () {
    navigator.clipboard.writeText(exportMarkdown())
      .then(() => toast("Markdown copié"))
      .catch(() => toast("Copie impossible", "error"));
  });

  document.querySelector('[data-act="export-json"]').addEventListener("click", function () {
    download("diete-sport-" + stamp() + ".json", exportJSON(), "application/json");
    toast("Sauvegarde exportée");
  });

  // Voie de secours quand le téléchargement échoue (PWA installée sur iOS).
  document.querySelector('[data-act="copy-json"]').addEventListener("click", function () {
    navigator.clipboard.writeText(exportJSON())
      .then(() => toast("JSON copié"))
      .catch(() => toast("Copie impossible", "error"));
  });

  const jsonFile = document.getElementById("set-json-file");
  document.querySelector('[data-act="import-json"]').addEventListener("click", () => jsonFile.click());

  jsonFile.addEventListener("change", function () {
    const f = jsonFile.files && jsonFile.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try {
        parsed = importJSON(String(reader.result || ""));
      } catch (err) {
        toast(err.message || "Fichier illisible", "error");
        return;
      }
      confirmSheet(
        "Restaurer ?",
        "Les données actuelles seront remplacées par celles du fichier (" +
          parsed.items.length + " éléments).",
        "Restaurer",
        function () {
          replaceAll(parsed);
          // Un backup à l'ancien format « portions » doit être converti tout
          // de suite, pas au prochain rechargement complet.
          if (migrateNutritionLogs() > 0) save();
          toast("Données restaurées");
          location.hash = "#/";
        }
      );
    };
    reader.onerror = function () { toast("Lecture impossible", "error"); };
    reader.readAsText(f);
    jsonFile.value = "";
  });

  const purgeBtn = document.querySelector('[data-act="purge-ponctuelles"]');
  if (purgeBtn) purgeBtn.addEventListener("click", function () {
    const list = oneShots();
    if (!list.length) { toast("Rien à ranger"); return; }
    confirmSheet(
      "Ranger " + list.length + " action" + (list.length > 1 ? "s" : ""),
      "Elles passent en file d'attente. Rien n'est effacé : tu les retrouves dans chaque section, " +
        "et tu peux en réactiver une quand elle redevient d'actualité.",
      "Ranger",
      function () {
        list.forEach(function (i) { i.status = "queue"; });
        save();
        toast(list.length + " action" + (list.length > 1 ? "s rangées" : " rangée"));
        location.reload();
      }
    );
  });

  document.querySelector('[data-act="reset"]').addEventListener("click", function () {
    confirmSheet(
      "Tout effacer ?",
      "Toutes les données de l'app seront supprimées de cet appareil. " +
        "Le contenu de départ sera réinjecté. Exporte une sauvegarde avant si tu hésites.",
      "Tout effacer",
      function () {
        try { localStorage.removeItem("diete-sport.v1"); } catch (e) { /* rien à faire */ }
        location.hash = "#/";
        location.reload();
      }
    );
  });
}
