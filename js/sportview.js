// Écran Entraînement : trois onglets et les feuilles qui font tourner les
// minuteurs. Les minuteurs vivent dans des feuilles, hors de #app : un
// enregistrement re-rend la vue principale sans les interrompre.

import { esc, escLines, openSheet, toast, confirmSheet } from "./ui.js";
import { dayKey } from "./state.js";
import {
  MUSCLE_GROUPS, GROUP_MAP, REST_DEFAULT,
  RUN_PRESETS, RUN_MODES, ROUTINES, ROUTINE_MAP, routineSeconds
} from "./exercises.js";
import {
  allExercises, exerciseById, addCustomExercise, searchExercises,
  workouts, workoutById, addWorkout, removeWorkout,
  estimate1RM, setVolume, exerciseHistory, exercisesPracticed,
  weeklySummary, runStats, fmtDuration, fmtClock,
  allTemplates, templateByKey, upsertTemplate, removeTemplate,
  sortedTemplates, templateSort, setTemplateSort, TEMPLATE_SORTS,
  hiddenTemplates, hideTemplate, unhideTemplates,
  lastWorkoutsForTemplate, lastSetsFor, tempoLabel, cleanTempo
} from "./sport.js";

function fmtSet(s, ex) {
  const load = ex ? ex.load : "kg";
  return (load === "temps" ? s.reps + " s" : s.reps) + (load === "kg" ? "×" + s.weight : "") +
    (s.rpe ? "@" + s.rpe : "");
}
import { byId } from "./state.js";

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

function rpeChips(selected) {
  return '<div class="chips" id="rpe-chips">' + [5, 6, 7, 8, 9, 10].map(function (v) {
    return '<button type="button" class="chip' + (selected === v ? " is-active" : "") + '" data-rpe="' + v + '">' + v + "</button>";
  }).join("") + "</div>";
}

function bindRpe(body) {
  const box = body.querySelector("#rpe-chips");
  if (!box) return () => null;
  box.addEventListener("click", function (e) {
    const c = e.target.closest(".chip");
    if (!c) return;
    box.querySelectorAll(".chip").forEach((x) => x.classList.toggle("is-active", x === c));
  });
  return () => { const a = box.querySelector(".chip.is-active"); return a ? parseInt(a.dataset.rpe, 10) : null; };
}

function sportTabs(active) {
  return '<nav class="tabs nut-tabs">' +
    '<a class="tab' + (active === "muscu" ? " is-active" : "") + '" href="#/sport?t=muscu">🏋️ Muscu</a>' +
    '<a class="tab' + (active === "course" ? " is-active" : "") + '" href="#/sport?t=course">🏃 Course</a>' +
    '<a class="tab' + (active === "mobilite" ? " is-active" : "") + '" href="#/sport?t=mobilite">🌬️ Mobilité</a>' +
    "</nav>";
}

