// Catalogue d'exercices, modèles de séances et routines guidées.
// Indexé par id comme les modes d'emploi : corrigeable sans migration.

export const MUSCLE_GROUPS = [
  { key: "jambes", label: "Jambes", icon: "🦵" },
  { key: "poitrine", label: "Poitrine", icon: "🫁" },
  { key: "dos", label: "Dos", icon: "🔙" },
  { key: "epaules", label: "Épaules", icon: "🏹" },
  { key: "bras", label: "Bras", icon: "💪" },
  { key: "gainage", label: "Gainage", icon: "🧱" }
];

export const GROUP_MAP = MUSCLE_GROUPS.reduce(function (a, g) { a[g.key] = g; return a; }, {});

// load : "kg" (charge), "corps" (poids du corps, on ne note que les reps),
// "temps" (gainage : on note des secondes à la place des reps).
function x(id, label, group, cue, opt) {
  return Object.assign({ id, label, group, cue, load: "kg" }, opt || {});
}

export const EXERCISES = [
  // jambes
  x("squat", "Squat", "jambes", "Pieds largeur d'épaules, poitrine haute. Descends jusqu'aux cuisses parallèles, pas plus bas au début."),
  x("presse", "Presse à cuisses", "jambes", "Dos plaqué au dossier, ne verrouille pas les genoux en haut."),
  x("sdt-roumain", "Soulevé de terre roumain", "jambes", "Jambes quasi tendues, hanches en arrière, dos plat. La barre frôle les cuisses. Arrêt à l'étirement des ischios."),
  x("fentes", "Fentes", "jambes", "Grand pas, genou avant au-dessus de la cheville, buste droit."),
  x("leg-curl", "Leg curl", "jambes", "Contrôle la descente, ne laisse pas la charge retomber."),
  x("leg-ext", "Leg extension", "jambes", "Tempo lent, sans à-coup sur le genou."),
  x("mollets", "Mollets debout", "jambes", "Amplitude complète, pause 1 s en haut."),
  // poitrine
  x("dc", "Développé couché", "poitrine", "Omoplates serrées et plaquées, pieds au sol. Barre au niveau des mamelons, descente en 3 s."),
  x("dc-incline", "Développé incliné haltères", "poitrine", "Banc à 30°, coudes à 45° du buste, pas écartés à 90°."),
  x("ecarte", "Écarté", "poitrine", "Coudes légèrement fléchis et fixes, mouvement en arc."),
  x("pompes", "Pompes", "poitrine", "Corps aligné, coudes proches du buste.", { load: "corps" }),
  x("dips", "Dips", "poitrine", "Buste légèrement penché, descends jusqu'à 90° aux coudes, pas plus.", { load: "corps" }),
  // dos
  x("rowing", "Rowing barre", "dos", "Buste à 45°, dos plat. Tire vers le nombril en serrant les omoplates, coudes le long du corps."),
  x("rowing-halt", "Rowing haltère", "dos", "Un genou et une main sur le banc, dos plat, coude vers la hanche."),
  x("tirage-vertical", "Tirage vertical", "dos", "Poitrine haute, tire vers le haut de la poitrine, jamais derrière la nuque."),
  x("tractions", "Tractions", "dos", "Départ bras tendus, menton au-dessus de la barre, descente contrôlée.", { load: "corps" }),
  x("tirage-horizontal", "Tirage horizontal", "dos", "Buste fixe, tire vers le ventre, omoplates serrées en fin de mouvement."),
  x("sdt", "Soulevé de terre", "dos", "Barre contre les tibias, dos plat, pousse le sol avec les jambes. Zéro arrondi lombaire."),
  // épaules
  x("dm", "Développé militaire", "epaules", "Gainage serré, pas de cambrure lombaire. La barre passe près du visage."),
  x("elev-lat", "Élévations latérales", "epaules", "Coudes légèrement fléchis, monte jusqu'à l'horizontale, pas plus."),
  x("oiseau", "Oiseau", "epaules", "Buste penché, écarte en gardant les coudes fixes."),
  x("face-pull", "Face pull", "epaules", "Corde vers le visage, coudes hauts, rotation externe en fin de mouvement."),
  x("shrugs", "Shrugs", "epaules", "Mouvement vertical uniquement, pause 1 s en haut. Ne roule pas les épaules."),
  // bras
  x("curl", "Curl biceps", "bras", "Coudes fixes le long du corps, pas d'élan du buste."),
  x("curl-marteau", "Curl marteau", "bras", "Prise neutre, même consigne : coudes fixes."),
  x("triceps-poulie", "Extension triceps poulie", "bras", "Coudes collés au buste, extension complète."),
  x("barre-front", "Barre au front", "bras", "Coudes fixes pointés au plafond, descends au front."),
  // gainage
  x("planche", "Planche", "gainage", "Alignement tête-bassin-talons, fessiers serrés, respire.", { load: "temps" }),
  x("gainage-lat", "Gainage latéral", "gainage", "Hanche haute, corps en ligne, chaque côté.", { load: "temps" }),
  x("releve-jambes", "Relevé de jambes", "gainage", "Bas du dos plaqué, descente lente.", { load: "corps" }),
  x("pallof", "Pallof press", "gainage", "Résiste à la rotation, bras tendus devant, sans bouger le bassin.")
];

