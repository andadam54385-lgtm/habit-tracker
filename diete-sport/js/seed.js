// Données de départ — sous-ensemble Diète & Sport, issu du seed.js unique
// de "Suivi personnel" (specapplisuivi.md §4), scindé le 2026-09-24 pour
// séparer cette app de "Objectifs & Routine" (santé, relaxation, visage,
// apprentissages, démarches, et le cou/l'ergonomie sortis d'Entraînement).
// Les ids sont stables : ils servent de cibles à `blockedBy`.
// Ne pas les renommer sans prévoir une migration dans state.js.
// Note : quelques `blockedBy` pointaient vers des items santé (rdv-labo,
// mk-ige, mk-vitamines, mk-thyroide, rdv-gen) qui vivent maintenant dans
// l'app "Objectifs & Routine" — l'item concerné restera bloqué en
// permanence côté app (comportement sans casse, juste jamais débloqué
// automatiquement) : diete-allergie-cacahuete, comp-ashwagandha, comp-kcl.

export const SECTIONS = [
  { key: "diete", label: "Diète", short: "Diète", icon: "🍽️", subs: [] },
  { key: "complements", label: "Compléments & produits", short: "Compléments", icon: "💊", subs: [] },
  { key: "entrainement", label: "Entraînement", short: "Entraînement", icon: "🏋️", subs: [] }
];

export const SECTION_MAP = SECTIONS.reduce(function (acc, s) { acc[s.key] = s; return acc; }, {});

// Tags d'import -> destination (spec §4 bis)
export const IMPORT_TAGS = {
  "diete": { section: "diete", sub: null },
  "nutrition": { section: "diete", sub: null },
  "nutrition/plancher": { section: "diete", sub: null },
  "nutrition/rotation": { section: "diete", sub: null },
  "complements": { section: "complements", sub: null },
  "entrainement": { section: "entrainement", sub: null }
};

function it(o) {
  return Object.assign({
    sub: null,
    group: null,
    detail: "",
    warn: "",
    kind: "task",       // task | info | marqueur | rejected | queue
    status: "todo",     // todo | doing | done | blocked | optional | rejected | queue
    priority: "normal", // critical | normal | low
    blockedBy: null,
    recurrence: null,   // null | {type:"daily"} | {type:"week", perWeek:n}
    source: "seed",
    createdAt: 0,
    doneAt: null,
    pinned: false,
    keep: false      // true = jamais rangé par le ménage des actions ponctuelles
  }, o);
}

const daily = { type: "daily" };
function week(n) { return { type: "week", perWeek: n }; }

