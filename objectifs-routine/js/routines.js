// Routines guidées : respiration, cou, mâchoire, myofonctionnel, cervicale.
// Reprises de exercises.js + sport.js (app "Diète & Sport") — extraites à
// part ici puisque cette app n'a pas le module Sport dans son ensemble
// (muscu/circuit/course), seulement le suivi des routines.

import { state, save, dayKey, byId, isDone, toggle, makeId, weekDayKeys } from "./state.js";

function phase(label, seconds, cue, kind) {
  return { label: label, seconds: seconds, cue: cue || "", kind: kind || "work" };
}

function breathing(inhale, exhale, cycles) {
  const out = [];
  for (let i = 1; i <= cycles; i++) {
    out.push(phase("Inspire", inhale, "Par le nez, le ventre se gonfle · cycle " + i + "/" + cycles, "in"));
    out.push(phase("Expire", exhale, "Par la bouche, lèvres pincées", "out"));
  }
  return out;
}

function sets(label, count, seconds, restSec, cue) {
  const out = [];
  for (let s = 1; s <= count; s++) {
    out.push(phase(label + " · série " + s + "/" + count, seconds, cue, "work"));
    if (s < count) out.push(phase("Repos", restSec, "Relâche, respire", "rest"));
  }
  return out;
}

// `item` = case du jour cochée une fois la routine terminée.
// "relax-auto-55" est résolu à l'exécution : matin avant midi, retour après.
export const ROUTINES = [
  { key: "resp-55", label: "Respiration 5-5", icon: "🌬️", item: "relax-auto-55",
    intro: "Six cycles par minute : le rythme qui fait redescendre le système nerveux. Une main sur le ventre.",
    phases: breathing(5, 5, 30) },
  { key: "resp-48", label: "Respiration 4-8", icon: "🌙", item: "relax-coucher",
    intro: "Expiration deux fois plus longue que l'inspiration : c'est elle qui déclenche l'endormissement. Allongé, lumière éteinte.",
    phases: breathing(4, 8, 25) },
  { key: "cou", label: "Cou & nuque", icon: "🧍", item: "entr-cou",
    intro: "Quatre mouvements, tempo 2 s / 2 s, la main en résistance légère. Sans charge les 4 premières semaines.",
    phases: [].concat(
      sets("Flexion — paume sur le front", 3, 60, 30, "15 répétitions, menton vers la poitrine contre la main"),
      [phase("Repos", 45, "", "rest")],
      sets("Extension — mains derrière la tête", 3, 60, 30, "15 répétitions, regard vers le plafond, pas plus loin"),
      [phase("Repos", 45, "", "rest")],
      sets("Flexion latérale gauche — paume sur la tempe", 2, 48, 30, "12 répétitions, l'oreille vers l'épaule"),
      sets("Flexion latérale droite", 2, 48, 30, "12 répétitions, l'épaule ne monte pas"),
      [phase("Repos", 45, "", "rest")],
      sets("Shrugs", 3, 48, 30, "12 répétitions, montée verticale, pause 1 s en haut")
    ),
    caution: "Arrêt immédiat : douleur cervicale, vertige, fourmillements." },
  { key: "machoire", label: "Mâchoire", icon: "😬", item: "entr-machoire",
    intro: "Détente et posture, pas de force. Langue au palais entre les exercices.",
    phases: [
      phase("Relâchement", 60, "Bouche entrouverte, mâchoire complètement lâchée", "work"),
      phase("Repos", 15, "Langue au palais, dents décollées", "rest"),
      phase("Relâchement", 60, "Rien ne doit être contracté", "work"),
      phase("Massage des masséters", 120, "Petits cercles sous les pommettes, pression moyenne, jusqu'à l'angle de la mâchoire", "work"),
      phase("Ouverture contrôlée · série 1/2", 40, "10 ouvertures lentes, langue collée au palais, sans déviation", "work"),
      phase("Repos", 20, "", "rest"),
      phase("Ouverture contrôlée · série 2/2", 40, "Mouvement rectiligne, jamais forcé", "work")
    ],
    caution: "Claquement, blocage ou douleur devant l'oreille : on arrête, avis médical." },
  // Protocole oropharyngé (Guimarães 2009) — celui des méta-analyses sur l'apnée :
  // réduction de l'index d'apnées-hypopnées d'environ 50 % chez l'adulte.
  { key: "myofonctionnel", label: "Myofonctionnel — langue & pharynx", icon: "👅", item: "entr-myofonctionnel",
    intro: "Les muscles qui comptent pour l'apnée : langue, voile du palais, joues — pas le cou. Assis, dos droit, respiration nasale. Un peu plus de 10 minutes.",
    phases: [
      phase("Glissé palatin", 60, "Pointe de la langue derrière les incisives, glisser vers l'arrière le long du palais — 20 fois, lentement", "work"),
      phase("Repos", 15, "Langue au palais, dents décollées", "rest"),
      phase("Ventouse", 60, "Toute la langue plaquée contre le palais, aspirer, tenir 5 s, relâcher — 8 fois", "work"),
      phase("Repos", 15, "", "rest"),
      phase("Voile du palais", 90, "Bouche ouverte, dire « A » par à-coups en sentant le fond de la gorge se soulever", "work"),
      phase("Repos", 15, "", "rest"),
      phase("Joue gauche", 45, "Pousser la joue vers l'extérieur avec la langue, le doigt résiste de l'extérieur — 10 fois", "work"),
      phase("Joue droite", 45, "Même chose côté droit — 10 fois", "work"),
      phase("Repos", 15, "", "rest"),
      phase("Mastication alternée", 90, "Mâcher à vide côté gauche puis droit, langue au palais, déglutir sans contracter les joues", "work"),
      phase("Repos", 15, "", "rest"),
      phase("Clics", 45, "Claquer la langue contre le palais, 20 fois, bien sonore", "work"),
      phase("Ventouse finale", 60, "Toute la langue au palais, tenir 10 s — 4 fois", "work")
    ],
    caution: "Aucune douleur attendue. Gêne à l'articulation de la mâchoire : réduire l'amplitude. Tous les jours — l'effet demande 8 à 12 semaines." },
  // Flexion craniocervicale — rééducation des fléchisseurs profonds.
  // Rien à voir avec la routine "cou" ci-dessus, qui vise l'hypertrophie.
  { key: "cervical", label: "Flexion craniocervicale", icon: "🧠", item: "entr-cervical",
    intro: "Allongé sur le dos, genoux pliés. Le mouvement doit être presque imperceptible : si tu sens les muscles du devant du cou se contracter, tu forces trop.",
    phases: [].concat(
      [phase("Installation", 30, "Sur le dos, genoux pliés, tête neutre. Une main derrière la nuque pour sentir qu'elle ne se soulève pas", "rest")],
      sets("Maintien", 10, 10, 10, "Léger « oui » du menton vers la gorge, tête posée. Respire normalement pendant les 10 s"),
      [phase("Retour au calme", 30, "Relâche complètement, laisse la nuque reposer", "rest")]
    ),
    caution: "Aucune douleur ne doit apparaître. Si les muscles superficiels du cou se contractent ou tremblent, réduis l'amplitude. Vertige ou fourmillements : on arrête." }
];