export const EXERCISE_MAP = EXERCISES.reduce(function (a, e) { a[e.id] = e; return a; }, {});

// Modèles de séances (spec §D). Charges à 50-60 % au départ, RPE 6,
// deux minutes de repos entre les séries.
export const TEMPLATES = [
  { key: "A", label: "Séance A", item: "entr-seance-a",
    plan: [{ ex: "presse", sets: 3, reps: 8 }, { ex: "dc", sets: 3, reps: 8 }, { ex: "rowing", sets: 3, reps: 10 }] },
  { key: "B", label: "Séance B", item: "entr-seance-b",
    plan: [{ ex: "sdt-roumain", sets: 3, reps: 8 }, { ex: "dm", sets: 3, reps: 8 }, { ex: "tirage-vertical", sets: 3, reps: 10 }] },
  { key: "libre", label: "Séance libre", item: null, plan: [] }
];

export const TEMPLATE_MAP = TEMPLATES.reduce(function (a, t) { a[t.key] = t; return a; }, {});

export const REST_DEFAULT = 120;

// Minuteurs course : travail / repos en secondes, nombre de tours.
export const RUN_PRESETS = [
  { key: "tabata", label: "Tabata 20/10 × 8", mode: "hiit", work: 20, rest: 10, rounds: 8 },
  { key: "hiit-30", label: "HIIT 30/30 × 8", mode: "hiit", work: 30, rest: 30, rounds: 8 },
  { key: "hiit-40", label: "HIIT 40/20 × 10", mode: "hiit", work: 40, rest: 20, rounds: 10 },
  { key: "frac-1", label: "Fractionné 1'/1' × 6", mode: "fractionne", work: 60, rest: 60, rounds: 6 },
  { key: "frac-2", label: "Fractionné 2'/1' × 5", mode: "fractionne", work: 120, rest: 60, rounds: 5 },
  { key: "frac-3", label: "Fractionné 3'/1'30 × 4", mode: "fractionne", work: 180, rest: 90, rounds: 4 }
];

export const RUN_MODES = {
  liss: { label: "LISS — endurance", icon: "🚶", hint: "Tu dois pouvoir tenir une conversation. 30 à 45 min, 2 à 3 fois par semaine." },
  hiit: { label: "HIIT", icon: "⚡", hint: "Efforts courts et intenses. Pas plus de 2 par semaine pendant la reprise." },
  fractionne: { label: "Fractionné", icon: "🏃", hint: "Alternance allure rapide / récupération active. Échauffe-toi 10 min avant." }
};

// ------------------------------------------------------ routines guidées

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
    caution: "Claquement, blocage ou douleur devant l'oreille : on arrête, avis médical." }
];

export const ROUTINE_MAP = ROUTINES.reduce(function (a, r) { a[r.key] = r; return a; }, {});

export function routineSeconds(r) {
  return r.phases.reduce((a, p) => a + p.seconds, 0);
}