function workoutRow(w) {
  let title = "", detail = "";
  if (w.type === "muscu") {
    title = "🏋️ " + w.label;
    const n = w.exercises.length;
    const vol = w.exercises.reduce((a, e) => a + setVolume(e.sets), 0);
    detail = n + " exercice" + (n > 1 ? "s" : "") + " · " +
      w.exercises.reduce((a, e) => a + e.sets.length, 0) + " séries" +
      (vol ? " · " + Math.round(vol) + " kg soulevés" : "") +
      (w.duration ? " · " + fmtDuration(w.duration) : "");
  } else if (w.type === "course") {
    const m = RUN_MODES[w.mode];
    title = (m ? m.icon + " " + m.label : "Course");
    detail = fmtDuration(w.duration) +
      (w.distance ? " · " + w.distance + " km" : "") +
      (w.rounds ? " · " + w.rounds + " × " + w.work + "/" + w.rest + " s" : "");
  } else {
    const r = ROUTINE_MAP[w.routine];
    title = (r ? r.icon + " " + r.label : "Routine");
    detail = fmtDuration(w.duration) + (w.completed === false ? " · interrompue" : " · complète");
  }
  if (w.rpe) detail += " · RPE " + w.rpe;
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

function recentList(type, limit) {
  const list = workouts().filter((w) => w.type === type).sort((a, b) => b.at - a.at).slice(0, limit || 6);
  if (!list.length) return '<p class="empty">Aucune séance enregistrée pour l\'instant.</p>';
  return '<ul class="nut-foods">' + list.map(workoutRow).join("") + "</ul>";
}

// ------------------------------------------------------------------ vue

export function viewSport(tab) {
  const t = ["muscu", "course", "mobilite"].indexOf(tab) >= 0 ? tab : "muscu";
  const s = weeklySummary();

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>Entraînement</h1><p class="sub">' +
    (s.total
      ? "Cette semaine : " + s.total + " séance" + (s.total > 1 ? "s" : "") + " · " + s.minutes + " min" +
        (s.km ? " · " + s.km + " km" : "")
      : "Rien d'enregistré cette semaine.") +
    "</p></header>";
  html += sportTabs(t);

  if (t === "muscu") html += tabMuscu();
  else if (t === "course") html += tabCourse();
  else html += tabMobilite();

  html += "</div>";
  return html;
}

function fmtLastUsed(dateKey) {
  if (!dateKey) return "jamais faite";
  const d = new Date(dateKey + "T12:00:00");
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const days = Math.round((today - d) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return "il y a " + days + " jours";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function tabMuscu() {
  const sort = templateSort();
  const hidden = hiddenTemplates();

  let html = '<div class="block-head"><h2>Séances</h2>' +
    '<div class="sort-row" role="group" aria-label="Trier">' +
      TEMPLATE_SORTS.map((s) =>
        '<button type="button" class="sort-btn' + (sort === s.key ? " is-active" : "") +
        '" data-act="tpl-sort" data-sort="' + s.key + '">' + esc(s.label) + "</button>").join("") +
    "</div></div>";

  // Une ligne par séance, pleine largeur : le nom, le contenu, quand elle a
  // été faite en dernier, et les actions à droite.
  html += '<ul class="start-list">';
  for (const tpl of sortedTemplates()) {
    // Trois noms au plus : au-delà, la ligne dit « +N » plutôt que tout lister.
    const names = tpl.plan.map((p) => (exerciseById(p.ex) || {}).label).filter(Boolean);
    const plan = names.slice(0, 3).join(" · ") + (names.length > 3 ? " · +" + (names.length - 3) : "");
    const isLibre = tpl.key === "libre";
    html += '<li class="start-row' + (isLibre ? " is-libre" : "") + '">' +
      '<button type="button" class="start-row-main" data-act="start-muscu" data-template="' + esc(tpl.key) + '">' +
        '<span class="start-title">' + esc(tpl.label) + "</span>" +
        '<span class="start-detail">' + (plan ? esc(plan) : "Compose au fur et à mesure") + "</span>" +
        (isLibre ? "" : '<span class="start-last">' + esc(fmtLastUsed(tpl.lastUsed)) + "</span>") +
      "</button>" +
      (isLibre ? "" :
        '<span class="start-row-actions">' +
          (tpl.builtin ? "" :
            '<button type="button" class="row-act" data-act="edit-template" data-template="' + esc(tpl.key) +
            '" aria-label="Modifier ' + esc(tpl.label) + '">✎</button>') +
          '<button type="button" class="row-act is-danger" data-act="del-template" data-template="' + esc(tpl.key) +
          '" aria-label="' + (tpl.builtin ? "Masquer" : "Supprimer") + " " + esc(tpl.label) + '">✕</button>' +
        "</span>") +
    "</li>";
  }
  html += "</ul>";

  html += '<button type="button" class="btn btn-block btn-ghost" data-act="new-template">+ Nouveau modèle</button>';
  if (hidden.length) {
    html += '<button type="button" class="linkish start-unhide" data-act="unhide-templates">' +
      "Réafficher " + hidden.length + " séance" + (hidden.length > 1 ? "s masquées" : " masquée") + "</button>";
  }
  html += '<p class="hint">Reprise : RPE 6, charges à 50-60 %, 2 min de repos. Sortir en se sentant capable de refaire la séance.</p>';

  const practiced = exercisesPracticed();
  if (practiced.length) {
    html += '<div class="block-head"><h2>Progression</h2><span class="counter">1RM estimé</span></div>';
    html += '<div class="trends">';
    for (const p of practiced) {
      const hist = p.history.slice(-8);
      const max = Math.max.apply(null, hist.map((h) => h.best ? h.best.rm : 0).concat([1]));
      const arrow = p.delta === null ? "" :
        p.delta > 0 ? '<span class="trend-up">▲ +' + Math.round(p.delta * 10) / 10 + "</span>" :
        p.delta < 0 ? '<span class="trend-down">▼ ' + Math.round(p.delta * 10) / 10 + "</span>" :
        '<span class="trend-flat">=</span>';
      const lastStr = p.last && p.last.best
        ? (p.ex.load === "kg" ? p.last.best.weight + " kg × " + p.last.best.reps : p.last.best.reps + (p.ex.load === "temps" ? " s" : " reps"))
        : "—";
      html += '<div class="trend" data-act="open-exercise" data-ex="' + esc(p.ex.id) + '" role="button" tabindex="0">' +
        '<div class="trend-head">' +
          '<span class="trend-label">' + esc(p.ex.label) + "</span>" +
          '<span class="trend-now">' + esc(lastStr) + " " + arrow + "</span>" +
        "</div>" +
        '<div class="trend-bars">' + hist.map(function (h, i) {
          const v = h.best ? h.best.rm : 0;
          const hh = Math.max(4, Math.round((v / max) * 100));
          return '<span class="trend-bar' + (i === hist.length - 1 ? " is-current" : "") + '" style="height:' + hh + '%" title="' +
            esc(h.date + " — " + (h.best ? h.best.weight + " kg × " + h.best.reps : "")) + '"></span>';
        }).join("") + "</div>" +
      "</div>";
    }
    html += "</div>";
  }

  html += '<div class="block-head"><h2>Dernières séances</h2></div>';
  html += recentList("muscu");
  return html;
}

function tabCourse() {
  let html = '<div class="block-head"><h2>Minuteurs</h2></div>';
  html += '<div class="start-grid">';
  for (const p of RUN_PRESETS) {
    html += '<button type="button" class="start-card" data-act="start-run" data-preset="' + p.key + '">' +
      '<span class="start-title">' + esc(p.label) + "</span>" +
      '<span class="start-detail">' + esc(RUN_MODES[p.mode].label) + " · " + fmtDuration(p.rounds * (p.work + p.rest)) + "</span>" +
      "</button>";
  }
  html += '<button type="button" class="start-card" data-act="start-run" data-preset="custom">' +
    '<span class="start-title">Personnalisé</span><span class="start-detail">Travail / repos / tours au choix</span></button>';
  html += "</div>";

  html += '<button type="button" class="btn btn-block btn-ghost" data-act="log-run">+ Enregistrer une sortie sans minuteur (LISS, course libre)</button>';
  html += '<p class="hint">' + esc(RUN_MODES.liss.hint) + " " + esc(RUN_MODES.hiit.hint) + "</p>";

  const stats = runStats(8);
  if (stats.some((s) => s.sessions)) {
    const maxMin = Math.max.apply(null, stats.map((s) => s.minutes).concat([1]));
    html += '<div class="block-head"><h2>Volume</h2><span class="counter">8 semaines</span></div>';
    html += '<div class="trend"><div class="trend-head"><span class="trend-label">Minutes de course</span>' +
      '<span class="trend-now">' + stats[stats.length - 1].minutes + " min · " + stats[stats.length - 1].km + " km</span></div>" +
      '<div class="trend-bars">' + stats.map((s, i) =>
        '<span class="trend-bar' + (i === stats.length - 1 ? " is-current" : "") + (s.sessions ? "" : " is-empty") +
        '" style="height:' + Math.max(4, Math.round((s.minutes / maxMin) * 100)) + '%" title="' + s.sessions + " séance(s), " + s.minutes + ' min"></span>').join("") +
      "</div></div>";
  }

  html += '<div class="block-head"><h2>Dernières sorties</h2></div>';
  html += recentList("course");
  return html;
}

function tabMobilite() {
  let html = '<div class="block-head"><h2>Routines guidées</h2></div><div class="start-grid">';
  for (const r of ROUTINES) {
    html += '<button type="button" class="start-card" data-act="start-routine" data-routine="' + r.key + '">' +
      '<span class="start-title">' + r.icon + " " + esc(r.label) + "</span>" +
      '<span class="start-detail">' + Math.round(routineSeconds(r) / 60) + " min · " + r.phases.length + " phases</span>" +
      "</button>";
  }
  html += "</div>";
  html += '<p class="hint">Chaque phase est chronométrée avec un bip au changement. Une routine terminée coche la case du jour correspondante.</p>';
  html += '<div class="block-head"><h2>Dernières routines</h2></div>';
  html += recentList("mobilite");
  return html;
}

export function mountSport() { /* délégation dans app.js */ }

// ------------------------------------------------------- séance de muscu

let session = null;   // séance en cours : survit à la fermeture de la feuille

export function openMuscuSession(templateKey, resume) {
  const tpl = templateByKey(templateKey) || templateByKey("libre");
  if (!resume || !session) {
    session = {
      template: tpl.key, label: tpl.label, startedAt: Date.now(),
      exercises: tpl.plan.map((p) => ({ ex: p.ex, target: p.sets + " × " + p.reps, tempo: p.tempo || "", sets: [] })),
      restSeconds: REST_DEFAULT
    };
  }

  // Les deux dernières fois avec ce modèle : ce qu'on a fait, pour savoir
  // quoi viser aujourd'hui.
  function lastSessionsBlock() {
    const last = lastWorkoutsForTemplate(session.template, 2);
    if (!last.length) return "";
    return '<details class="fold last-sessions" open><summary class="fold-head">' +
      '<span class="fold-caret" aria-hidden="true">›</span><h2>Les 2 dernières fois</h2></summary>' +
      '<div class="fold-body">' + last.map(function (w) {
        return '<div class="last-session">' +
          '<span class="last-session-date">' + esc(fmtLastUsed(w.date)) +
            (w.rpe ? " · RPE " + w.rpe : "") + (w.duration ? " · " + fmtDuration(w.duration) : "") + "</span>" +
          w.exercises.map(function (e) {
            const ex = exerciseById(e.ex);
            return '<span class="last-session-ex"><strong>' + esc(ex ? ex.label : e.ex) + "</strong> " +
              esc(e.sets.map((s) => fmtSet(s, ex)).join("  ")) + "</span>";
          }).join("") +
        "</div>";
      }).join("") + "</div></details>";
  }

  // Déclaré hors du rendu : onClose (ci-dessous) doit pouvoir l'arrêter.
  let rest = null;
  openSheet(session.label, function (body, close) {
    rest = makeCountdown(
      (left) => { const el = body.querySelector("#rest-left"); if (el) el.textContent = fmtClock(left); },
      () => { cueStart(); const bar = body.querySelector("#rest-bar"); if (bar) bar.classList.add("is-over"); }
    );

    function render() {
      const elapsed = Math.round((Date.now() - session.startedAt) / 1000);
      body.innerHTML =
        '<div class="rest-bar" id="rest-bar">' +
          '<span class="rest-label">Repos</span>' +
          '<span class="rest-left" id="rest-left">' + fmtClock(session.restSeconds) + "</span>" +
          '<button type="button" class="btn btn-small" data-act="rest-go">▶ ' + session.restSeconds + " s</button>" +
          '<button type="button" class="btn btn-small btn-ghost" data-act="rest-cfg">' + session.restSeconds + " s</button>" +
        "</div>" +
        '<p class="hint">Séance démarrée il y a ' + fmtDuration(elapsed) + ".</p>" +
        lastSessionsBlock() +

        session.exercises.map(function (e, ei) {
          const ex = exerciseById(e.ex) || { label: e.ex, load: "kg", cue: "" };
          const isTime = ex.load === "temps";
          const noLoad = ex.load !== "kg";
          const prev = lastSetsFor(e.ex);
          // Pré-remplissage : la dernière série de la séance, sinon la
          // meilleure série de la séance précédente — pas 0 kg.
          const prevBest = (function () {
            const h = exerciseHistory(e.ex);
            return h.length && h[h.length - 1].best ? h[h.length - 1].best : null;
          })();
          const last = e.sets[e.sets.length - 1] ||
            (prevBest ? { reps: prevBest.reps, weight: prevBest.weight } : { reps: isTime ? 30 : 8, weight: 0 });
          // Bloc compact : titre + objectif, une ligne tempo/dernière fois,
          // les séries faites, puis reps · kg · RPE · ✓ sur une seule ligne.
          const hasTempo = e.tempo && cleanTempo(e.tempo).length === 4;
          return '<section class="ex-block">' +
            '<div class="ex-head"><h2>' + esc(ex.label) + "</h2>" +
              (e.target ? '<span class="ex-target">' + esc(e.target) + "</span>" : "") +
              (hasTempo ? '<span class="tempo-badge" title="' + esc(tempoLabel(e.tempo)) + '">' + esc(cleanTempo(e.tempo)) + "</span>" : "") +
            "</div>" +
            (prev
              ? '<p class="prev-line">' + esc(fmtLastUsed(prev.date)) + ' : ' +
                esc(prev.sets.map((s) => fmtSet(s, ex)).join("  ")) + "</p>"
              : "") +
            (e.sets.length
              ? '<ol class="set-list">' + e.sets.map(function (s, si) {
                  return "<li><span>" + (isTime ? s.reps + " s" : s.reps) +
                    (noLoad ? "" : " × " + s.weight + " kg") +
                    (s.rpe ? ' <span class="set-rpe">RPE ' + s.rpe + "</span>" : "") +
                    (noLoad ? "" : ' <span class="set-rm">1RM ' + estimate1RM(s.weight, s.reps) + "</span>") +
                    '</span><button type="button" class="set-del" data-act="set-del" data-ei="' + ei + '" data-si="' + si + '" aria-label="Retirer">✕</button></li>';
                }).join("") + "</ol>"
              : "") +
            '<div class="set-form' + (noLoad ? " no-load" : "") + '">' +
              '<input type="number" inputmode="numeric" min="1" max="500" placeholder="' + (isTime ? "sec" : "reps") + '" aria-label="' + (isTime ? "Secondes" : "Reps") + '" data-reps="' + ei + '" value="' + esc(last.reps) + '">' +
              (noLoad ? "" :
                '<input type="number" inputmode="decimal" min="0" max="500" step="0.5" placeholder="kg" aria-label="kg" data-weight="' + ei + '" value="' + esc(last.weight) + '">') +
              '<input type="number" inputmode="numeric" min="1" max="10" placeholder="RPE" aria-label="RPE" data-rpe="' + ei + '" value="' + esc(last.rpe || "") + '">' +
              '<button type="button" class="btn btn-primary" data-act="set-add" data-ei="' + ei + '" aria-label="Valider la série">✓</button>' +
            "</div>" +
          "</section>";
        }).join("") +

        '<button type="button" class="btn btn-block btn-ghost" data-act="ex-add">+ Ajouter un exercice</button>' +
        '<div class="sheet-actions">' +
          '<button type="button" class="btn btn-danger-ghost" data-act="sess-cancel">Abandonner</button>' +
          '<button type="button" class="btn btn-primary" data-act="sess-finish">Terminer</button>' +
        "</div>";

      body.querySelector('[data-act="rest-go"]').addEventListener("click", function () {
        body.querySelector("#rest-bar").classList.remove("is-over");
        rest.start(session.restSeconds);
        keepAwake();
      });
      body.querySelector('[data-act="rest-cfg"]').addEventListener("click", function () {
        const opts = [60, 90, 120, 150, 180];
        session.restSeconds = opts[(opts.indexOf(session.restSeconds) + 1) % opts.length];
        render();
      });
      body.querySelectorAll('[data-act="set-add"]').forEach(function (b) {
        b.addEventListener("click", function () {
          const ei = parseInt(b.dataset.ei, 10);
          const reps = parseInt(body.querySelector('[data-reps="' + ei + '"]').value, 10) || 0;
          const wEl = body.querySelector('[data-weight="' + ei + '"]');
          const weight = wEl ? (parseFloat(String(wEl.value).replace(",", ".")) || 0) : 0;
          const rEl = body.querySelector('[data-rpe="' + ei + '"]');
          const rpe = rEl && rEl.value !== "" ? parseInt(rEl.value, 10) : null;
          if (reps <= 0) return;
          session.exercises[ei].sets.push({ reps: reps, weight: weight, rpe: rpe });
          render();
          // Le repos démarre tout seul après une série validée.
          body.querySelector("#rest-bar").classList.remove("is-over");
          rest.start(session.restSeconds);
          keepAwake();
          cueRest();
        });
      });
      body.querySelectorAll('[data-act="set-del"]').forEach(function (b) {
        b.addEventListener("click", function () {
          session.exercises[parseInt(b.dataset.ei, 10)].sets.splice(parseInt(b.dataset.si, 10), 1);
          render();
        });
      });
      body.querySelector('[data-act="ex-add"]').addEventListener("click", function () {
        rest.stop();
        close();
        openExercisePicker(function (ex) {
          session.exercises.push({ ex: ex.id, target: "", sets: [] });
          openMuscuSession(session.template, true);
        }, function () { openMuscuSession(session.template, true); });
      });
      body.querySelector('[data-act="sess-cancel"]').addEventListener("click", function () {
        rest.stop();
        close();
        confirmSheet("Abandonner la séance ?", "Les séries saisies seront perdues.", "Abandonner",
          function () { session = null; toast("Séance abandonnée"); });
      });
      body.querySelector('[data-act="sess-finish"]').addEventListener("click", function () {
        const done = session.exercises.filter((e) => e.sets.length);
        if (!done.length) { toast("Aucune série validée", "error"); return; }
        rest.stop();
        close();
        openFinishMuscu();
      });
    }

    render();
  }, { onClose: function () { if (rest) rest.stop(); releaseAwake(); } });
}

function openFinishMuscu() {
  openSheet("Terminer la séance", function (body, close) {
    const dur = Math.round((Date.now() - session.startedAt) / 1000);
    // RPE de séance proposé = moyenne des RPE de séries, sinon 6 (reprise).
    const rpes = session.exercises.flatMap((e) => e.sets.map((s) => s.rpe)).filter((r) => r);
    const suggested = rpes.length ? Math.round(rpes.reduce((a, r) => a + r, 0) / rpes.length) : 6;
    body.innerHTML =
      '<p class="sheet-text">' + fmtDuration(dur) + " · " +
        session.exercises.filter((e) => e.sets.length).length + " exercices · " +
        session.exercises.reduce((a, e) => a + e.sets.length, 0) + " séries</p>" +
      '<div class="field"><span>RPE de la séance' +
        (rpes.length ? " — moyenne de tes séries : " + suggested : " — cible 6 en reprise") + "</span>" +
        rpeChips(suggested) + "</div>" +
      '<label class="field"><span>Note</span><input type="text" id="sess-note" class="input" maxlength="300" placeholder="Douleur, forme, remarque…"></label>' +
      // Une séance improvisée qui te plaît mérite d'être réutilisable.
      (session.template === "libre"
        ? '<label class="field"><span>Garder comme modèle (facultatif)</span>' +
          '<input type="text" id="sess-tpl" class="input" maxlength="60" placeholder="Nom du modèle, ex : Haut du corps"></label>'
        : "") +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="back">Retour</button>' +
        '<button type="button" class="btn btn-primary" data-act="save">Enregistrer</button>' +
      "</div>";
    const getRpe = bindRpe(body);
    body.querySelector('[data-act="back"]').addEventListener("click", function () { close(); openMuscuSession(session.template, true); });
    body.querySelector('[data-act="save"]').addEventListener("click", function () {
      const done = session.exercises.filter((e) => e.sets.length);
      const tplName = body.querySelector("#sess-tpl") ? body.querySelector("#sess-tpl").value.trim() : "";
      let tpl = null;
      if (tplName) {
        tpl = upsertTemplate({
          label: tplName, link: "auto",
          plan: done.map((e) => ({
            ex: e.ex, sets: e.sets.length,
            reps: Math.round(e.sets.reduce((a, s) => a + s.reps, 0) / e.sets.length)
          }))
        });
      }
      const w = addWorkout({
        type: "muscu", template: tpl ? tpl.id : session.template,
        label: tpl ? tpl.label : session.label,
        exercises: session.exercises, duration: dur, rpe: getRpe(),
        note: body.querySelector("#sess-note").value
      });
      session = null;
      close();
      if (w) toast("Séance enregistrée" + (tpl ? " · modèle créé" : "") + (w.linked ? " — case cochée" : ""));
    });
  });
}

// ------------------------------------------------------ éditeur de modèle

// Brouillon conservé entre deux ouvertures : la feuille se ferme et se
// rouvre à chaque ajout d'exercice, comme pour les recettes.
let tplDraft = null;

export function openTemplateEditor(key, resume) {
  const existing = key ? templateByKey(key) : null;
  if (existing && existing.builtin) { toast("Les séances A et B viennent de ta spec", "error"); return; }
  if (!resume && !existing) tplDraft = null;
  if (!tplDraft || tplDraft.id !== (existing ? existing.key : null)) {
    tplDraft = existing
      ? { id: existing.key, label: existing.label, link: existing.link, plan: existing.plan.map((p) => Object.assign({}, p)) }
      : { id: null, label: "", link: "auto", plan: [] };
  }

  openSheet(existing ? "Modifier le modèle" : "Nouveau modèle", function (body, close) {
    const links = [
      { v: "auto", l: "Automatique — coche Séance A ou B" },
      { v: "entr-seance-a", l: "Toujours Séance A" },
      { v: "entr-seance-b", l: "Toujours Séance B" },
      { v: "entr-cou", l: "Séance cou" },
      { v: "none", l: "Ne rien cocher" }
    ].filter((o) => o.v === "auto" || o.v === "none" || byId(o.v));

    function render() {
      body.innerHTML =
        '<label class="field"><span>Nom de la séance</span>' +
          '<input type="text" id="tpl-label" class="input" maxlength="60" placeholder="Ex : Haut du corps, Jambes lourdes" ' +
            'value="' + esc(tplDraft.label) + '"></label>' +

        '<div class="block-head" style="margin-top:14px"><h2>Exercices</h2>' +
          '<button type="button" class="btn btn-small btn-primary" data-act="tpl-add">+ Ajouter</button></div>' +

        (tplDraft.plan.length
          ? '<ul class="nut-foods">' + tplDraft.plan.map(function (p, i) {
              const ex = exerciseById(p.ex);
              if (!ex) return "";
              const isTime = ex.load === "temps";
              return '<li class="nut-food has-qty">' +
                '<div class="nut-food-main">' +
                  '<span class="nut-food-label">' + esc(ex.label) + "</span>" +
                  '<span class="nut-food-detail">' + esc((GROUP_MAP[ex.group] || {}).label || ex.group) + "</span>" +
                  '<div class="tpl-target">' +
                    '<label><span>Séries</span><input type="number" inputmode="numeric" min="1" max="12" data-sets="' + i + '" value="' + esc(p.sets) + '"></label>' +
                    '<label><span>' + (isTime ? "Secondes" : "Reps") + '</span><input type="number" inputmode="numeric" min="1" max="300" data-reps="' + i + '" value="' + esc(p.reps) + '"></label>' +
                    '<label><span>Tempo</span><input type="text" inputmode="numeric" maxlength="4" placeholder="0101" data-tempo="' + i + '" value="' + esc(p.tempo || "") + '"></label>' +
                  "</div>" +
                "</div>" +
                '<div class="tpl-move">' +
                  '<button type="button" data-act="tpl-up" data-i="' + i + '" aria-label="Monter"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
                  '<button type="button" data-act="tpl-down" data-i="' + i + '" aria-label="Descendre"' + (i === tplDraft.plan.length - 1 ? " disabled" : "") + ">↓</button>" +
                  '<button type="button" class="nut-del" data-act="tpl-del" data-i="' + i + '" aria-label="Retirer">✕</button>' +
                "</div>" +
              "</li>";
            }).join("") + "</ul>"
          : '<p class="empty">Aucun exercice. Ajoute-en au moins un.</p>') +

        '<p class="hint">Tempo, 4 chiffres : <strong>début du mouvement · montée · fin · descente</strong>, ' +
          "en secondes, X pour explosif. Ex : 0101 = pas de pause, 1 s de montée, 1 s de descente ; " +
          "3010 = 3 s de descente contrôlée.</p>" +

        '<label class="field"><span>Case du jour à cocher</span><select id="tpl-link" class="input">' +
          links.map((o) => '<option value="' + o.v + '"' + (tplDraft.link === o.v ? " selected" : "") + ">" + esc(o.l) + "</option>").join("") +
        "</select></label>" +

        '<div class="sheet-actions">' +
          (existing ? '<button type="button" class="btn btn-danger-ghost" data-act="tpl-remove">Supprimer</button>' : "") +
          '<button type="button" class="btn btn-primary" data-act="tpl-save">Enregistrer</button>' +
        "</div>";

      body.querySelector("#tpl-label").addEventListener("input", (e) => { tplDraft.label = e.target.value; });
      body.querySelector("#tpl-link").addEventListener("change", (e) => { tplDraft.link = e.target.value; });
      body.querySelectorAll("[data-sets]").forEach((el) => el.addEventListener("change", function () {
        tplDraft.plan[parseInt(el.dataset.sets, 10)].sets = parseInt(el.value, 10) || 1;
      }));
      body.querySelectorAll("[data-reps]").forEach((el) => el.addEventListener("change", function () {
        tplDraft.plan[parseInt(el.dataset.reps, 10)].reps = parseInt(el.value, 10) || 1;
      }));
      body.querySelectorAll("[data-tempo]").forEach((el) => el.addEventListener("input", function () {
        tplDraft.plan[parseInt(el.dataset.tempo, 10)].tempo = cleanTempo(el.value);
        el.value = tplDraft.plan[parseInt(el.dataset.tempo, 10)].tempo;
      }));
      body.querySelectorAll('[data-act="tpl-del"]').forEach((b) => b.addEventListener("click", function () {
        tplDraft.plan.splice(parseInt(b.dataset.i, 10), 1); render();
      }));
      body.querySelectorAll('[data-act="tpl-up"], [data-act="tpl-down"]').forEach((b) => b.addEventListener("click", function () {
        const i = parseInt(b.dataset.i, 10);
        const j = b.dataset.act === "tpl-up" ? i - 1 : i + 1;
        if (j < 0 || j >= tplDraft.plan.length) return;
        const tmp = tplDraft.plan[i]; tplDraft.plan[i] = tplDraft.plan[j]; tplDraft.plan[j] = tmp;
        render();
      }));

      body.querySelector('[data-act="tpl-add"]').addEventListener("click", function () {
        close();
        openExercisePicker(function (ex) {
          if (ex) tplDraft.plan.push({ ex: ex.id, sets: 3, reps: ex.load === "temps" ? 30 : 8 });
          openTemplateEditor(tplDraft.id, true);
        }, function () { openTemplateEditor(tplDraft.id, true); });
      });

      body.querySelector('[data-act="tpl-save"]').addEventListener("click", function () {
        if (!tplDraft.label.trim()) { body.querySelector("#tpl-label").focus(); return; }
        if (!tplDraft.plan.length) { toast("Ajoute au moins un exercice", "error"); return; }
        const saved = upsertTemplate(tplDraft);
        tplDraft = null;
        close();
        if (saved) toast(saved.label + " enregistré");
      });

      const rm = body.querySelector('[data-act="tpl-remove"]');
      if (rm) rm.addEventListener("click", function () {
        const id = tplDraft.id, label = tplDraft.label;
        tplDraft = null;
        close();
        confirmSheet("Supprimer ce modèle ?", "« " + label + " » sera retiré. Les séances déjà enregistrées restent.",
          "Supprimer", function () { removeTemplate(id); toast("Modèle supprimé"); });
      });
    }

    render();
  });
}

function openExercisePicker(onPick, onCancel) {
  let q = "", group = "all";
  openSheet("Ajouter un exercice", function (body, close) {
    let picked = false;
    function render() {
      const results = searchExercises(q, group);
      body.innerHTML =
        '<input type="search" id="ep-q" class="input input-lg" placeholder="Nom de l\'exercice…" value="' + esc(q) + '" autocomplete="off">' +
        '<select id="ep-group" class="input"><option value="all">Tous les groupes</option>' +
          MUSCLE_GROUPS.map((g) => '<option value="' + g.key + '"' + (group === g.key ? " selected" : "") + ">" + esc(g.icon + " " + g.label) + "</option>").join("") +
        "</select>" +
        (results.length
          ? '<ul class="food-results">' + results.map((e) =>
              '<li class="food-row" data-ex="' + esc(e.id) + '" role="button" tabindex="0"><span class="food-row-main">' +
              '<span class="food-row-label">' + esc(e.label) + (e.custom ? ' <span class="badge badge-quiet">perso</span>' : "") + "</span>" +
              '<span class="food-row-detail">' + esc((GROUP_MAP[e.group] || {}).label || e.group) + " · " +
                (e.load === "kg" ? "charge" : e.load === "temps" ? "temps" : "poids du corps") + "</span>" +
              '</span><span class="food-row-add" aria-hidden="true">+</span></li>').join("") + "</ul>"
          : '<p class="empty">Aucun exercice.</p>') +
        '<button type="button" class="btn btn-block btn-ghost" data-act="ep-new">+ Créer un exercice</button>';

      const qi = body.querySelector("#ep-q");
      let timer = null;
      qi.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          q = qi.value; const caret = qi.selectionStart; render();
          const nq = body.querySelector("#ep-q"); nq.focus(); nq.setSelectionRange(caret, caret);
        }, 200);
      });
      body.querySelector("#ep-group").addEventListener("change", (e) => { group = e.target.value; render(); });
      body.querySelectorAll(".food-row").forEach(function (row) {
        row.addEventListener("click", function () {
          picked = true; close(); onPick(exerciseById(row.dataset.ex));
        });
      });
      body.querySelector('[data-act="ep-new"]').addEventListener("click", function () {
        picked = true; close();
        openNewExercise(function (ex) { if (ex) onPick(ex); else if (onCancel) onCancel(); });
      });
    }
    render();
  }, { onClose: function () { /* si fermé sans choix, on revient à la séance */ } });
}

