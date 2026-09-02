// Catalogue d'exercices, modèles de séances et routines guidées.
// Indexé par id comme les modes d'emploi : corrigeable sans migration.

export const MUSCLE_GROUPS = [
  { key: "jambes", label: "Jambes", icon: "🦵" },
  { key: "poitrine", label: "Poitrine", icon: "🫁" },
  { key: "dos", label: "Dos", icon: "🔙" },
  { key: "epaules", label: "Épaules", icon: "🏹" },
  { key: "bras", label: "Bras", icon: "💪" },
  { key: "gainage", label: "Gainage", icon: "🧱" },
  { key: "cou", label: "Cou & nuque", icon: "🧍" },
  { key: "circuit", label: "Circuit & cardio", icon: "🔥" }
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
  x("mollets-assis", "Mollets assis", "jambes", "Genoux à 90°, amplitude complète. Cible le soléaire, plus que le debout."),
  x("front-squat", "Front squat", "jambes", "Barre sur les deltoïdes avant, coudes hauts. Buste plus vertical que le squat arrière."),
  x("gobelet", "Squat gobelet", "jambes", "Haltère tenu contre la poitrine, coudes entre les genoux en bas. Bon pour apprendre la descente."),
  x("hack-squat", "Hack squat machine", "jambes", "Dos plaqué, pieds légèrement avancés. Ne verrouille pas les genoux en haut."),
  x("bulgare", "Squat bulgare", "jambes", "Pied arrière surélevé, poids sur la jambe avant. Descends à la verticale, sans avancer le genou."),
  x("fentes-marchees", "Fentes marchées", "jambes", "Grand pas, genou arrière proche du sol, pousse sur le talon avant pour avancer."),
  x("step-up", "Step-up", "jambes", "Monte en poussant sur la jambe du haut, sans t'aider de l'impulsion du pied au sol."),
  x("sdt-sumo", "Soulevé de terre sumo", "jambes", "Pieds très écartés, pointes ouvertes, prise entre les jambes. Dos plat, pousse le sol."),
  x("hip-thrust", "Hip thrust", "jambes", "Omoplates sur le banc, menton rentré. Pousse par les talons, pause 1 s en haut, ne cambre pas."),
  x("good-morning", "Good morning", "jambes", "Barre sur le haut du dos, hanches en arrière, dos plat. Charge légère, amplitude modérée."),
  x("adducteurs", "Adducteurs machine", "jambes", "Amplitude contrôlée, ne force pas l'ouverture en position d'étirement."),
  x("abducteurs", "Abducteurs machine", "jambes", "Buste droit, pas de balancement, retour lent."),
  // poitrine
  x("dc", "Développé couché", "poitrine", "Omoplates serrées et plaquées, pieds au sol. Barre au niveau des mamelons, descente en 3 s."),
  x("dc-incline", "Développé incliné haltères", "poitrine", "Banc à 30°, coudes à 45° du buste, pas écartés à 90°."),
  x("ecarte", "Écarté", "poitrine", "Coudes légèrement fléchis et fixes, mouvement en arc."),
  x("pompes", "Pompes", "poitrine", "Corps aligné, coudes proches du buste.", { load: "corps" }),
  x("dips", "Dips", "poitrine", "Buste légèrement penché, descends jusqu'à 90° aux coudes, pas plus.", { load: "corps" }),
  x("dc-halteres", "Développé haltères plat", "poitrine", "Amplitude plus grande qu'à la barre. Haltères qui se rejoignent sans se cogner en haut."),
  x("dc-decline", "Développé décliné", "poitrine", "Banc à -15°, barre au bas des pectoraux. Moins de contrainte sur l'épaule."),
  x("ecarte-poulie", "Écarté poulie", "poitrine", "Coudes fixes légèrement fléchis, croise légèrement les mains en fin de mouvement."),
  x("pec-deck", "Pec-deck", "poitrine", "Dos plaqué, coudes à hauteur des épaules, fermeture contrôlée."),
  x("pompes-inclinees", "Pompes inclinées", "poitrine", "Mains surélevées : version plus facile, utile en reprise.", { load: "corps" }),
  x("pull-over", "Pull-over haltère", "poitrine", "Allongé, bras quasi tendus, descends derrière la tête sans cambrer. Amplitude modérée."),
  // dos
  x("rowing", "Rowing barre", "dos", "Buste à 45°, dos plat. Tire vers le nombril en serrant les omoplates, coudes le long du corps."),
  x("rowing-halt", "Rowing haltère", "dos", "Un genou et une main sur le banc, dos plat, coude vers la hanche."),
  x("tirage-vertical", "Tirage vertical", "dos", "Poitrine haute, tire vers le haut de la poitrine, jamais derrière la nuque."),
  x("tractions", "Tractions", "dos", "Départ bras tendus, menton au-dessus de la barre, descente contrôlée.", { load: "corps" }),
  x("tirage-horizontal", "Tirage horizontal", "dos", "Buste fixe, tire vers le ventre, omoplates serrées en fin de mouvement."),
  x("sdt", "Soulevé de terre", "dos", "Barre contre les tibias, dos plat, pousse le sol avec les jambes. Zéro arrondi lombaire."),
  x("rowing-tbar", "Rowing T-bar", "dos", "Buste à 45°, poitrine sur le support si la machine en a un. Tire vers le nombril."),
  x("rowing-machine", "Rowing machine", "dos", "Poitrine calée, tire les coudes vers l'arrière, omoplates serrées en fin de course."),
  x("tirage-neutre", "Tirage prise neutre", "dos", "Paumes face à face, tire vers la poitrine. Prise plus confortable pour l'épaule."),
  x("tractions-supination", "Tractions supination", "dos", "Paumes vers toi, plus de biceps. Descente complète et contrôlée.", { load: "corps" }),
  x("pull-over-poulie", "Pull-over poulie", "dos", "Bras tendus, tire la barre vers les cuisses sans plier les coudes. Isole le grand dorsal."),
  x("hyperextension", "Hyperextension lombaire", "dos", "Monte jusqu'à l'alignement du corps, pas au-delà. Mouvement lent, jamais en balancier."),
  // épaules
  x("dm", "Développé militaire", "epaules", "Gainage serré, pas de cambrure lombaire. La barre passe près du visage."),
  x("elev-lat", "Élévations latérales", "epaules", "Coudes légèrement fléchis, monte jusqu'à l'horizontale, pas plus."),
  x("oiseau", "Oiseau", "epaules", "Buste penché, écarte en gardant les coudes fixes."),
  x("face-pull", "Face pull", "epaules", "Corde vers le visage, coudes hauts, rotation externe en fin de mouvement."),
  x("shrugs", "Shrugs", "epaules", "Mouvement vertical uniquement, pause 1 s en haut. Ne roule pas les épaules."),
  x("dm-halteres", "Développé haltères épaules", "epaules", "Assis dossier haut, haltères à hauteur d'oreilles au départ. Ne verrouille pas les coudes."),
  x("arnold", "Développé Arnold", "epaules", "Départ paumes vers toi, rotation pendant la montée. Charge légère, mouvement lent."),
  x("elev-frontales", "Élévations frontales", "epaules", "Monte jusqu'à l'horizontale, bras quasi tendus, sans balancer le buste."),
  x("rotation-externe", "Rotation externe poulie", "epaules", "Coude collé au corps à 90°, rotation vers l'extérieur. Charge légère : c'est de la coiffe des rotateurs."),
  // bras
  x("curl", "Curl biceps", "bras", "Coudes fixes le long du corps, pas d'élan du buste."),
  x("curl-marteau", "Curl marteau", "bras", "Prise neutre, même consigne : coudes fixes."),
  x("triceps-poulie", "Extension triceps poulie", "bras", "Coudes collés au buste, extension complète."),
  x("barre-front", "Barre au front", "bras", "Coudes fixes pointés au plafond, descends au front."),
  x("curl-pupitre", "Curl pupitre", "bras", "Aisselles calées sur le pupitre, ne tends jamais complètement les coudes en bas."),
  x("curl-incline", "Curl incliné", "bras", "Banc à 45°, bras qui pendent derrière le buste. Étirement maximal du biceps."),
  x("curl-poulie", "Curl poulie basse", "bras", "Tension constante sur toute l'amplitude, coudes fixes."),
  x("curl-inverse", "Curl inversé", "bras", "Prise pronation, travaille l'avant-bras. Charge plus légère qu'au curl classique."),
  x("triceps-corde", "Extension triceps à la corde", "bras", "Écarte la corde en fin d'extension, coudes collés au buste."),
  x("triceps-nuque", "Extension nuque haltère", "bras", "Un haltère à deux mains derrière la tête, coudes serrés et pointés au plafond."),
  x("kickback", "Kickback triceps", "bras", "Buste penché, bras collé au corps, extension complète sans bouger l'épaule."),
  x("dips-banc", "Dips sur banc", "bras", "Mains derrière soi sur un banc, descends jusqu'à 90° aux coudes. Épaules basses.", { load: "corps" }),
  // gainage
  x("planche", "Planche", "gainage", "Alignement tête-bassin-talons, fessiers serrés, respire.", { load: "temps" }),
  x("gainage-lat", "Gainage latéral", "gainage", "Hanche haute, corps en ligne, chaque côté.", { load: "temps" }),
  x("releve-jambes", "Relevé de jambes", "gainage", "Bas du dos plaqué, descente lente.", { load: "corps" }),
  x("pallof", "Pallof press", "gainage", "Résiste à la rotation, bras tendus devant, sans bouger le bassin."),
  x("crunch", "Crunch", "gainage", "Décolle seulement les omoplates, menton non collé. Expire en montant.", { load: "corps" }),
  x("crunch-poulie", "Crunch à la poulie", "gainage", "À genoux, enroule la colonne vers le sol. Ce sont les abdos qui tirent, pas les bras."),
  x("hollow", "Hollow body hold", "gainage", "Bas du dos plaqué au sol, bras et jambes tendus, épaules décollées.", { load: "temps" }),
  x("dead-bug", "Dead bug", "gainage", "Sur le dos, bras et jambe opposés qui descendent. Le bas du dos ne décolle jamais.", { load: "corps" }),
  x("mountain-climbers", "Mountain climbers", "gainage", "Position de pompe, genoux ramenés en alternance. Bassin stable, pas de rebond.", { load: "temps" }),
  x("russian-twist", "Russian twist", "gainage", "Assis, buste incliné, rotation contrôlée d'un côté à l'autre. Sans à-coup lombaire."),
  x("roue-abdo", "Roue abdominale", "gainage", "Déroule en gardant le bassin rétroversé. Amplitude courte au début, jamais de cambrure.", { load: "corps" }),
  x("releve-bassin", "Relevé de bassin", "gainage", "Allongé, jambes tendues vers le haut, décolle le bassin de quelques centimètres.", { load: "corps" }),

  // cou & nuque — 4 premières semaines sans charge, main en résistance légère
  x("cou-flexion", "Flexion du cou", "cou", "Paume sur le front, menton vers la poitrine contre la résistance. Tempo 2 s / 2 s.", { load: "corps" }),
  x("cou-extension", "Extension du cou", "cou", "Mains derrière la tête, pousse vers l'arrière. Le regard s'arrête au plafond, pas plus loin.", { load: "corps" }),
  x("cou-lateral", "Flexion latérale du cou", "cou", "Paume sur la tempe, oreille vers l'épaule. L'épaule ne monte pas.", { load: "corps" }),
  x("cou-rotation", "Rotation du cou", "cou", "Main sur la joue, tourne la tête contre la résistance. Amplitude modérée, jamais forcée.", { load: "corps" }),

  // circuit & cardio (CrossFit, Hyrox) : dans un circuit, chaque station se
  // compte en reps, en secondes ou en mètres, au choix.
  x("burpees", "Burpees", "circuit", "Poitrine au sol, saute et frappe dans les mains au-dessus de la tête.", { load: "corps" }),
  x("air-squat", "Air squat", "circuit", "Squat au poids du corps, cuisses sous la parallèle, talons au sol.", { load: "corps" }),
  x("wall-balls", "Wall balls", "circuit", "Squat complet puis lance la balle à la cible, réceptionne en redescendant."),
  x("kb-swing", "Kettlebell swing", "circuit", "Hanches en arrière puis extension explosive : les bras ne tirent pas."),
  x("thruster", "Thruster", "circuit", "Front squat enchaîné avec un développé au-dessus de la tête."),
  x("box-jump", "Box jump", "circuit", "Réception pieds à plat, genoux alignés. Redescends en marchant.", { load: "corps" }),
  x("corde", "Corde à sauter", "circuit", "Poignets souples, petits sauts, respire par le nez tant que possible.", { load: "temps" }),
  x("jumping-jacks", "Jumping jacks", "circuit", "Rythme régulier, bras tendus.", { load: "corps" }),
  x("course-circuit", "Course", "circuit", "Segment de course : en mètres ou en secondes selon le circuit.", { load: "temps" }),
  x("rameur", "Rameur", "circuit", "Jambes, puis buste, puis bras. Retour dans l'ordre inverse.", { load: "temps" }),
  x("ski-erg", "SkiErg", "circuit", "Tire avec le tronc et les dorsaux, pas seulement les bras.", { load: "temps" }),
  x("sled-push", "Sled push", "circuit", "Bras tendus ou fléchis, corps incliné, petits pas rapides."),
  x("sled-pull", "Sled pull", "circuit", "Tire à la corde main sur main, dos plat, hanches basses."),
  x("farmer-carry", "Farmer carry", "circuit", "Épaules basses, gainage serré, pas courts et rapides."),
  x("sandbag-lunges", "Fentes sandbag", "circuit", "Sac sur les épaules, genou arrière qui frôle le sol."),
  x("sit-ups", "Sit-ups", "circuit", "Mains qui touchent le sol derrière puis les pieds devant.", { load: "corps" })
];

