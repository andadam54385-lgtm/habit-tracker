// Écran Routine : la grille de routines guidées (respiration, cou, mâchoire,
// myofonctionnel, cervicale) et leur historique — reprises de l'onglet
// Mobilité de Sport (app "Diète & Sport"), promues en écran à part entière
// puisque cette app n'a pas de module Sport.

import { esc, openSheet, toast, confirmSheet } from "./ui.js";
import { dayKey } from "./state.js";
import {
  ROUTINES, ROUTINE_MAP, routineSeconds, workouts, workoutById, workoutsOn,
  addWorkout, removeWorkout, weeklySummary, fmtDuration, fmtClock
} from "./routines.js";

// ------------------------------------------------------------ utilitaires

let audioCtx = null;

// Bip court : oscillateur WebAudio, créé au premier geste utilisateur
// (iOS refuse de démarrer un contexte audio sans interaction).
function beep(freq, ms) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq || 880;
    g.gain.value = 0.25;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + (ms || 150) / 1000);
  } catch (e) { /* pas d'audio disponible */ }
  try { if (navigator.vibrate) navigator.vibrate(ms || 150); } catch (e) { /* idem */ }
}

function cueStart() { beep(880, 180); }
function cueRest() { beep(520, 220); }
function cueDone() { beep(880, 120); setTimeout(() => beep(1100, 120), 160); setTimeout(() => beep(1320, 220), 320); }
function cueTick() { beep(660, 60); }

let wakeLock = null;
function keepAwake() {
  try {
    if (navigator.wakeLock && !wakeLock) {
      navigator.wakeLock.request("screen").then((l) => { wakeLock = l; }).catch(() => {});
    }
  } catch (e) { /* non supporté */ }
}
function releaseAwake() {
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) { /* rien */ }
}

// Compte à rebours basé sur des horodatages : setInterval dérive, pas Date.now().
function makeCountdown(onTick, onEnd) {
  let endAt = 0, remainingAtPause = 0, timer = null, running = false;
  function loop() {
    const left = (endAt - Date.now()) / 1000;
    if (left <= 0) { stop(); onTick(0); onEnd(); return; }
    onTick(left);
  }
  function start(seconds) {
    endAt = Date.now() + seconds * 1000;
    running = true;
    clearInterval(timer);
    timer = setInterval(loop, 200);
    onTick(seconds);
  }
  function pause() {
    if (!running) return;
    remainingAtPause = Math.max(0, (endAt - Date.now()) / 1000);
    clearInterval(timer); timer = null; running = false;
  }
  function resume() {
    if (running) return;
    start(remainingAtPause);
  }
  function stop() { clearInterval(timer); timer = null; running = false; }
  return { start, pause, resume, stop, isRunning: () => running, left: () => Math.max(0, (endAt - Date.now()) / 1000) };
}

// Un jour au format YYYY-MM-DD valide et rien d'autre : un paramètre
// d'URL trafiqué ne doit pas planter la vue, juste retomber sur aujourd'hui.
function shiftDayKey(key, delta) {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

function fmtDayLabel(viewDate) {
  const s = viewDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function workoutRow(w) {
  const r = ROUTINE_MAP[w.routine];
  const title = (r ? r.icon + " " + r.label : "Routine");
  const detail = fmtDuration(w.duration) + (w.completed === false ? " · interrompue" : " · complète");
  const d = new Date(w.date + "T12:00:00");
  return '<li class="nut-food has-qty">' +
    '<div class="nut-food-main" data-act="open-workout" data-workout="' + esc(w.id) + '" role="button" tabindex="0">' +
      '<span class="nut-food-label">' + esc(title) + "</span>" +
      '<span class="nut-food-detail">' + esc(detail) + "</span>" +
      '<span class="nut-food-detail">' + esc(d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })) + "</span>" +
    "</div>" +
    '<button type="button" class="nut-del" data-act="del-workout" data-workout="' + esc(w.id) + '" aria-label="Supprimer">✕</button>' +
  "</li>";
}

function recentList(limit) {
  const list = workouts().sort((a, b) => b.at - a.at).slice(0, limit || 8);
  if (!list.length) return '<p class="empty">Aucune routine enregistrée pour l\'instant.</p>';
  return '<ul class="nut-foods">' + list.map(workoutRow).join("") + "</ul>";
}

// ------------------------------------------------------------------ vue

