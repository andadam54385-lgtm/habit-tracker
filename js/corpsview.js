// Écran Corps : pesée, tendances 7 et 14 jours, photos avant/après,
// et les rappels (chacun à son heure : le visage le matin, la pesée à la
// salle). Les photos sont chargées après le rendu — elles viennent
// d'IndexedDB, pas de l'état.

import { esc, openSheet, toast, confirmSheet } from "./ui.js";
import { state, save, dayKey } from "./state.js";
import {
  BODY_FIELDS, BODY_MAP, WINDOWS, setBody, bodyEntries, lastEntry,
  trendFor, trendLevel, composition, daysSince, weighDue, weighInterval
} from "./corps.js";
import {
  PHOTO_KINDS, addPhoto, listPhotos, photoUrl, removePhoto, photoStats,
  photoInterval, daysSincePhoto, fmtBytes
} from "./photos.js";

let liveUrls = [];
function releaseUrls() {
  for (const u of liveUrls) { try { URL.revokeObjectURL(u); } catch (e) { /* déjà libéré */ } }
  liveUrls = [];
}

function fmtDay(key) {
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ------------------------------------------------------------ saisie

// `after` permet d'ouvrir la pesée depuis une séance et d'y revenir ensuite :
// les feuilles ne s'empilent pas, celle de la séance a été fermée.
export function openWeighIn(key, after) {
  const k = key || dayKey();
  const d = state.daily[k] || {};
  openSheet("⚖️ Pesée du jour", function (body, close) {
    body.innerHTML =
      '<p class="sheet-text">Le poids seul suffit. Gras et muscle le jour où tu passes sur la balance de la salle, ' +
        "ventre et bras quand tu sors le mètre : chaque champ vide est simplement ignoré.</p>" +
      BODY_FIELDS.map(function (f) {
        const last = lastEntry(f.key);
        return '<label class="field"><span>' + esc(f.label) + " (" + f.unit + ")" +
          (last ? ' <small class="hint-inline">dernier : ' + last.value + " " + f.unit + " le " + esc(fmtDay(last.key)) + "</small>" : "") + "</span>" +
          // type="text" et pas "number" : le clavier français tape « 81,4 »,
          // et un champ numérique rend alors une valeur vide, sans le dire.
          '<input type="text" inputmode="decimal" autocomplete="off" class="input" id="bw-' + f.key + '"' +
            ' value="' + (d[f.key] === undefined ? "" : d[f.key]) + '" placeholder="—"></label>';
      }).join("") +
      '<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-act="c">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-act="ok">Enregistrer</button></div>';
    body.querySelector('[data-act="c"]').addEventListener("click", close);
    body.querySelector('[data-act="ok"]').addEventListener("click", function () {
      const values = {};
      const refused = [];
      for (const f of BODY_FIELDS) {
        const raw = body.querySelector("#bw-" + f.key).value.trim();
        values[f.key] = raw;
        // Une valeur saisie mais hors bornes serait silencieusement perdue.
        if (raw && !(parseFloat(raw.replace(",", ".")) >= f.min && parseFloat(raw.replace(",", ".")) <= f.max)) refused.push(f.label);
      }
      if (refused.length) { toast(refused.join(" et ") + " : valeur impossible", "error"); return; }
      setBody(values, k);
      close();
      const p = lastEntry("poids");
      toast(p ? "Pesée enregistrée : " + p.value + " kg" : "Enregistré");
    });
    body.querySelector("#bw-poids").focus();
  }, { onClose: function () { if (after) setTimeout(after, 0); } });
}

// ------------------------------------------------------------ rappels

const REMINDER_DEFS = [
  // La pesée ne suit pas une heure : elle se rappelle au moment où tu
  // démarres une séance, la balance est sur place.
  { key: "pesee", label: "Pesée au début de séance", icon: "⚖️", onKey: "peseeOn", daysKey: "peseeJours",
    defDays: 1, maxDays: 30, atSession: true,
    hint: "Quand tu appuies sur « Commencer la séance », l'app te le rappelle si ta dernière pesée date." },
  { key: "photo", label: "Photos", icon: "📷", onKey: "photoOn", timeKey: "photoHeure", daysKey: "photoJours",
    defTime: "07:30", defDays: 14, maxDays: 90, hint: "Le matin, même lumière et même endroit : c'est ce qui rend la comparaison lisible." }
];

export { REMINDER_DEFS };

function remindersBlock() {
  const r = state.settings.reminders || {};
  return '<div class="block-head"><h2>Rappels</h2></div>' +
    REMINDER_DEFS.map(function (def) {
      const on = !!r[def.onKey];
      return '<section class="panel rem-card">' +
        '<label class="switch"><input type="checkbox" data-rem-on="' + def.key + '"' + (on ? " checked" : "") + ">" +
          "<span>" + def.icon + " " + esc(def.label) + "</span></label>" +
        '<div class="times">' +
          (def.atSession
            ? '<p class="rem-when">Au démarrage d\'une séance</p>'
            : '<label class="field"><span>Heure</span><input class="input" type="time" data-rem-time="' + def.key + '" value="' + esc(r[def.timeKey] || def.defTime) + '"></label>') +
          '<label class="field"><span>' + (def.atSession ? "Si plus de" : "Tous les") + '</span><span class="rem-days">' +
            '<input class="input" type="number" inputmode="numeric" min="1" max="' + def.maxDays +
            '" data-rem-days="' + def.key + '" value="' + (r[def.daysKey] || def.defDays) + '"> jours</span></label>' +
        "</div>" +
        '<p class="hint">' + esc(def.hint) + "</p>" +
      "</section>";
    }).join("") +
    '<p class="hint">Les rappels sont locaux : ils se déclenchent quand l\'app a été ouverte récemment. ' +
      "iOS ne permet pas mieux sans serveur. Ils n'apparaissent que si la pesée ou la photo est effectivement due.</p>";
}

// ------------------------------------------------------------ tendances

function trendCard(f) {
  const rows = WINDOWS.map(function (w) {
    const t = trendFor(f.key, w);
    const level = trendLevel(f.key, t.delta);
    const val = t.current === null ? "—" : t.current + " " + f.unit;
    const delta = t.delta === null ? "" :
      (t.delta > 0 ? "+" : "") + t.delta + " " + f.unit;
    return '<div class="trend-row">' +
      '<span class="trend-win">' + w + " j</span>" +
      '<span class="trend-avg">' + esc(val) + '<small>' + (t.n ? t.n + " mesure" + (t.n > 1 ? "s" : "") : "aucune mesure") + "</small></span>" +
      '<span class="trend-delta is-' + level + '">' + (delta ? esc(delta) : "—") + "</span>" +
    "</div>";
  }).join("");
  const last = lastEntry(f.key);
  return '<section class="body-card">' +
    '<div class="body-card-head"><h3>' + esc(f.label) + "</h3>" +
      '<span class="body-last">' + (last ? last.value + " " + f.unit + " · " + esc(fmtDay(last.key)) : "jamais mesuré") + "</span></div>" +
    rows +
  "</section>";
}

// Courbe simple du poids : une ligne, les trous restent des trous.
function weightChart() {
  const entries = bodyEntries("poids").slice(-60);
  if (entries.length < 2) return '<p class="hint">Deux pesées suffisent pour tracer la courbe.</p>';
  const values = entries.map((e) => e.value);
  const lo = Math.floor(Math.min.apply(null, values) - 0.5);
  const hi = Math.ceil(Math.max.apply(null, values) + 0.5);
  const span = hi - lo || 1;
  const W = 300, H = 80, PAD = 6;
  const first = new Date(entries[0].key + "T12:00:00").getTime();
  const lastT = new Date(entries[entries.length - 1].key + "T12:00:00").getTime();
  const range = Math.max(1, lastT - first);
  const pts = entries.map(function (e) {
    const t = new Date(e.key + "T12:00:00").getTime();
    const x = PAD + ((t - first) / range) * (W - PAD * 2);
    const y = H - PAD - ((e.value - lo) / span) * (H - PAD * 2);
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  return '<div class="chart"><span class="chart-label">Poids · ' + entries.length + " pesées</span>" +
    '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="chart-svg" aria-hidden="true">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>' +
    "</svg>" +
    '<span class="chart-scale">' + lo + " → " + hi + " kg</span></div>";
}

// ------------------------------------------------------------ vue

export function viewCorps() {
  const comp = composition();
  const due = weighDue();
  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Corps</h1><p class="sub">' +
    (comp ? "Dernière pesée " + comp.poids + " kg · " + esc(fmtDay(comp.date)) : "Aucune mesure pour l'instant") + "</p></header>";

  html += '<button type="button" class="forme-card' + (due ? " is-todo" : "") + '" data-act="weigh-in">' +
    '<span class="forme-face">⚖️</span>' +
    '<span class="forme-main"><strong>' + (due ? "Noter ma pesée" : "Pesée du jour faite") + "</strong>" +
      "<span>" + (comp && comp.gras ? "Gras " + comp.gras.pct + " % ≈ " + comp.gras.kg + " kg · muscle " + (comp.muscle ? comp.muscle.pct + " % ≈ " + comp.muscle.kg + " kg" : "non mesuré")
        : "Poids, et si tu es à la salle : masse grasse et masse musculaire.") + "</span></span>" +
  "</button>";

  html += '<div class="block-head"><h2>Tendances</h2><span class="counter">7 et 14 jours</span></div>';
  html += BODY_FIELDS.map(trendCard).join("");
  html += '<p class="hint">On compare des moyennes de fenêtres, pas deux pesées : le poids d\'un jour ne veut rien dire. ' +
    "Gras et muscle ne se mesurent qu'à la salle — les fenêtres sans mesure affichent « aucune mesure », jamais un faux zéro.</p>";
  html += weightChart();

  const sinceG = daysSince("gras");
  if (sinceG !== null && sinceG > 21) {
    html += '<p class="callout callout-static is-warn">Composition pas mesurée depuis ' + sinceG + " jours. Pense à la balance de la salle.</p>";
  }

  html += '<div class="block-head"><h2>Photos</h2><span class="counter" id="ph-count">…</span></div>';
  html += '<div class="sort-row" role="group" aria-label="Type de photo">' +
    PHOTO_KINDS.map((k) => '<button type="button" class="sort-btn' + (k.key === currentKind ? " is-active" : "") +
      '" data-act="ph-kind" data-kind="' + k.key + '">' + k.icon + " " + esc(k.label) + "</button>").join("") +
  "</div>";
  html += '<div class="ph-actions">' +
    '<button type="button" class="btn btn-primary" data-act="ph-add">📷 Ajouter une photo</button>' +
    '<input type="file" id="ph-file" accept="image/*" capture="user" hidden>' +
  "</div>";
  html += '<div id="ph-compare"></div><div id="ph-grid"><p class="hint">Chargement des photos…</p></div>';
  html += '<p class="hint">Les photos restent sur ce téléphone : elles ne partent ni dans la sauvegarde, ni dans le compte rendu. ' +
    "Même lumière, même endroit, même heure : c'est ce qui rend la comparaison utile.</p>";

  html += remindersBlock();
  html += "</div>";
  return html;
}

// ------------------------------------------------------- montage photos

let currentKind = "corps";
let compareA = null, compareB = null;

export function mountCorps() {
  const file = document.getElementById("ph-file");
  if (!file) return;

  document.querySelectorAll("[data-rem-on]").forEach((el) => el.addEventListener("change", function () {
    const def = REMINDER_DEFS.find((d) => d.key === el.dataset.remOn);
    if (el.checked && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(function (p) {
        if (p !== "granted") { el.checked = false; toast("Notifications refusées par le navigateur", "error"); return; }
        setReminder(def, { on: true });
        toast("Rappel " + def.label.toLowerCase() + " activé");
      });
      return;
    }
    setReminder(def, { on: el.checked });
  }));
  document.querySelectorAll("[data-rem-time]").forEach((el) => el.addEventListener("change", function () {
    const def = REMINDER_DEFS.find((d) => d.key === el.dataset.remTime);
    setReminder(def, { time: el.value || def.defTime });
  }));
  document.querySelectorAll("[data-rem-days]").forEach((el) => el.addEventListener("change", function () {
    const def = REMINDER_DEFS.find((d) => d.key === el.dataset.remDays);
    const n = Math.min(def.maxDays, Math.max(1, parseInt(el.value, 10) || def.defDays));
    el.value = n;
    setReminder(def, { days: n });
  }));

  file.addEventListener("change", function () {
    const f = file.files && file.files[0];
    file.value = "";
    if (!f) return;
    toast("Photo en cours d'ajout…");
    addPhoto(f, currentKind).then(function () {
      compareA = compareB = null;
      renderPhotos();
      toast("Photo ajoutée");
    }).catch(function () { toast("Photo illisible", "error"); });
  });

  renderPhotos();
}

function setReminder(def, patch) {
  if (!def) return;
  const r = state.settings.reminders;
  if (!(def.timeKey in r)) r[def.timeKey] = def.defTime;
  if (!(def.daysKey in r)) r[def.daysKey] = def.defDays;
  if ("on" in patch) r[def.onKey] = !!patch.on;
  if ("time" in patch) r[def.timeKey] = patch.time;
  if ("days" in patch) r[def.daysKey] = patch.days;
  save();
  import("./notify.js").then((m) => m.scheduleReminders()).catch(() => { /* rappels indisponibles */ });
}

export function setPhotoKind(kind) {
  currentKind = PHOTO_KINDS.some((k) => k.key === kind) ? kind : "corps";
  compareA = compareB = null;
  document.querySelectorAll('[data-act="ph-kind"]').forEach((b) => b.classList.toggle("is-active", b.dataset.kind === currentKind));
  renderPhotos();
}

export function pickPhoto() {
  const f = document.getElementById("ph-file");
  if (f) f.click();
}

export function confirmDeletePhoto(id) {
  confirmSheet("Supprimer cette photo ?", "Elle est effacée de l'appareil, définitivement.", "Supprimer", function () {
    removePhoto(id).then(function () {
      if (compareA === id) compareA = null;
      if (compareB === id) compareB = null;
      renderPhotos();
      toast("Photo supprimée");
    });
  });
}

export function setCompare(side, id) {
  if (side === "a") compareA = id; else compareB = id;
  renderPhotos();
}

function renderPhotos() {
  const grid = document.getElementById("ph-grid");
  const cmp = document.getElementById("ph-compare");
  const count = document.getElementById("ph-count");
  if (!grid) return;
  releaseUrls();

  photoStats().then(function (stats) {
    if (!count) return;
    const since = daysSincePhoto(stats.last[currentKind]);
    count.textContent = stats.total ? stats.total + " photo" + (stats.total > 1 ? "s" : "") + " · " + fmtBytes(stats.bytes) +
      (since === null ? "" : " · dernière il y a " + since + " j") : "aucune";
  }).catch(function () { if (count) count.textContent = "indisponible"; });

  listPhotos(currentKind).then(function (rows) {
    if (!rows.length) {
      cmp.innerHTML = "";
      grid.innerHTML = '<p class="empty">Aucune photo « ' + esc(currentKind) + ' » pour l\'instant. ' +
        "La première sert de point de départ : prends-la aujourd'hui.</p>";
      return;
    }
    if (!compareA || !rows.some((r) => r.id === compareA)) compareA = rows[0].id;
    if (!compareB || !rows.some((r) => r.id === compareB)) compareB = rows[rows.length - 1].id;

    const options = (sel) => rows.map((r) => '<option value="' + r.id + '"' + (r.id === sel ? " selected" : "") + ">" + esc(fmtDay(r.date)) + "</option>").join("");
    cmp.innerHTML = rows.length > 1
      ? '<div class="ph-compare">' +
          '<div class="ph-side"><select class="input" data-cmp="a">' + options(compareA) + "</select>" +
            '<div class="ph-frame" id="ph-img-a"></div></div>' +
          '<div class="ph-side"><select class="input" data-cmp="b">' + options(compareB) + "</select>" +
            '<div class="ph-frame" id="ph-img-b"></div></div>' +
        "</div>" +
        '<p class="hint">Avant / après : choisis les deux dates à comparer.</p>'
      : "";

    if (rows.length > 1) {
      cmp.querySelectorAll("[data-cmp]").forEach((s) => s.addEventListener("change", function () { setCompare(s.dataset.cmp, s.value); }));
      for (const side of ["a", "b"]) {
        const id = side === "a" ? compareA : compareB;
        photoUrl(id).then(function (url) {
          if (!url) return;
          liveUrls.push(url);
          const host = document.getElementById("ph-img-" + side);
          if (host) host.innerHTML = '<img src="' + url + '" alt="Photo du ' + esc(fmtDay((rows.find((r) => r.id === id) || {}).date || "")) + '">';
          else URL.revokeObjectURL(url);
        }).catch(function () { /* photo illisible */ });
      }
    }

    grid.innerHTML = '<div class="ph-grid">' + rows.slice().reverse().map(function (r) {
      return '<figure class="ph-cell" id="cell-' + r.id + '">' +
        '<div class="ph-thumb"></div>' +
        "<figcaption>" + esc(fmtDay(r.date)) +
          '<button type="button" class="ph-del" data-act="ph-del" data-photo="' + r.id + '" aria-label="Supprimer">✕</button>' +
        "</figcaption></figure>";
    }).join("") + "</div>";

    for (const r of rows) {
      photoUrl(r.id).then(function (url) {
        if (!url) return;
        liveUrls.push(url);
        const cell = document.getElementById("cell-" + r.id);
        if (cell) cell.querySelector(".ph-thumb").innerHTML = '<img src="' + url + '" alt="Photo du ' + esc(fmtDay(r.date)) + '" loading="lazy">';
        else URL.revokeObjectURL(url);
      }).catch(function () { /* photo illisible */ });
    }
  }).catch(function () {
    grid.innerHTML = '<p class="empty">Stockage des photos indisponible sur ce navigateur.</p>';
  });
}