// ------------------------------------------------------------- circuits
// Un circuit = des stations enchaînées, en tours fixes (« for time ») ou en
// AMRAP (le plus de tours possible dans le temps imparti).
export const CIRCUIT_UNITS = { reps: "reps", s: "s", m: "m" };
export const CIRCUIT_MODES = {
  rounds: { label: "Tours fixes", hint: "Fais tous les tours le plus vite possible. Le chrono tourne." },
  amrap: { label: "AMRAP", hint: "Le plus de tours possible avant la fin du temps." }
};
export const CIRCUIT_PRESETS = [
  { key: "circuit-corps", label: "Circuit poids du corps", mode: "rounds", rounds: 3, cap: 0,
    plan: [{ ex: "air-squat", qty: 15, unit: "reps" }, { ex: "pompes", qty: 10, unit: "reps" },
      { ex: "mountain-climbers", qty: 20, unit: "reps" }, { ex: "planche", qty: 30, unit: "s" }, { ex: "burpees", qty: 8, unit: "reps" }] },
  { key: "amrap-12", label: "AMRAP 12 min", mode: "amrap", rounds: 0, cap: 720,
    plan: [{ ex: "burpees", qty: 6, unit: "reps" }, { ex: "air-squat", qty: 12, unit: "reps" },
      { ex: "pompes", qty: 8, unit: "reps" }, { ex: "kb-swing", qty: 12, unit: "reps" }] },
  { key: "hyrox-light", label: "Hyrox light", mode: "rounds", rounds: 4, cap: 0,
    plan: [{ ex: "course-circuit", qty: 400, unit: "m" }, { ex: "ski-erg", qty: 250, unit: "m" },
      { ex: "sled-push", qty: 25, unit: "m" }, { ex: "burpees", qty: 10, unit: "reps" }, { ex: "rameur", qty: 250, unit: "m" },
      { ex: "farmer-carry", qty: 50, unit: "m" }, { ex: "sandbag-lunges", qty: 20, unit: "reps" }, { ex: "wall-balls", qty: 15, unit: "reps" }] }
];

export const EXERCISE_MAP = EXERCISES.reduce(function (a, e) { a[e.id] = e; return a; }, {});

// Modèles de séances (spec §D). Charges à 50-60 % au départ, RPE 6,
// deux minutes de repos entre les séries.
export const TEMPLATES = [
  { key: "A", label: "Séance A", item: "auto",
    plan: [{ ex: "presse", sets: 3, reps: 8 }, { ex: "dc", sets: 3, reps: 8 }, { ex: "rowing", sets: 3, reps: 10 }] },
  { key: "B", label: "Séance B", item: "auto",
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