export function viewRoutine(dateKey) {
  const todayKey = dayKey();
  const key = /^\d{4}-\d{2}-\d{2}$/.test(dateKey || "") ? dateKey : todayKey;
  const isToday = key === todayKey;
  const viewDate = new Date(key + "T12:00:00");
  const s = weeklySummary(viewDate);

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Routine</h1><p class="sub">' +
    (s.total
      ? "Cette semaine-là : " + s.total + " routine" + (s.total > 1 ? "s" : "") + " · " + s.minutes + " min"
      : "Rien d'enregistré cette semaine-là.") +
    "</p></header>";

  // Corriger ou compléter un autre jour : mêmes flèches que sur Jour et
  // Objectifs. Une routine faite depuis cet écran se date sur le jour
  // affiché, pas forcément sur l'instant présent.
  html += '<nav class="week-nav">' +
    '<a class="btn btn-small" href="#/routine?d=' + esc(shiftDayKey(key, -1)) + '" aria-label="Jour précédent">←</a>' +
    '<span class="week-label">' + esc(isToday ? "Aujourd'hui" : fmtDayLabel(viewDate)) + "</span>" +
    '<a class="btn btn-small" href="#/routine?d=' + esc(shiftDayKey(key, 1)) + '" aria-label="Jour suivant">→</a>' +
    (isToday ? "" : '<a class="btn btn-small btn-ghost" href="#/routine">Aujourd\'hui</a>') +
  "</nav>";

  const onDay = workoutsOn(key).sort((a, b) => b.at - a.at);
  if (onDay.length) {
    html += '<div class="block-head"><h2>' + (isToday ? "Aujourd'hui" : "Ce jour-là") + "</h2></div>" +
      '<ul class="nut-foods">' + onDay.map(workoutRow).join("") + "</ul>";
  } else if (!isToday) {
    html += '<p class="empty">Rien enregistré ce jour-là. Une routine faite depuis cet écran s\'y ajoutera.</p>';
  }

  html += '<div class="block-head"><h2>Routines guidées</h2></div><div class="start-grid">';
  for (const r of ROUTINES) {
    html += '<button type="button" class="start-card" data-act="start-routine" data-routine="' + r.key + '" data-day="' + esc(key) + '">' +
      '<span class="start-title">' + r.icon + " " + esc(r.label) + "</span>" +
      '<span class="start-detail">' + Math.round(routineSeconds(r) / 60) + " min · " + r.phases.length + " phases</span>" +
      "</button>";
  }
  html += "</div>";
  html += '<p class="hint">Chaque phase est chronométrée avec un bip au changement. Une routine terminée coche la case du jour correspondante.</p>';

  html += '<div class="block-head"><h2>Dernières routines</h2></div>';
  html += recentList(8);

  html += "</div>";
  return html;
}