function openNewExercise(done) {
  openSheet("Nouvel exercice", function (body, close) {
    body.innerHTML =
      '<label class="field"><span>Nom</span><input type="text" id="ne-label" class="input" maxlength="60"></label>' +
      '<label class="field"><span>Groupe</span><select id="ne-group" class="input">' +
        MUSCLE_GROUPS.map((g) => '<option value="' + g.key + '">' + esc(g.icon + " " + g.label) + "</option>").join("") + "</select></label>" +
      '<label class="field"><span>Type de charge</span><select id="ne-load" class="input">' +
        '<option value="kg">Charge en kg</option><option value="corps">Poids du corps (reps)</option><option value="temps">Temps (secondes)</option></select></label>' +
      '<label class="field"><span>Consigne (facultatif)</span><input type="text" id="ne-cue" class="input" maxlength="200"></label>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-act="c">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-act="ok">Créer</button></div>';
    body.querySelector('[data-act="c"]').addEventListener("click", function () { close(); done(null); });
    body.querySelector('[data-act="ok"]').addEventListener("click", function () {
      const ex = addCustomExercise({
        label: body.querySelector("#ne-label").value, group: body.querySelector("#ne-group").value,
        load: body.querySelector("#ne-load").value, cue: body.querySelector("#ne-cue").value
      });
      if (!ex) { body.querySelector("#ne-label").focus(); return; }
      close(); done(ex);
    });
    body.querySelector("#ne-label").focus();
  });
}

