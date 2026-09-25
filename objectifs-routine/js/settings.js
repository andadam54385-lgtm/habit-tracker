// Réglages : thème, rappels de relaxation, export Markdown, sauvegarde JSON.

import { esc, toast, confirmSheet } from "./ui.js";
import { state, save, replaceAll } from "./state.js";
import { exportMarkdown, exportJSON, importJSON, download, stamp } from "./io.js";
import { applyTheme, scheduleReminders } from "./notify.js";

// Actions ponctuelles encore à faire : une tâche sans récurrence, ni terminée,
// ni déjà en file. C'est ce que le ménage propose de ranger.
function oneShots() {
  return (state.items || []).filter(function (i) {
    return i.kind === "task" && !i.recurrence && !i.keep &&
      i.status !== "done" && i.status !== "queue" && i.status !== "rejected";
  });
}

function pendingOneShots() { return oneShots().length; }

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
    "</section>" +

    '<section class="panel">' +
      "<h2>Restaurer</h2>" +
      '<p class="hint">Remplace intégralement les données actuelles par le contenu du fichier.</p>' +
      '<button type="button" class="btn btn-block btn-ghost" data-act="import-json">Restaurer depuis un JSON</button>' +
      '<input type="file" id="set-json-file" accept=".json" hidden>' +
      '<button type="button" class="btn btn-block btn-danger-ghost" data-act="reset">Tout effacer</button>' +
    "</section>" +

    '<p class="version">Objectifs & Routine <span id="app-version"></span><br>' +
      "Données stockées uniquement sur cet appareil.</p>" +
    "</div>";
}

export function mountSettings() {
  // Pas de numéro dupliqué à maintenir en JS : on lit le nom du cache
  // actif, que le service worker nomme déjà d'après sa propre VERSION.
  const verEl = document.getElementById("app-version");
  if (verEl && typeof caches !== "undefined") {
    caches.keys().then(function (keys) {
      const v = keys.find((k) => /^objectifs-routine-v\d+$/.test(k));
      verEl.textContent = v ? "· " + v.replace("objectifs-routine-", "") : "";
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
    download("objectifs-routine-" + stamp() + ".md", exportMarkdown(), "text/markdown");
    toast("Markdown exporté");
  });

  document.querySelector('[data-act="copy-md"]').addEventListener("click", function () {
    navigator.clipboard.writeText(exportMarkdown())
      .then(() => toast("Markdown copié"))
      .catch(() => toast("Copie impossible", "error"));
  });

  document.querySelector('[data-act="export-json"]').addEventListener("click", function () {
    download("objectifs-routine-" + stamp() + ".json", exportJSON(), "application/json");
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
        try { localStorage.removeItem("objectifs-routine.v1"); } catch (e) { /* rien à faire */ }
        location.hash = "#/";
        location.reload();
      }
    );
  });
}