// Feuille générique de phases chronométrées.
function runPhases(title, phases, opts) {
  let idx = -1, startedAt = 0, finished = false, paused = false;
  // Déclaré hors du rendu : onClose (plus bas) doit pouvoir l'arrêter.
  let cd = null;
  const total = phases.reduce((a, p) => a + p.seconds, 0);

  openSheet(title, function (body, close) {
    cd = makeCountdown(
      (left) => {
        const el = body.querySelector("#ph-left"); if (el) el.textContent = fmtClock(left);
        const fill = body.querySelector("#ph-fill");
        if (fill && idx >= 0) fill.style.width = (100 * (1 - left / phases[idx].seconds)).toFixed(1) + "%";
        if (left <= 3 && left > 0 && Math.abs(left - Math.round(left)) < 0.11) cueTick();
      },
      () => { if (idx >= 0) phases[idx].done = true; next(); }
    );

    function next() {
      idx++;
      if (idx >= phases.length) { finish(true); return; }
      const p = phases[idx];
      if (p.kind === "rest") cueRest(); else cueStart();
      render();
      cd.start(p.seconds);
    }

    function finish(completed) {
      if (finished) return;
      finished = true;
      cd.stop();
      releaseAwake();
      if (completed) cueDone();
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      close();
      if (opts.onDone) opts.onDone(elapsed, completed);
    }

    function render() {
      const p = idx >= 0 ? phases[idx] : null;
      const nextP = phases[idx + 1];
      const doneSec = phases.slice(0, Math.max(0, idx)).reduce((a, x) => a + x.seconds, 0);
      body.innerHTML =
        (opts.subtitle ? '<p class="sub" style="margin:0">' + esc(opts.subtitle) + "</p>" : "") +
        (opts.intro && idx < 0 ? '<p class="sheet-text">' + esc(opts.intro) + "</p>" : "") +
        '<div class="ph-card ' + (p ? "is-" + p.kind : "is-idle") + '">' +
          '<span class="ph-label">' + (p ? esc(p.label) : "Prêt ?") + (p && p.round ? ' <span class="ph-round">tour ' + p.round + "/" + (opts.rounds || phases.filter((x) => x.kind === "work").length) + "</span>" : "") + "</span>" +
          '<span class="ph-left" id="ph-left">' + (p ? fmtClock(p.seconds) : fmtClock(total)) + "</span>" +
          (p && p.cue ? '<span class="ph-cue">' + esc(p.cue) + "</span>" : "") +
          '<div class="bar"><div class="bar-fill" id="ph-fill" style="width:0%"></div></div>' +
          '<span class="ph-progress">' + (p ? "phase " + (idx + 1) + "/" + phases.length + " · " : "") +
            fmtClock(total - doneSec) + " restantes</span>" +
        "</div>" +
        (nextP ? '<p class="hint">Ensuite : ' + esc(nextP.label) + " · " + fmtClock(nextP.seconds) + "</p>" : "") +
        (opts.caution ? '<p class="sheet-warn">⚠️ ' + esc(opts.caution) + "</p>" : "") +
        '<div class="sheet-actions">' +
          (idx < 0
            ? '<button type="button" class="btn btn-primary btn-block" data-act="start">▶ Démarrer</button>'
            : '<button type="button" class="btn btn-danger-ghost" data-act="stop">Arrêter</button>' +
              '<button type="button" class="btn btn-ghost" data-act="pause">' + (paused ? "▶ Reprendre" : "⏸ Pause") + "</button>" +
              '<button type="button" class="btn btn-ghost" data-act="skip">⏭ Passer</button>') +
        "</div>";

      const s = body.querySelector('[data-act="start"]');
      if (s) s.addEventListener("click", function () { startedAt = Date.now(); keepAwake(); beep(880, 50); next(); });
      const st = body.querySelector('[data-act="stop"]');
      if (st) st.addEventListener("click", function () { finish(false); });
      const pa = body.querySelector('[data-act="pause"]');
      if (pa) pa.addEventListener("click", function () {
        paused = !paused;
        if (paused) cd.pause(); else cd.resume();
        pa.textContent = paused ? "▶ Reprendre" : "⏸ Pause";
      });
      const sk = body.querySelector('[data-act="skip"]');
      if (sk) sk.addEventListener("click", function () { cd.stop(); paused = false; next(); });
    }

    render();
  }, { onClose: function () { if (!finished) { finished = true; if (cd) cd.stop(); releaseAwake(); } } });
}

export function openRoutine(key, dateKey) {
  const r = ROUTINE_MAP[key];
  if (!r) return;
  const phases = r.phases.map((p) => Object.assign({}, p));
  runPhases(r.icon + " " + r.label, phases, {
    intro: r.intro,
    caution: r.caution,
    onDone: function (elapsed, completed) {
      const w = addWorkout({ routine: r.key, duration: elapsed, completed: completed, date: dateKey });
      if (!completed) { toast("Routine interrompue à " + fmtDuration(elapsed)); return; }
      if (w) toast(r.label + " terminée" + (w.linked ? " — case du jour cochée" : ""));
    }
  });
}

export function openWorkout(id) {
  const w = workoutById(id);
  if (!w) return;
  const r = ROUTINE_MAP[w.routine];
  openSheet("Routine", function (body, close) {
    body.innerHTML = '<p class="sub" style="margin:0">' + esc(w.date) + "</p>" +
      "<p>" + esc(r ? r.label : w.routine) + " · " + fmtDuration(w.duration) + (w.completed === false ? " · interrompue" : "") + "</p>" +
      (w.linked ? '<p class="hint">A coché la case « ' + esc(w.linked) + " » ce jour-là.</p>" : "") +
      '<div class="sheet-actions"><button type="button" class="btn btn-danger-ghost" data-act="del">Supprimer</button></div>';
    body.querySelector('[data-act="del"]').addEventListener("click", function () {
      close();
      confirmSheet("Supprimer cette routine ?", "La case du jour qu'elle a cochée reste cochée.", "Supprimer",
        function () { removeWorkout(w.id); toast("Supprimée"); });
    });
  });
}

export function confirmDeleteWorkout(id) {
  const w = workoutById(id);
  if (!w) return;
  confirmSheet("Supprimer cette routine ?", "La case du jour qu'elle a cochée reste cochée.", "Supprimer",
    function () { removeWorkout(id); toast("Supprimée"); });
}

export function mountRoutine() { /* tout passe par la délégation dans app.js */ }