export function openExerciseHistory(exId) {
  const ex = exerciseById(exId);
  if (!ex) return;
  const hist = exerciseHistory(exId).slice().reverse();
  openSheet(ex.label, function (body) {
    body.innerHTML =
      (hist.length
        ? '<ul class="hist-list">' + hist.map((h) =>
            "<li><strong>" + esc(new Date(h.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })) + "</strong> · " +
            h.sets + " séries" +
            (h.best ? " · meilleure " + (ex.load === "kg" ? h.best.weight + " kg × " + h.best.reps + " (1RM ≈ " + h.best.rm + ")" : h.best.reps + (ex.load === "temps" ? " s" : " reps")) +
              (h.best.rpe ? " @RPE " + h.best.rpe : "") : "") +
            (h.volume ? " · " + Math.round(h.volume) + " kg" : "") + "</li>").join("") + "</ul>"
        : '<p class="empty">Jamais pratiqué.</p>') +
      '<p class="hint">1RM estimé par la formule d\'Epley — pour comparer des séries à reps différentes, pas pour tenter un max.</p>';
  });
}

// ------------------------------------------------------- minuteur course

export function openIntervalTimer(presetKey) {
  const preset = RUN_PRESETS.find((p) => p.key === presetKey);
  if (presetKey === "custom" || !preset) { openCustomInterval(); return; }
  runInterval(preset);
}

