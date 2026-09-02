// Réglages : thème, rappels de relaxation, export Markdown, sauvegarde JSON.

import { esc, toast, confirmSheet } from "./ui.js";
import { state, save, replaceAll } from "./state.js";
import { exportMarkdown, exportJSON, importJSON, download, stamp } from "./io.js";
import { applyTheme, scheduleReminders } from "./notify.js";
import { migrateNutritionLogs } from "./nutrition.js";

function canNotify() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function viewSettings() {
  const s = state.settings;
  const r = s.reminders;
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
      "<h2>Rappels de relaxation</h2>" +
      '<label class="switch"><input type="checkbox" id="set-rem-on"' + (r.on ? " checked" : "") +
        (canNotify() ? "" : " disabled") + ">" +
        "<span>Activer les deux rappels</span></label>" +
      '<div class="times">' +
        '<label class="field"><span>Matin</span><input class="input" type="time" id="set-rem-matin" value="' + esc(r.matin) + '"></label>' +
        '<label class="field"><span>Retour</span><input class="input" type="time" id="set-rem-retour" value="' + esc(r.retour) + '"></label>' +
      "</div>" +
      (canNotify()
        ? '<p class="hint">Ce sont les deux seules notifications de l\'app. Elles se déclenchent ' +
          "quand l'app est ouverte ou récemment active ; iOS ne permet pas de les programmer " +
          "à froid sans serveur de push.</p>"
        : '<p class="hint">Ce navigateur n\'expose pas les notifications — sur iPhone, ' +
          "installe d'abord l'app sur l'écran d'accueil (Partager → Sur l'écran d'accueil).</p>") +
    "</section>" +

    '<section class="panel">' +
      "<h2>Export</h2>" +
      '<p class="hint">' + itemCount + " élément" + (itemCount > 1 ? "s" : "") +
        " · " + dayCount + " jour" + (dayCount > 1 ? "s" : "") + " de suivi.</p>" +
      '<button type="button" class="btn btn-block" data-act="export-md">Exporter en Markdown (Obsidian)</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="copy-md">Copier le Markdown</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="export-json">Sauvegarde JSON</button>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="copy-json">Copier le JSON</button>' +
    "</section>" +

    '<section class="panel">' +
      "<h2>Restaurer</h2>" +
      '<p class="hint">Remplace intégralement les données actuelles par le contenu du fichier.</p>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="import-json">Restaurer depuis un JSON</button>' +
      '<input type="file" id="set-json-file" accept=".json" hidden>' +
      '<button type="button" class="btn btn-block btn-danger-ghost" data-act="reset">Tout effacer</button>' +
    "</section>" +

    '<p class="version">Suivi personnel · données stockées uniquement sur cet appareil.</p>' +
    "</div>";
}

export function mountSettings() {
  const themeBox = document.getElementById("set-theme");
  themeBox.addEventListener("click", function (e) {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.settings.theme = chip.dataset.theme;
    save();
    applyTheme();
    themeBox.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
  });

  const remOn = document.getElementById("set-rem-on");
  const remMatin = document.getElementById("set-rem-matin");
  const remRetour = document.getElementById("set-rem-retour");

  function syncReminders() {
    state.settings.reminders.matin = remMatin.value || "07:00";
    state.settings.reminders.retour = remRetour.value || "18:30";
    save();
    scheduleReminders();
  }

  remOn.addEventListener("change", function () {
    if (remOn.checked && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(function (p) {
        if (p !== "granted") {
          remOn.checked = false;
          state.settings.reminders.on = false;
          save();
          toast("Notifications refusées par le navigateur", "error");
          return;
        }
        state.settings.reminders.on = true;
        syncReminders();
        toast("Rappels activés");
      });
      return;
    }
    state.settings.reminders.on = remOn.checked;
    syncReminders();
  });

  remMatin.addEventListener("change", syncReminders);
  remRetour.addEventListener("change", syncReminders);

  document.querySelector('[data-act="export-md"]').addEventListener("click", function () {
    download("suivi-" + stamp() + ".md", exportMarkdown(), "text/markdown");
    toast("Markdown exporté");
  });

  document.querySelector('[data-act="copy-md"]').addEventListener("click", function () {
    navigator.clipboard.writeText(exportMarkdown())
      .then(() => toast("Markdown copié"))
      .catch(() => toast("Copie impossible", "error"));
  });

  document.querySelector('[data-act="export-json"]').addEventListener("click", function () {
    download("suivi-" + stamp() + ".json", exportJSON(), "application/json");
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

  document.querySelector('[data-act="reset"]').addEventListener("click", function () {
    confirmSheet(
      "Tout effacer ?",
      "Toutes les données de l'app seront supprimées de cet appareil. " +
        "Le contenu de départ sera réinjecté. Exporte une sauvegarde avant si tu hésites.",
      "Tout effacer",
      function () {
        try { localStorage.removeItem("suivi.v1"); } catch (e) { /* rien à faire */ }
        location.hash = "#/";
        location.reload();
      }
    );
  });
}