export const SEED_ITEMS = [
  // ============================================================== B. DIÈTE
  it({
    id: "diete-cibles", section: "diete", kind: "info", pinned: true,
    title: "Cibles quotidiennes",
    detail: "~3 000 kcal · ~190 g protéines · potassium 4 000-4 500 mg · sodium 3 000-3 500 mg"
  }),

  it({ id: "diete-repas-1", section: "diete", group: "Journée type", title: "7 h, maison", detail: "3 œufs + 80 g avoine + banane + purée d'amande" }),
  it({ id: "diete-repas-2", section: "diete", group: "Journée type", title: "Sac", detail: "Lait entier 500 ml, amandes, fruits" }),
  it({ id: "diete-repas-3", section: "diete", group: "Journée type", title: "Pause", detail: "Salade de riz ou boulettes ou wrap" }),
  it({ id: "diete-repas-4", section: "diete", group: "Journée type", title: "18 h, maison", detail: "Viande ou poisson + riz/pâtes + julienne + huile d'olive" }),
  it({ id: "diete-repas-5", section: "diete", group: "Journée type", title: "Avant de dormir", detail: "400 ml lait entier" }),

  // ===== Guide diète recomposé le 2026-09-07 =====
  it({
    id: "diete-guide-matin", section: "diete", group: "Guide — journée de référence",
    title: "7 h · Petit-déjeuner",
    detail: "3 œufs · avoine 80 g · beurre d'amande 30 g · miel 10-15 g · pépites de chocolat 15 g · lait 150 ml\nSmoothie : 1 orange pressée + 1 citron pressé + 1 kiwi + 1 banane + 20 g de lait écrémé en poudre\n≈ 1180 kcal · 51 g de protéines",
    recurrence: daily, pinned: true
  }),
  it({
    id: "diete-guide-sac", section: "diete", group: "Guide — journée de référence",
    title: "Sac du camion",
    detail: "Lait 150 ml · 1 fruit\n≈ 175 kcal",
    recurrence: daily
  }),
  it({
    id: "diete-guide-pause", section: "diete", group: "Guide — journée de référence",
    title: "Pause · Pâtes aux œufs",
    detail: "Pâtes maison : 150 g de semoule de blé dur + 2 œufs (ratio 100 g de farine pour 1 œuf)\n+ thon nature ou poulet 100 g · huile d'olive 10 ml\n≈ 865 kcal · 56 g de protéines",
    recurrence: daily
  }),
  it({
    id: "diete-guide-soir", section: "diete", group: "Guide — journée de référence",
    title: "18 h · Dîner",
    detail: "Bœuf haché 5 % 200 g · frites air fryer 250 g · julienne 150 g · flageolets 100 g · huile d'olive\n≈ 770 kcal · 56 g de protéines",
    recurrence: daily
  }),
  it({
    id: "diete-guide-oeufs", section: "diete", group: "Guide — journée de référence", kind: "info",
    title: "7 œufs par jour au total",
    detail: "3 au petit-déjeuner · 2 dans les pâtes · 2 répartis où tu veux.",
    warn: "≈ 1300 mg de cholestérol alimentaire. Sans effet chez la plupart des gens, mais 1 sur 4 y répond fortement — et ton HDL est à 0,41 avec des triglycérides à 1,69. Refaire le bilan lipidique après quelques semaines à ce rythme."
  }),
  it({
    id: "diete-guide-totaux", section: "diete", group: "Guide — journée de référence", kind: "info",
    title: "Totaux de la journée",
    detail: "≈ 3340 kcal (sauces comprises) · 181 g de protéines (2,1 g/kg) · 110 g de lipides · 330 g de glucides · ~28 g de fibres",
    pinned: true
  }),

  // ===== Sauces =====
  it({
    id: "diete-sauce-soja", section: "diete", group: "Sauces & assaisonnements",
    title: "Sauce soja — 15 ml",
    detail: "≈ 10 kcal · ~900 mg de sodium. Le sodium est un avantage chez toi (134 mEq/L en sept. 2025, sous la norme). Tamari si tu veux la version sans gluten."
  }),
  it({
    id: "diete-sauce-huitre", section: "diete", group: "Sauces & assaisonnements",
    title: "Sauce huître — 15 ml",
    detail: "≈ 50 kcal · ~10 g de glucides (elle est sucrée) · ~500 mg de sodium. À compter, contrairement à la sauce soja."
  }),
  it({
    id: "diete-sauce-frites", section: "diete", group: "Sauces & assaisonnements",
    title: "Sauce frites — crème, miel, moutarde, cayenne, paprika",
    detail: "≈ 150 kcal · ~12 g de sucre. À 3000+ kcal, les calories ne sont pas le sujet.\nVariante fromage blanc : ~70 kcal, plus de protéines et du calcium en prime. Moutarde, paprika et cayenne sont gratuits dans les deux cas."
  }),

  // ===== Ajouts qui comblent les trous =====
  it({
    id: "diete-laitpoudre", section: "diete", group: "Ce qui comble les trous",
    title: "Lait écrémé en poudre — 20 g dans le smoothie",
    detail: "~250 mg de calcium · 7 g de protéines · de l'iode. Invisible dans un smoothie aux fruits.\nRayon petit-déjeuner (Régilait, Gloria, marque du magasin) — pas du lait infantile. Étiquette : « lait écrémé » et rien d'autre.",
    warn: "C'est l'achat qui comble ton dernier trou : le calcium.",
    priority: "critical", recurrence: daily
  }),
  it({
    id: "diete-flageolets", section: "diete", group: "Ce qui comble les trous",
    title: "Flageolets — 100 g au dîner",
    detail: "7 g de protéines · 5 g de fibres · 350 mg de potassium · ~60 µg de folates · ~50 mg de calcium.\nEn conserve : égoutter et rincer enlève ~40 % du sodium.",
    recurrence: week(4)
  }),
  it({
    id: "diete-persil", section: "diete", group: "Ce qui comble les trous",
    title: "Persil frais — 10 g, ciselé sur n'importe quoi",
    detail: "~164 µg de vitamine K1 — au-dessus de la cible quotidienne (120 µg) à lui seul.\nC'est la réponse au manque de légumes verts sans avoir à en manger : ça disparaît dans les frites, les pâtes ou la viande.",
    warn: "Aucune supplémentation en vitamine K n'est nécessaire si le persil est là et que la vitamine D est bien prise avec K2.",
    recurrence: daily
  }),
  it({
    id: "diete-petitspois", section: "diete", group: "Ce qui comble les trous",
    title: "Petits pois surgelés — une poignée",
    detail: "5 g de protéines · 5 g de fibres · 65 µg de folates · 244 mg de potassium pour 100 g. Sucrés, pas amers — rien à voir avec les épinards ou le brocoli.\nAlternative : haricots verts (43 µg de vitamine K).",
    recurrence: week(3)
  }),

  // ===== Aromates & aliments ciblés (2026-09-08) =====
  it({
    id: "diete-cannelle", section: "diete", group: "Aromates & aliments ciblés",
    title: "🔴 Cannelle — prendre de la CEYLAN, pas celle que tu as",
    detail: "Méta-analyse 2025 sur 28 essais : −15,3 mg/dL de glycémie à jeun contre placebo. Modeste mais réel, et pertinent vu le profil insulinique (ratio TG/HDL à 4,1).\nÉtiquette à chercher : « cannelle de Ceylan » ou Cinnamomum verum.",
    warn: "La cannelle de Saigon en stock est celle qui contient LE PLUS de coumarine du marché — jusqu'à 1000× la Ceylan. Une cuillère à café ≈ 78 mg de coumarine, pour une dose tolérable de ~8,7 mg/jour (0,1 mg/kg, EFSA) : environ 9× la limite. La coumarine est hépatotoxique de façon dose-dépendante. Saigon en occasionnel uniquement, jamais en quotidien.",
    priority: "critical"
  }),
  it({
    id: "diete-grenade", section: "diete", group: "Aromates & aliments ciblés",
    title: "Jus de grenade — 200-250 ml, jours d'entraînement",
    detail: "Seul effet hormonal documenté de la liste boissons : baisse du cortisol post-musculation, donc ratio testostérone/cortisol amélioré (étude sur haltérophiles élite, notée le 2026-04-26).",
    warn: "~30 g de sucre la portion — à compter, et à réserver aux jours d'entraînement.",
    recurrence: week(3)
  }),
  it({
    id: "diete-avocat-role", section: "diete", group: "Aromates & aliments ciblés", kind: "info",
    title: "Avocat — pourquoi il mérite sa place",
    detail: "1 avocat : ~700 mg de potassium · 81 µg de folates (ton point faible) · 21 µg de vitamine K · lipides mono-insaturés.\nIl coche trois de tes cases d'un coup."
  }),
  it({
    id: "diete-ail-oignon", section: "diete", group: "Aromates & aliments ciblés", kind: "info",
    title: "Ail et oignon — bons aliments, mauvais arguments hormonaux",
    detail: "Ail : preuve quasi nulle sur la testostérone (déjà tranché le 2026-04-26). Vraies forces : cardiovasculaire et intestinale. 1 gousse fraîche/jour.\nOignon : les études « testostérone » sont chez le rat, avec des effets qui ne se retrouvent pas chez l'humain. Ce qu'il apporte réellement : fructanes prébiotiques (microbiote) et quercétine.",
    warn: "À manger pour le goût et le microbiote, pas comme levier hormonal."
  }),
  it({
    id: "diete-choline", section: "diete", group: "Aromates & aliments ciblés", kind: "info",
    title: "Bonus des 7 œufs : ~1000 mg de choline",
    detail: "Deux fois la cible. Précurseur de l'acétylcholine et protecteur hépatique — utile avec des triglycérides à 1,69."
  }),

  // ===== Alternatives =====
  it({
    id: "diete-alt-proteines", section: "diete", group: "Alternatives", kind: "info",
    title: "Protéines — équivalences pour 200 g",
    detail: "Bœuf haché 5 % : 274 kcal · 42 g de protéines · 10 g de lipides\nBœuf haché 15 % : 430 kcal · 38 g · 30 g\nPoulet (filet) : 220 kcal · 46 g · 4 g\nSaumon cru : 400 kcal · 40 g · 26 g — et des oméga-3\nThon nature (conserve) : 220 kcal · 46 g · 2 g"
  }),
  it({
    id: "diete-alt-feculents", section: "diete", group: "Alternatives", kind: "info",
    title: "Féculents — ce qui change",
    detail: "Pommes de terre : meilleure source de potassium (~420 mg/100 g). Frites air fryer ou au four gardent tout ; à l'eau tu en perds 30-50 %.\nPâtes aux œufs maison : +6,5 g de protéines par 100 g de farine, cuisson 2-3 min.\nRiz : le plus pauvre des trois en micronutriments — à garder pour varier, pas comme base."
  }),
  it({
    id: "diete-alt-legumes", section: "diete", group: "Alternatives", kind: "info",
    title: "Légumes — ce que chacun apporte",
    detail: "Julienne (céleri-rave, courgette, carottes) : 290 mg de potassium et de la vitamine A pour 100 g. Peu de fibres, peu de folates. 3-4×/semaine suffit.\nFlageolets : folates, fibres, protéines. Le meilleur de la liste.\nPetits pois : folates, fibres, un peu de protéines.\nPersil : vitamine K, en quantité ridicule."
  }),
  it({
    id: "diete-alt-poisson", section: "diete", group: "Alternatives", kind: "info",
    title: "Poisson cru — protocole parasites",
    detail: "Congeler 7 jours dans un congélateur domestique *** (−18 °C) avant de manger cru. La réglementation demande 24 h à −20 °C, mais un congélateur domestique n'atteint pas toujours −20 °C de façon homogène.\nSaumon plutôt que thon : moins de mercure, beaucoup plus d'oméga-3.",
    warn: "Sardines et maquereau écartés (goût). Oméga-3 pris en complément : lire EPA + DHA sur l'étiquette, pas « huile de poisson ». Cible 2 g/jour."
  }),
  it({
    id: "diete-alt-boissons", section: "diete", group: "Alternatives", kind: "info",
    title: "Boissons",
    detail: "Eau de coco dans le smoothie : 50-100 ml, ~250 mg de potassium. Totalement optionnelle — le smoothie donne déjà 900 mg sans elle.\nEau minérale calcique (Contrex, Courmayeur) : ~500 mg de calcium au litre. Écartée pour cause de bouteilles plastique — le lait en poudre la remplace.\nLait : pasteurisé, pas cru. Aucune différence nutritionnelle, risque bactérien en plus."
  }),

  // ===== Micronutriments =====
  it({
    id: "diete-micro", section: "diete", group: "Micronutriments — où tu en es", kind: "info",
    title: "Couvert",
    detail: "Potassium ~5275 mg (cible 4000-4500) · Calcium ~1080 mg (cible 1000) · Iode ~290 µg (cible 150) · Fer ~16 mg (cible 9) · Sélénium ~105 µg (cible 70) · Vitamine C ~190 mg (cible 110) · Magnésium ~360 mg + complément",
    pinned: true
  }),
  it({
    id: "diete-micro-reste", section: "diete", group: "Micronutriments — où tu en es", kind: "info",
    title: "Ce qui reste juste",
    detail: "Folates ~285 µg pour une cible de 330 — les flageolets et les petits pois comblent.\nFibres ~28 g pour une cible de 30.\nVitamine K : couverte par le persil, pas par la julienne.",
    warn: "Aucun multivitamine ne réglerait ces trous : le calcium y est plafonné à 100-200 mg et le potassium à ~99 mg par la réglementation. Tes deux vrais besoins sont précisément ceux qu'une gélule ne peut pas couvrir."
  }),

  it({ id: "diete-add-oeufs", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Œufs entiers, 3/jour" }),
  it({ id: "diete-add-boeuf", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Bœuf 5-15 %, 2-3×/semaine", detail: "Absent depuis longtemps." }),
  it({ id: "diete-add-poisson", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Sardines ou maquereau, 2×/semaine" }),
  it({ id: "diete-add-patates", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Pommes de terre", detail: "Meilleure source de potassium — remplace une partie du riz." }),
  it({ id: "diete-add-julienne", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Julienne de légumes (courgette, carotte)" }),
  it({ id: "diete-add-avocat", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Avocat, 1/jour" }),
  it({ id: "diete-add-bresil", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Noix du Brésil — 2/jour, jamais plus", warn: "Jamais plus de 2 par jour (sélénium)." }),
  it({ id: "diete-add-fruits", section: "diete", group: "À ajouter à l'alimentation actuelle", title: "Fruits, 2/jour" }),

  it({ id: "diete-rej-skyr", section: "diete", group: "Rejeté explicitement", title: "Skyr nature", kind: "rejected", status: "rejected" }),
  it({ id: "diete-rej-brocoli", section: "diete", group: "Rejeté explicitement", title: "Brocoli", kind: "rejected", status: "rejected" }),
  it({ id: "diete-rej-epinards", section: "diete", group: "Rejeté explicitement", title: "Épinards", kind: "rejected", status: "rejected" }),
  it({ id: "diete-rej-oeufsdurs", section: "diete", group: "Rejeté explicitement", title: "Œufs durs froids", kind: "rejected", status: "rejected" }),
  it({ id: "diete-rej-coco", section: "diete", group: "Rejeté explicitement", title: "Eau de coco pure", detail: "Mélangée, ça passe.", kind: "rejected", status: "rejected" }),

  it({ id: "diete-allergie-noisette", section: "diete", group: "Allergies / précautions", title: "Noisette", detail: "Provoque des aphtes.", kind: "info" }),
  it({ id: "diete-allergie-cacahuete", section: "diete", group: "Allergies / précautions", title: "Cacahuète — en suspens", detail: "Tant que l'éosinophilie n'est pas clarifiée.", status: "blocked", blockedBy: "rdv-labo" }),

  it({ id: "diete-boisson-jour", section: "diete", group: "Boissons", title: "Boisson de journée", detail: "1 L eau + 500 ml eau de coco + ¾ c. à café de sel + jus d'un citron" }),
  it({ id: "diete-boisson-presalle", section: "diete", group: "Boissons", title: "Pré-salle, 2-3 h avant", detail: "300 g betterave crue + 2 carottes + citron + gingembre — 2-3×/semaine" }),
  it({ id: "diete-boisson-post", section: "diete", group: "Boissons", title: "Post-training : jus de grenade 200-250 ml", detail: "Jours d'entraînement uniquement." }),
  it({
    id: "diete-piege", section: "diete", group: "Boissons", kind: "info",
    title: "Piège à éviter",
    detail: "Remplacer l'ice tea supprimé par un jus de fruits quotidien, plus concentré en sucre.",
    warn: "Piège identifié — ne pas y retomber."
  }),

  // ======================================================== C. COMPLÉMENTS
  it({
    id: "comp-regle", section: "complements", kind: "info", pinned: true,
    title: "Règle générale",
    detail: "Ne rien démarrer dans les 2-3 semaines avant la prise de sang.",
    warn: "Ne rien démarrer dans les 2-3 semaines avant la prise de sang."
  }),
  it({ id: "comp-creatine", section: "complements", group: "À prendre", title: "Créatine monohydrate 5 g/j", detail: "Le mieux prouvé.", recurrence: daily }),
  it({ id: "comp-magnesium", section: "complements", group: "À prendre", title: "Magnésium bisglycinate 300-400 mg, le soir", detail: "Vérifier la prise effective.", recurrence: daily }),
  it({ id: "comp-omega3", section: "complements", group: "À prendre", title: "Oméga-3 : 2 g EPA+DHA", detail: "Si peu de poisson gras.", recurrence: daily }),
  it({ id: "comp-vitd", section: "complements", group: "En attente", title: "Vitamine D3 + K2", detail: "Après dosage du 25-OH-D.", status: "blocked", blockedBy: "mk-vitamines" }),
  it({ id: "comp-zinc", section: "complements", group: "En attente", title: "Zinc bisglycinate 15-25 mg", detail: "Si carence — max 3 mois d'affilée.", status: "blocked", blockedBy: "rdv-labo" }),
  it({
    id: "comp-ashwagandha", section: "complements", group: "En attente",
    title: "Ashwagandha KSM-66 600 mg",
    detail: "Après le bilan thyroïdien.",
    warn: "Stimule la thyroïde — surtout pas avant le bilan thyroïdien.",
    status: "blocked", blockedBy: "mk-thyroide", priority: "critical"
  }),
  it({
    id: "comp-kcl", section: "complements", group: "En attente",
    title: "Sel de potassium (KCl)",
    detail: "Avis médical requis.",
    warn: "Marqueur rénal G2 sur un ancien bilan — ne pas démarrer sans avis médical.",
    status: "blocked", blockedBy: "rdv-gen", priority: "critical"
  }),
  it({
    id: "comp-inutiles", section: "complements", group: "Écarté — sans effet",
    title: "Tribulus, fenugrec, Tongkat Ali, maca « booster », DAA, ZMA",
    detail: "Sans effet — ne pas acheter.",
    kind: "rejected", status: "rejected"
  }),
  it({
    id: "comp-peptides", section: "complements", group: "Registre d'intérêt — peptides", kind: "info",
    title: "Peptides — aucun ne franchit les conditions préalables à ce jour",
    detail: "Rétatrutide, TRT, sécrétagogues GH, BPC-157, SS-31, MOTS-c, Cardiogen, Retinalamin.\nOrdre décidé : perte de gras → bilan → décision TRT. Pas l'inverse."
  }),

  // ======================================================= D. ENTRAÎNEMENT
  // (le cou, la mâchoire, le myofonctionnel, la cervicale et l'ergonomie
  // sont partis dans "Objectifs & Routine" — plus leur place ici)
  it({
    id: "entr-reprise", section: "entrainement", kind: "info", pinned: true,
    title: "Reprise progressive — après 2 semaines d'arrêt",
    detail: "Arrêt complet depuis ~21 août 2026, en diminution progressive depuis janvier. Semaines 1-2 : 2 séances, full body, 3 exercices, 3 séries, RPE 6, 40 min, charges à 50-60 %\nSemaines 3-4 : 3 séances, 4 exercices, RPE 7\nSemaines 5-8 : montée progressive, zéro échec musculaire",
    warn: "Règle absolue : sortir de séance en se sentant capable de la refaire."
  }),
  // Une seule case, à fréquence réglable : n'importe quelle séance la coche.
  it({
    id: "entr-muscu", section: "entrainement", group: "Musculation",
    title: "Musculation",
    detail: "N'importe quelle séance compte : A, B, un modèle perso ou un circuit. La fréquence se règle dans la fiche.",
    recurrence: week(3)
  }),
  it({
    id: "entr-alerte", section: "entrainement", group: "Musculation", kind: "info",
    title: "À signaler au médecin",
    detail: "Aggravation nette 24-48 h après une séance — pas des courbatures, un épuisement.",
    warn: "Aggravation nette 24-48 h après une séance : la noter et la dire au médecin."
  }),
  it({
    id: "entr-cardio", section: "entrainement", group: "Cardio",
    title: "Cardio",
    detail: "Marche, LISS, HIIT ou fractionné : chaque sortie enregistrée coche la case.\nSemaines 1-4 : marche uniquement, le temps de reconstruire le volume de musculation. Sprint GH et VO2max à partir de la semaine 5.",
    recurrence: week(2)
  }),
  it({
    id: "entr-marche", section: "entrainement", group: "Cardio",
    title: "Marche 20-30 min dehors",
    detail: "Le premier levier perdu fin novembre 2025 et jamais repris. Gratuit, ne fausse aucun bilan, agit sur l'énergie et l'humeur.",
    recurrence: daily
  }),
  it({
    id: "entr-marche-repas", section: "entrainement", group: "Cardio",
    title: "Marche 10 min après le petit-déjeuner",
    detail: "Le petit-déjeuner est le repas le plus glucidique (~123 g) — c'est là que la marche rend le plus. Le muscle capte le glucose SANS insuline (translocation GLUT4).\nMéta-analyses : baisse des pics de glucose et d'insuline par rapport à rester assis.\nSi possible, une seconde après le dîner : 10 + 10 valent mieux que 20 d'un coup.",
    recurrence: daily, priority: "critical", pinned: true
  }),
  it({
    id: "entr-sprint-gh", section: "entrainement", group: "Cardio",
    title: "1 sprint de 30 s — stimulus GH",
    detail: "UN SEUL effort de 30 s à fond, pas une séance de sprints. 10 min d'échauffement + 1 sprint + 5 min de retour au calme = 15 min.\nUn sprint de 30 s élève la GH pendant 90 à 120 min. Les répétitions ATTÉNUENT la réponse (rétrocontrôle par les acides gras libres) : avec 60 min de récupération, le 2e sprint n'ajoute rien.\nSur vélo, jour sans jambes.",
    warn: "À démarrer en semaine 5 seulement — pas avant que le volume de musculation soit reconstruit et la polygraphie faite.",
    status: "blocked", blockedBy: "rdv-polygraphie", recurrence: week(1)
  }),
  it({
    id: "entr-vo2max", section: "entrainement", group: "Cardio",
    title: "VO2max — 4×4 ou 30/30, séance séparée du sprint",
    detail: "4 min à ~90 % FCmax / 3 min de récupération, ×4. Le protocole le mieux étudié pour le VO2max.\nDose-dépendant : ≥ 75 min/semaine donne la meilleure amélioration. C'est l'inverse du sprint GH, qui demande un seul effort — les deux ne se font pas dans la même séance.\nSur vélo ou rameur : la course crée une interférence significative avec la musculation, pas le vélo.",
    warn: "Semaine 5 au plus tôt. Et si une séance te met par terre 24-48 h après, c'est le signal clinique à noter et à dire au médecin.",
    status: "blocked", blockedBy: "rdv-polygraphie", recurrence: week(1)
  })
];

// Correctifs d'items DÉJÀ injectés sur un appareil. applySeed() n'ajoute que
// les ids inconnus ; ces patches sont appliqués par applySeedPatches() dans
// state.js, une seule fois par version (state.seedPatchVersion).
// Règle : ne jamais modifier un patch publié — en ajouter un nouveau avec v+1.
export const SEED_PATCHES = [
  // ===== v2 — inventaire compléments confirmé, reprise (4 sept. 2026)
  { v: 2, id: "comp-regle", patch: {
      detail: "Manger MIEUX, pas MOINS. Améliorer la qualité dès maintenant (légumes, fruits, viande rouge, arrêt de l'ice tea), à maintenance. Pas de sèche ni de nouveau complément dans les 2-3 semaines avant une prise de sang.",
      warn: "Pas de déficit calorique marqué avant une prise de sang : il fait chuter testostérone, T3 et insuline — les trois marqueurs prioritaires." } },
  { v: 2, id: "comp-magnesium", patch: { detail: "Pris le soir, avec le zinc — confirmé le 3 sept." } },
  { v: 2, id: "comp-zinc", patch: { group: "À prendre", status: "todo", blockedBy: null, warn: "", recurrence: { type: "daily" },
      title: "Zinc 15 mg, le soir",
      detail: "Pris depuis 9 mois (démarré ~déc. 2025, en réaction à la fatigue). À déclarer au médecin : un zinc sérique refléterait le complément. 15 mg = moins de la moitié de la limite de sécurité, risque cuivre négligeable." } },
  { v: 2, id: "comp-vitd", patch: { detail: "Pas pris actuellement (oublis). Le 25-OH-D sera donc une vraie mesure de base. À démarrer après le dosage." } },
  { v: 2, id: "entr-reprise", patch: { title: "Reprise progressive — après 2 semaines d'arrêt",
      detail: "Arrêt complet depuis ~21 août 2026, en diminution progressive depuis janvier. Semaines 1-2 : 2 séances, full body, 3 exercices, 3 séries, RPE 6, 40 min, charges à 50-60 %\nSemaines 3-4 : 3 séances, 4 exercices, RPE 7\nSemaines 5-8 : montée progressive, zéro échec musculaire" } },
  { v: 2, id: "diete-allergie-cacahuete", patch: { blockedBy: "mk-ige", detail: "Tant que les IgE spécifiques (cacahuète incluse) ne sont pas faites." } },

  // ===== v3 — diète recomposée le 2026-09-07 (pâtes aux œufs, 7 œufs/jour, frites, sauces)
  { v: 3, id: "diete-cibles", patch: {
      title: "Cibles quotidiennes",
      detail: "~3150-3350 kcal · ~180 g de protéines (2,1 g/kg) · ~110 g de lipides · potassium 4000-4500 mg · sodium 3000-3500 mg · calcium 1000 mg" } },
  { v: 3, id: "diete-repas-1", patch: { status: "done", detail: "Remplacé par le guide ci-dessous — voir « 7 h · Petit-déjeuner »." } },
  { v: 3, id: "diete-repas-2", patch: { status: "done", detail: "Remplacé par « Sac du camion »." } },
  { v: 3, id: "diete-repas-3", patch: { status: "done", detail: "Remplacé par « Pause · Pâtes aux œufs »." } },
  { v: 3, id: "diete-repas-4", patch: { status: "done", detail: "Remplacé par « 18 h · Dîner »." } },
  { v: 3, id: "diete-repas-5", patch: { status: "done", detail: "Le lait du soir est intégré aux 300 ml quotidiens." } },
  { v: 3, id: "diete-add-bresil", patch: { status: "optional", priority: "low",
      title: "Noix du Brésil — devenues inutiles",
      detail: "7 œufs par jour apportent ~105 µg de sélénium, au-dessus de la cible de 70 µg. Plus besoin.",
      warn: "" } },
  { v: 3, id: "diete-add-julienne", patch: { recurrence: { type: "week", perWeek: 4 },
      detail: "Céleri-rave 33 % · courgette 33 % · carottes 33 %. ~290 mg de potassium et de la vitamine A pour 100 g. Pauvre en folates et en vitamine K — 3-4×/semaine suffit, ce n'est pas un pilier." } },
  { v: 3, id: "diete-add-patates", patch: { recurrence: { type: "daily" },
      title: "Pommes de terre — frites air fryer",
      detail: "250 g crus ≈ 1000 mg de potassium, ~280 kcal avec l'huile. Garde la peau, ne les fais pas tremper (le trempage lessive le potassium).",
      warn: "180 °C maximum, doré clair jamais brun — l'acrylamide se forme au brunissement." } },
  { v: 3, id: "diete-add-poisson", patch: {
      title: "Poisson — saumon ou thon cru, congelé 7 jours",
      detail: "Sardines et maquereau écartés (odeur et goût). Congélation 7 jours à −18 °C avant consommation crue. Saumon de préférence au thon (mercure, oméga-3).",
      warn: "Si le poisson ne rentre pas dans la routine : complément oméga-3, 2 g d'EPA+DHA — lire l'étiquette, pas le total d'huile." } },
  { v: 3, id: "comp-zinc", patch: {
      warn: "À réévaluer : avec 200 g de bœuf et 7 œufs par jour, l'apport alimentaire atteint ~15 mg. Avec le complément tu es à ~30 mg — sous la limite de 40 mg, mais probablement redondant. À poser au médecin, ça simplifierait aussi le dosage sanguin." } },
  { v: 3, id: "comp-vitd", patch: { group: "À prendre", status: "todo", blockedBy: null, recurrence: { type: "daily" },
      title: "Vitamine D3 + K2 — 2000-4000 UI/j",
      detail: "Redémarrée le 2026-09-06. À prendre au repas (elle a besoin de gras). Le K2 couvre le volet vitamine K non alimentaire.",
      warn: "À signaler au médecin : un dosage de 25-OH-D fait après le démarrage sera ininterprétable." } },
  { v: 3, id: "comp-omega3", patch: {
      title: "Oméga-3 — 2 g d'EPA + DHA",
      detail: "Devenu la source principale : sardines et maquereau écartés au goût.",
      warn: "Piège d'étiquette : lire EPA + DHA, pas « huile de poisson ». Une capsule à 1000 mg d'huile n'en contient souvent que 300 mg — il en faut alors 5 à 6." } },

  // ===== v4 — aromates, marche post-repas, sprint GH (2026-09-08)
  { v: 4, id: "diete-guide-matin", patch: {
      detail: "3 œufs · avoine 80 g · beurre d'amande 30 g · miel 10-15 g · pépites de chocolat 15 g · lait 150 ml · cannelle de Ceylan\nSmoothie : 1 orange pressée + 1 citron pressé + 1 kiwi + 1 banane + 20 g de lait écrémé en poudre\n≈ 1180 kcal · 51 g de protéines",
      warn: "Marche 10 min juste après — c'est le repas le plus glucidique de la journée." } },
  { v: 4, id: "diete-add-avocat", patch: {
      detail: "1 par jour. ~700 mg de potassium, 81 µg de folates, 21 µg de vitamine K, lipides mono-insaturés." } },
  { v: 4, id: "entr-cardio", patch: {
      detail: "Marche, LISS, HIIT ou fractionné : chaque sortie enregistrée coche la case.\nSemaines 1-4 : marche uniquement, le temps de reconstruire le volume de musculation. Sprint GH et VO2max à partir de la semaine 5." } },
  { v: 4, id: "diete-boisson-post", patch: {
      title: "Post-training : jus de grenade 200-250 ml",
      detail: "Voir la fiche dédiée dans « Aromates & aliments ciblés » — baisse documentée du cortisol post-musculation." } }
];