function openCustomInterval() {
  openSheet("Minuteur personnalisé", function (body, close) {
    body.innerHTML =
      '<label class="field"><span>Mode</span><select id="ci-mode" class="input">' +
        '<option value="hiit">HIIT</option><option value="fractionne">Fractionné</option></select></label>' +
      '<div class="nf-grid">' +
        '<input type="number" id="ci-work" inputmode="numeric" placeholder="Travail (s)" min="5" max="1800" value="30">' +
        '<input type="number" id="ci-rest" inputmode="numeric" placeholder="Repos (s)" min="5" max="1800" value="30">' +
        '<input type="number" id="ci-rounds" inputmode="numeric" placeholder="Tours" min="1" max="60" value="8">' +
      "</div>" +
      '<div class="sheet-actions"><button type="button" class="btn btn-primary" data-act="go">Démarrer</button></div>';
    body.querySelector('[data-act="go"]').addEventListener("click", function () {
      const cfg = {
        key: "custom", mode: body.querySelector("#ci-mode").value,
        work: parseInt(body.querySelector("#ci-work").value, 10) || 30,
        rest: parseInt(body.querySelector("#ci-rest").value, 10) || 30,
        rounds: parseInt(body.querySelector("#ci-rounds").value, 10) || 8
      };
      cfg.label = (cfg.mode === "hiit" ? "HIIT " : "Fractionné ") + cfg.work + "/" + cfg.rest + " × " + cfg.rounds;
      close();
      runInterval(cfg);
    });
  });
}