export const ROUTINE_MAP = ROUTINES.reduce(function (a, r) { a[r.key] = r; return a; }, {});

export function routineSeconds(r) {
  return r.phases.reduce((a, p) => a + p.seconds, 0);
}

function num(v) { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; }

export function workouts() { return state.workouts || []; }
export function workoutById(id) { return workouts().find((w) => w.id === id) || null; }
export function workoutsOn(key) { return workouts().filter((w) => w.date === key); }

export function weekWorkouts(ref) {
  const keys = weekDayKeys(ref);
  return workouts().filter((w) => keys.indexOf(w.date) >= 0);
}

export function weeklySummary(ref) {
  const ws = weekWorkouts(ref);
  return {
    total: ws.length,
    minutes: Math.round(ws.reduce((a, w) => a + (w.duration || 0), 0) / 60)
  };
}

function linkedItemFor(w) {
  const r = ROUTINE_MAP[w.routine];
  if (!r) return null;
  if (r.item === "relax-auto-55") return new Date().getHours() < 12 ? "relax-matin" : "relax-retour";
  return r.item;
}

function markLinkedItem(w) {
  if (w.completed === false) return null;
  const id = linkedItemFor(w);
  const item = id ? byId(id) : null;
  if (!item) return null;
  if (!isDone(item, w.date)) toggle(id, w.date);
  return id;
}

export function addWorkout(w) {
  if (!ROUTINE_MAP[w.routine]) return null;
  if (!state.workouts) state.workouts = [];
  const entry = {
    id: makeId("w"), type: "routine",
    date: /^\d{4}-\d{2}-\d{2}$/.test(w.date || "") ? w.date : dayKey(),
    at: Date.now(),
    duration: Math.max(0, Math.round(num(w.duration))),
    routine: w.routine,
    completed: w.completed !== false
  };
  state.workouts.push(entry);
  const linked = markLinkedItem(entry);
  entry.linked = linked;
  save();
  return entry;
}

export function removeWorkout(id) {
  if (!state.workouts) return;
  state.workouts = state.workouts.filter((w) => w.id !== id);
  save();
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) return Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0");
  return m + ":" + String(r).padStart(2, "0");
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