function runInterval(cfg) {
  // Phases : échauffement implicite non compté ; travail / repos × tours.
  const phases = [];
  for (let r = 1; r <= cfg.rounds; r++) {
    phases.push({ label: "Travail", kind: "work", seconds: cfg.work, round: r });
    if (r < cfg.rounds) phases.push({ label: "Repos", kind: "rest", seconds: cfg.rest, round: r });
  }
  runPhases(cfg.label, phases, {
    subtitle: RUN_MODES[cfg.mode].label,
    onDone: function (elapsed, completed) {
      openRunForm({ mode: cfg.mode, duration: elapsed, work: cfg.work, rest: cfg.rest,
        rounds: completed ? cfg.rounds : Math.max(0, phases.filter((p) => p.done && p.kind === "work").length) });
    }
  });
}

// Feuille générique de phases chronométrées : sert aux minuteurs course et
// aux routines guidées.
function runPhases(title, phases, opts) {
  let idx = -1, startedAt = 0, finished = false, paused = false;
  const total = phases.reduce((a, p) => a + p.seconds, 0);

  openSheet(title, function (body, close) {
    const cd = makeCountdown(
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
  }, { onClose: function () { if (!finished) { finished = true; cd.stop(); releaseAwake(); } } });
}

export function openRunForm(prefill) {
  const p = prefill || {};
  openSheet("Enregistrer la sortie", function (body, close) {
    body.innerHTML =
      '<label class="field"><span>Type</span><select id="rf-mode" class="input">' +
        Object.keys(RUN_MODES).map((k) => '<option value="' + k + '"' + ((p.mode || "liss") === k ? " selected" : "") + ">" + esc(RUN_MODES[k].label) + "</option>").join("") +
      "</select></label>" +
      '<div class="nf-grid">' +
        '<input type="number" id="rf-min" inputmode="numeric" placeholder="Durée (min)" min="1" max="600" value="' + (p.duration ? Math.max(1, Math.round(p.duration / 60)) : "") + '">' +
        '<input type="number" id="rf-km" inputmode="decimal" placeholder="Distance (km)" min="0" max="200" step="0.1" value="' + (p.distance || "") + '">' +
      "</div>" +
      (p.rounds ? '<p class="hint">' + p.rounds + " tours de " + p.work + " s / " + p.rest + " s</p>" : "") +
      '<div class="field"><span>Effort ressenti (RPE)</span>' + rpeChips(p.rpe || null) + "</div>" +
      '<label class="field"><span>Note</span><input type="text" id="rf-note" class="input" maxlength="300" placeholder="Essoufflement, sensations…"></label>' +
      '<div class="sheet-actions"><button type="button" class="btn btn-ghost" data-act="c">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-act="ok">Enregistrer</button></div>';
    const getRpe = bindRpe(body);
    body.querySelector('[data-act="c"]').addEventListener("click", close);
    body.querySelector('[data-act="ok"]').addEventListener("click", function () {
      const min = parseFloat(body.querySelector("#rf-min").value) || 0;
      if (min <= 0) { body.querySelector("#rf-min").focus(); return; }
      const w = addWorkout({
        type: "course", mode: body.querySelector("#rf-mode").value,
        duration: Math.round(min * 60), distance: body.querySelector("#rf-km").value,
        work: p.work, rest: p.rest, rounds: p.rounds, rpe: getRpe(),
        note: body.querySelector("#rf-note").value
      });
      close();
      if (w) toast("Sortie enregistrée" + (w.linked ? " — cardio du jour coché" : ""));
    });
  });
}

// ------------------------------------------------------ routines guidées

export function openRoutine(key) {
  const r = ROUTINE_MAP[key];
  if (!r) return;
  const phases = r.phases.map((p) => Object.assign({}, p));
  runPhases(r.icon + " " + r.label, phases, {
    intro: r.intro,
    caution: r.caution,
    onDone: function (elapsed, completed) {
      const w = addWorkout({ type: "mobilite", routine: r.key, duration: elapsed, completed: completed });
      if (!completed) { toast("Routine interrompue à " + fmtDuration(elapsed)); return; }
      if (w) toast(r.label + " terminée" + (w.linked ? " — case du jour cochée" : ""));
    }
  });
}

// ------------------------------------------------------------ détail

export function openWorkout(id) {
  const w = workoutById(id);
  if (!w) return;
  openSheet("Séance", function (body, close) {
    let inner = "";
    if (w.type === "muscu") {
      inner = w.exercises.map(function (e) {
        const ex = exerciseById(e.ex) || { label: e.ex, load: "kg" };
        return "<p><strong>" + esc(ex.label) + "</strong><br>" +
          e.sets.map((s) => (ex.load === "temps" ? s.reps + " s" : s.reps + " reps") + (ex.load === "kg" ? " × " + s.weight + " kg" : "")).join(" · ") + "</p>";
      }).join("");
    } else if (w.type === "course") {
      inner = "<p>" + esc(RUN_MODES[w.mode].label) + " · " + fmtDuration(w.duration) +
        (w.distance ? " · " + w.distance + " km" : "") +
        (w.rounds ? "<br>" + w.rounds + " tours de " + w.work + " s / " + w.rest + " s" : "") + "</p>";
    } else {
      const r = ROUTINE_MAP[w.routine];
      inner = "<p>" + esc(r ? r.label : w.routine) + " · " + fmtDuration(w.duration) + (w.completed === false ? " · interrompue" : "") + "</p>";
    }
    body.innerHTML = '<p class="sub" style="margin:0">' + esc(w.date) + (w.rpe ? " · RPE " + w.rpe : "") + "</p>" +
      inner + (w.note ? '<p class="sheet-text">' + escLines(w.note) + "</p>" : "") +
      (w.linked ? '<p class="hint">A coché la case « ' + esc(w.linked) + " » ce jour-là.</p>" : "") +
      '<div class="sheet-actions"><button type="button" class="btn btn-danger-ghost" data-act="del">Supprimer</button></div>';
    body.querySelector('[data-act="del"]').addEventListener("click", function () {
      close();
      confirmSheet("Supprimer cette séance ?", "La case du jour qu'elle a cochée reste cochée.", "Supprimer",
        function () { removeWorkout(w.id); toast("Supprimée"); });
    });
  });
}

export function confirmDeleteWorkout(id) {
  const w = workoutById(id);
  if (!w) return;
  confirmSheet("Supprimer cette séance ?", "La case du jour qu'elle a cochée reste cochée.", "Supprimer",
    function () { removeWorkout(id); toast("Supprimée"); });
}

// ✕ sur une séance : suppression pour un modèle perso, masquage pour A et B.
export function confirmDeleteTemplate(key) {
  const t = templateByKey(key);
  if (!t) return;
  if (t.builtin) {
    confirmSheet("Masquer « " + t.label + " » ?",
      "Elle vient de ta spec : elle est masquée, pas supprimée. Un lien en bas de la liste permet de la réafficher.",
      "Masquer", function () { hideTemplate(key); toast(t.label + " masquée"); });
  } else {
    confirmSheet("Supprimer « " + t.label + " » ?",
      "Le modèle sera retiré. Les séances déjà enregistrées avec restent dans l'historique.",
      "Supprimer", function () { removeTemplate(key); toast(t.label + " supprimée"); });
  }
}

export function changeTemplateSort(key) { setTemplateSort(key); }
export function restoreHiddenTemplates() { unhideTemplates(); toast("Séances réaffichées"); }

export function hasSessionInProgress() { return !!session; }
export function resumeSession() { if (session) openMuscuSession(session.template, true); }
