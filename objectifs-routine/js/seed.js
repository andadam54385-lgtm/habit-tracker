// Données de départ — sous-ensemble Objectifs & Routine, issu du seed.js
// unique de "Suivi personnel" (specapplisuivi.md §4), scindé le 2026-09-24
// pour séparer cette app de "Diète & Sport".
// Les ids sont stables : ils servent de cibles à `blockedBy`.
// Ne pas les renommer sans prévoir une migration dans state.js.
// Note : quelques `blockedBy` pointaient vers des items diète/entraînement
// (rdv-polygraphie n'en fait pas partie, il reste ici) qui vivent
// maintenant dans "Diète & Sport" — sans effet ici, aucun item de cette
// app ne pointe vers l'autre.

export const SECTIONS = [
  {
    key: "sante", label: "Santé", short: "Santé", icon: "🩺", priority: true,
    subs: [
      { key: "rendezvous", label: "Rendez-vous" },
      { key: "ordonnances", label: "Ordonnances à demander" },
      { key: "adire", label: "À dire au médecin" },
      { key: "resultats", label: "Résultats" }
    ]
  },
  { key: "routine", label: "Routine", short: "Routine", icon: "🧘", subs: [] },
  { key: "relaxation", label: "Relaxation", short: "Relaxation", icon: "🌬️", subs: [] },
  { key: "visage", label: "Visage & apparence", short: "Visage", icon: "🪞", subs: [] },
  { key: "apprentissage", label: "Apprentissages", short: "Apprentissages", icon: "🧠", subs: [] },
  { key: "suivi", label: "Suivi quotidien", short: "Suivi", icon: "📈", subs: [] },
  { key: "inbox", label: "Boîte de réception", short: "Inbox", icon: "📥", subs: [] }
];

export const SECTION_MAP = SECTIONS.reduce(function (acc, s) { acc[s.key] = s; return acc; }, {});

// Tags d'import -> destination (spec §4 bis)
export const IMPORT_TAGS = {
  "sante/rendezvous": { section: "sante", sub: "rendezvous" },
  "sante/ordonnances": { section: "sante", sub: "ordonnances" },
  "sante/adire": { section: "sante", sub: "adire" },
  "sante/resultats": { section: "sante", sub: "resultats" },
  "routine": { section: "routine", sub: null },
  "relaxation": { section: "relaxation", sub: null },
  "visage": { section: "visage", sub: null },
  "apprentissage": { section: "apprentissage", sub: null },
  "suivi": { section: "suivi", sub: null }
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
  // ============================================================== A. SANTÉ
  it({
    id: "rdv-gen", section: "sante", sub: "rendezvous",
    title: "1 · Généraliste — téléconsultation",
    detail: "Qare / Livi, créneaux jusqu'à 22-23 h. Objet : les 3 ordonnances + parler du moral + demander un courrier d'adressage vers un psychiatre.",
    warn: "La téléconsultation dure 10-15 minutes. Ne pas y lancer le sujet TDAH — le temps y passerait et les ordonnances repartiraient à vide. Le moral, oui. Le diagnostic TDAH, c'est le rendez-vous 2.",
    priority: "critical", pinned: true
  }),
  it({
    id: "rdv-labo", section: "sante", sub: "rendezvous",
    title: "1 bis · Laboratoire — sans rendez-vous",
    detail: "7 h 30, à jeun, avant le travail. Prise de sang + dépôt de l'ordonnance EFR.",
    status: "blocked", blockedBy: "rdv-gen"
  }),
  it({
    id: "rdv-psychiatre", section: "sante", sub: "rendezvous",
    title: "2 · Psychiatre — visio",
    detail: "Annuaire HyperSupers / TDAH France. TDAH, dyslexie, moral. C'est le point d'entrée du diagnostic, pas le généraliste.",
    priority: "critical", pinned: true
  }),
  it({
    id: "rdv-psychologue", section: "sante", sub: "rendezvous",
    title: "3 · Psychologue — cabinet",
    detail: "Distanciel seulement en soupape. Thérapie des schémas, suivi de fond.",
    status: "blocked", blockedBy: "rdv-psychiatre"
  }),
  it({
    id: "rdv-coiffeur", section: "sante", sub: "rendezvous",
    title: "Coiffeur spécialisé bouclés",
    detail: "Finition, plus prioritaire depuis l'amélioration.",
    status: "optional", priority: "low"
  }),

  // ---- Ajoutés après la téléconsultation du 4 septembre 2026 ----
  it({
    id: "rdv-polygraphie", section: "sante", sub: "rendezvous",
    title: "🔴 Polygraphie ventilatoire nocturne — PRIORITÉ N°1",
    detail: "Hypothèse principale depuis le 4 sept. : apnée du sommeil (ronflement important). Examen à domicile, remboursé, prescrit par le médecin traitant ou un pneumologue.\nElle explique par un seul mécanisme : fatigue non réparée par le repos, chute de testostérone (axe gonadique supprimé), TG ↑ / HDL ↓, prise de poids, intolérance à l'effort.",
    warn: "Point discordant à signaler : l'hématocrite a baissé (48,6 → 44,1 %) alors que l'apnée tend plutôt à l'élever.",
    priority: "critical", pinned: true
  }),
  it({
    id: "rdv-medecin-traitant", section: "sante", sub: "rendezvous",
    title: "0 · Médecin traitant en présentiel — à déclarer",
    detail: "Recommandé par le médecin le 4 sept. Une fatigue de 10 mois ne se gère pas en téléconsultations successives. C'est lui qui prescrira le bilan sanguin, l'EFR et la trétinoïne.\nDeux prescripteurs déjà connus : Dr Claire Delage (2025), Dr Emma Laxou Huin (2026).",
    priority: "critical", pinned: true
  }),
  it({
    id: "rdv-irm", section: "sante", sub: "rendezvous",
    title: "Clarifier l'indication de l'IRM",
    detail: "Évoquée le 4 sept. sans précision. Question à poser : « l'IRM, c'est pour quoi exactement — et est-ce lié au contrôle ophtalmologique ? »\nSi les deux sont liés (recherche hypophysaire), le bilan hormonal — prolactine, LH, FSH — devient prioritaire AVANT l'IRM.",
    priority: "critical"
  }),
  it({
    id: "rdv-ophtalmo", section: "sante", sub: "rendezvous",
    title: "Contrôle ophtalmologique + lentilles",
    detail: "Évoqué le 4 sept. Myopie : correction à jour, lentilles comme alternative aux lunettes, et passage obligé vers la chirurgie réfractive (vue stable 2 ans requise). Clôt la question « peptide pour la rétine »."
  }),
  it({
    id: "rdv-kine", section: "sante", sub: "rendezvous",
    title: "Kinésithérapeute — cervicalgies + lombalgies",
    detail: "Indication type chez un travailleur manuel. Prescriptible par le médecin, remboursé.\nMéta-analyse sur 7 723 conducteurs professionnels : lombalgie chez 39 % sur 7 jours, 53 % sur 12 mois. Facteurs les mieux établis : mauvaise posture de conduite (OR 2,37) et manutention manuelle (OR 2,23) — tu as les deux, plus les vibrations.",
    priority: "critical"
  }),

  it({
    id: "ord-bilan", section: "sante", sub: "ordonnances",
    title: "Bilan sanguin",
    detail: "Prélèvement matinal à jeun, entre 7 h et 10 h — impératif pour la testostérone.",
    status: "blocked", blockedBy: "rdv-gen"
  }),
  it({
    id: "ord-efr", section: "sante", sub: "ordonnances",
    title: "EFR — épreuves fonctionnelles respiratoires",
    detail: "Avec test de réversibilité.",
    status: "blocked", blockedBy: "rdv-gen"
  }),
  it({
    id: "ord-tretinoine", section: "sante", sub: "ordonnances",
    title: "Trétinoïne 0,025 %",
    status: "blocked", blockedBy: "rdv-gen"
  }),

  it({ id: "mk-nfs", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "NFS", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-ferritine", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Ferritine + CRP", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-glycemie", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Glycémie à jeun + HbA1c", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-thyroide", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "TSH + T4 libre + T3 libre + anti-TPO", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-testo", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Testostérone totale + SHBG + LH + FSH + œstradiol + prolactine", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-cortisol", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Cortisol 8 h", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-vitamines", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "25-OH vitamine D, B12, folates, magnésium", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-iono", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Ionogramme sanguin (sodium + potassium)", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-hepatique", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Bilan hépatique", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-renal", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Créatinine / DFG", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-lipidique", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Bilan lipidique", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-insuline", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "Insuline à jeun (HOMA-IR)", detail: "Justifié par TG 0,64 → 1,69 et HDL 0,75 → 0,41 entre les deux bilans.", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),
  it({ id: "mk-ige", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "IgE totales + spécifiques (cacahuète, acariens, pollens, moisissures)", detail: "Éosinophilie apparue + asthme d'enfance + cacahuète quotidienne = un seul terrain atopique. Une rhinite allergique aggrave aussi le ronflement.", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan", priority: "critical" }),
  it({ id: "mk-eps", section: "sante", sub: "ordonnances", group: "Marqueurs du bilan sanguin", title: "EPS — parasitologie des selles, 3 prélèvements", detail: "Au plan depuis mai 2026, jamais réalisé.", kind: "marqueur", status: "blocked", blockedBy: "ord-bilan" }),

  it({ id: "adire-1", section: "sante", sub: "adire", title: "Fatigue depuis novembre 2025, aggravation progressive jusqu'en février 2026" }),
  it({ id: "adire-2", section: "sante", sub: "adire", title: "Aucune amélioration au repos, y compris pendant une période de chômage" }),
  it({ id: "adire-3", section: "sante", sub: "adire", title: "Aucune amélioration après suppression du sucre liquide, de l'alcool, des gâteaux industriels et arrêt total de l'entraînement" }),
  it({ id: "adire-4", section: "sante", sub: "adire", title: "Asthme diagnostiqué dans l'enfance + « cardio affreux » + intolérance à l'effort" }),
  it({ id: "adire-5", section: "sante", sub: "adire", title: "Éosinophilie à 9 % (617/mm³) sur un ancien bilan, jamais expliquée — hypothèse atopique" }),
  it({ id: "adire-6", section: "sante", sub: "adire", title: "Marqueur rénal G2 sur ce même ancien bilan" }),
  it({ id: "adire-7", section: "sante", sub: "adire", title: "Rétention d'eau et visage gonflé persistants" }),
  it({ id: "adire-8", section: "sante", sub: "adire", title: "Sommeil de 6-7 h habituellement", detail: "Données disponibles dans Sleep Cycle." }),
  it({ id: "adire-9", section: "sante", sub: "adire", title: "Moral bas, projets à l'arrêt, motivation en berne — demander un avis", priority: "critical" }),
  it({ id: "adire-10", section: "sante", sub: "adire", title: "Liste complète des compléments pris" }),
  it({ id: "adire-11", section: "sante", sub: "adire", title: "Testostérone 10,90 µg/L le 27/09/2025 (norme 2,50-8,36), sans aucun traitement hormonal", detail: "Prélevée à 11 h 40 — hors créneau 7-10 h — donc probablement encore plus haute le matin. Si le nouveau dosage revient sous 10,90, la chute réelle est plus importante que la comparaison brute.", priority: "critical", pinned: true }),
  it({ id: "adire-12", section: "sante", sub: "adire", title: "Hématocrite 48,6 → 44,1 % et hémoglobine 15,9 → 14,6 g/dL entre les deux bilans" }),
  it({ id: "adire-13", section: "sante", sub: "adire", title: "Triglycérides 0,64 → 1,69 et HDL 0,75 → 0,41 g/L — alors que je m'entraînais encore régulièrement", priority: "critical" }),
  it({ id: "adire-14", section: "sante", sub: "adire", title: "Douleurs cervicales fréquentes" }),
  it({ id: "adire-15", section: "sante", sub: "adire", title: "Poids 83 → 87 kg, masse grasse ~13 % → ~19 % (estimation), progressivement depuis fin 2025" }),
  it({ id: "adire-16", section: "sante", sub: "adire", title: "Lombalgies fréquentes en plus des cervicalgies — conduite, vibrations et port de charge", detail: "Demander une prescription de kinésithérapie." }),

  // ============================================================ B. ROUTINE
  // (le cou, la mâchoire, le myofonctionnel, la flexion craniocervicale et
  // l'ergonomie viennent de la section Entraînement de l'app d'origine —
  // ce ne sont pas des séances de sport, mais des routines de santé/posture)
  it({
    id: "entr-cou", section: "routine", group: "Cou",
    title: "Séance cou",
    detail: "Flexion 3×15 · Extension 3×15 · Flexion latérale 2×12 · Shrugs 3×12\n4 premières semaines sans charge.",
    warn: "Arrêt immédiat si douleur cervicale, vertige ou fourmillements.",
    recurrence: week(2)
  }),
  it({
    id: "entr-machoire", section: "routine", group: "Cou",
    title: "Mâchoire — position de repos et relâchement",
    detail: "Langue au palais, dents décollées, respiration nasale. Massage des masséters + ouverture contrôlée.",
    warn: "Ne jamais forcer l'ouverture. Claquement, blocage ou douleur devant l'oreille : avis médical.",
    recurrence: daily
  }),
  it({
    id: "entr-myofonctionnel", section: "routine", group: "Cou",
    title: "Thérapie myofonctionnelle — langue & pharynx",
    detail: "Les exercices qui réduisent l'index d'apnées d'environ 50 % chez l'adulte (méta-analyses, Cochrane 2020). Ce sont ces muscles-là qui comptent pour l'apnée — pas le cou. Routine chronométrée dans Routine.",
    warn: "Effet attendu à 8-12 semaines de pratique quotidienne. Ne remplace pas une CPAP si l'apnée est sévère.",
    recurrence: daily, priority: "critical", pinned: true
  }),
  it({
    id: "entr-cervical", section: "routine", group: "Cou & dos",
    title: "Flexion craniocervicale — le bon exercice pour les cervicalgies",
    detail: "Allongé sur le dos. Léger « oui » du menton vers la gorge, SANS décoller la tête et SANS contracter les muscles superficiels du cou. Tenir 10 s. 10 répétitions.\nCe n'est pas de la musculation : c'est de la rééducation. Ça doit être presque imperceptible — si tu forces, tu fais l'exercice de travers.\nMéta-analyse sur 25 essais / 1 166 participants : réduction modérée à large de la douleur, amélioration modérée de l'incapacité, meilleure posture de tête.",
    warn: "Agit sur la coordination neuromusculaire, pas sur la force à charge élevée. Remplace la séance cou tant que les douleurs sont présentes.",
    recurrence: daily, priority: "critical", pinned: true
  }),
  it({
    id: "ergo-siege", section: "routine", group: "Ergonomie & douleurs",
    title: "Siège du camion — dossier 100-110°",
    detail: "Soutien lombaire réglé sur le creux du dos, distance aux pédales qui n'oblige pas à tendre les jambes.\nLa posture de conduite est le facteur de risque le mieux documenté de la lombalgie du conducteur (OR 2,37).",
    warn: "C'est la combinaison posture + vibrations + port de charge qui fait le mal de dos, pas chaque facteur isolément. Le siège est celui sur lequel tu as prise."
  }),
  it({
    id: "ergo-telephone", section: "routine", group: "Ergonomie & douleurs",
    title: "Support téléphone à hauteur des yeux",
    detail: "GPS et scan consultés tête baissée toute la journée = flexion cervicale soutenue pendant des heures.\nLe geste le moins cher de toute la liste, et il retire la cause plutôt que de traiter le symptôme.",
    priority: "critical"
  }),
  it({
    id: "ergo-oreiller", section: "routine", group: "Ergonomie & douleurs",
    title: "Oreiller — ni trop haut, ni absent",
    detail: "Sur le dos : un oreiller FIN qui comble le creux de la nuque. Pas d'oreiller du tout fait basculer la tête en arrière — c'est une contrainte, pas une position neutre.\nSur le côté : plus épais, pour combler la largeur de l'épaule.\nAutotest : allongé, quelqu'un qui te regarde de profil doit voir ton visage à peu près horizontal — menton ni rentré vers la poitrine, ni basculé en arrière.",
    warn: "Matelas ferme = il faut plus d'oreiller. Matelas mou = moins, l'épaule s'enfonce."
  }),
  it({
    id: "ergo-cote", section: "routine", group: "Ergonomie & douleurs",
    title: "🎯 Dormir sur le côté — ça sert deux problèmes à la fois",
    detail: "Le ronflement va avec le sommeil sur le dos, et le sommeil sur le dos est ce qui aggrave l'apnée. Passer sur le côté sert donc la nuque ET l'apnée.\nPlus de 50 % des apnées sont positionnelles — chez ceux qui répondent, la réduction de l'index d'apnées atteint 69 à 79 %.",
    warn: "Ça change le besoin d'oreiller : il en faut un plus épais sur le côté.",
    recurrence: daily
  }),

  // ========================================================== E. RELAXATION
  it({
    id: "relax-matin", section: "relaxation",
    title: "Session du matin",
    detail: "Déclencheur : chaussures enfilées, avant d'ouvrir la porte. Respiration 5-5, 5 min.",
    recurrence: daily
  }),
  it({
    id: "relax-retour", section: "relaxation",
    title: "Session du retour — la plus importante",
    detail: "Déclencheur : contact coupé devant chez toi, tu ne sors pas de la voiture avant. Respiration 5-5, 5 min.",
    recurrence: daily, priority: "critical", pinned: true
  }),
  it({
    id: "relax-coucher", section: "relaxation",
    title: "Session du coucher",
    detail: "Déclencheur : allongé, lumière éteinte. Inspire 4 s / expire 8 s, 5 min.",
    recurrence: daily
  }),
  it({ id: "relax-long", section: "relaxation", title: "Jacobson ou NSDR — 15-20 min", recurrence: week(2) }),
  it({
    id: "relax-info", section: "relaxation", kind: "info",
    title: "Cadre",
    detail: "2 sessions par jour, à domicile — pas en voiture. App : RespiRelax+.\nObjectif : la session du retour tous les jours, celle du matin quand c'est possible."
  }),

  // ============================================================= F. VISAGE
  it({
    id: "visage-matin", section: "visage", group: "Matin",
    title: "Routine du matin",
    detail: "Nettoyant → vitamine C → acide hyaluronique → hydratant → SPF50, deux doigts.",
    recurrence: daily
  }),
  it({
    id: "visage-spf-retouche", section: "visage", group: "Matin",
    title: "Retouche SPF vers 12-13 h",
    detail: "Stick SPF dans le camion — travail en extérieur toute la journée.",
    warn: "Le stick doit rester dans le camion, sinon la retouche ne se fera pas.",
    recurrence: daily
  }),
  it({
    id: "visage-rasage", section: "visage", group: "Rasage", kind: "info",
    title: "Méthode de rasage",
    detail: "Après la douche · premier passage dans le sens du poil · pas de repassage · après-rasage sans alcool."
  }),
  it({
    id: "visage-soir", section: "visage", group: "Soir",
    title: "Routine du soir",
    detail: "Nettoyant → attendre 20 min → trétinoïne (petit pois) → attendre 20 min → hydratant.",
    status: "blocked", blockedBy: "ord-tretinoine",
    recurrence: week(2)
  }),
  it({
    id: "visage-montee", section: "visage", group: "Soir", kind: "info",
    title: "Montée en trétinoïne",
    detail: "S1-2 → 2 soirs/sem · S3-4 → 3 soirs/sem · S5-8 → 1 soir sur 2 · puis quotidien si toléré.",
    warn: "Purge attendue à S4-S6 : c'est normal, ne pas arrêter. Jamais de vitamine C le même soir · jamais avec le rétinol · pas d'exfoliants pendant la montée."
  }),
  it({ id: "visage-att-photo", section: "visage", group: "En attente", title: "Photo de référence des golfes" }),
  it({ id: "visage-att-apres", section: "visage", group: "En attente", title: "Après-shampoing à rincer" }),
  it({ id: "visage-att-sourcils", section: "visage", group: "En attente", title: "Sourcils — sous l'arcade uniquement" }),
  it({ id: "visage-att-barbe", section: "visage", group: "En attente", title: "Test barbe 4 mm" }),

  // ====================================================== G. APPRENTISSAGES
  it({
    id: "app-mentalisme", section: "apprentissage", group: "Actif — un seul à la fois",
    title: "Mentalisme — 20 min/jour",
    detail: "Quatre briques : techniques de mémoire · cold reading · magie mentale · présentation (80 % de l'effet).",
    recurrence: daily, pinned: true
  }),
  it({
    id: "app-livres", section: "apprentissage", group: "Actif — un seul à la fois", kind: "info",
    title: "Livres",
    detail: "Tricks of the Mind (Derren Brown) → 13 Steps to Mentalism (Corinda)"
  }),
  it({
    id: "app-methode", section: "apprentissage", group: "Actif — un seul à la fois", kind: "info",
    title: "Méthode",
    detail: "Un effet à la fois, jusqu'à l'exécuter sans y penser, puis le présenter à de vraies personnes."
  }),
  it({
    id: "app-anglais", section: "apprentissage", group: "En passif",
    title: "Anglais — VO sous-titrée",
    detail: "Bascule ce que tu regardes déjà. Zéro temps dédié.",
    status: "doing"
  }),
  it({ id: "app-file-charisme", section: "apprentissage", group: "File d'attente", title: "Charisme", detail: "Porté par le mentalisme.", kind: "queue", status: "queue" }),
  it({ id: "app-file-mensonge", section: "apprentissage", group: "File d'attente", title: "Détection du mensonge", kind: "queue", status: "queue" }),
  it({ id: "app-file-peptides", section: "apprentissage", group: "File d'attente", title: "Peptides", kind: "queue", status: "queue" }),
  it({ id: "app-file-reste", section: "apprentissage", group: "File d'attente", title: "Le reste", kind: "queue", status: "queue" }),

  // ====================================================== I. DÉMARCHES 2026-09-22
  // Objectifs courts arrêtés avec Claude le 22 sept. Ils sont classés par
  // ce qui débloque le reste : la BMW commande la trésorerie de novembre,
  // le RIB commande la paye du 10.
  it({
    id: "dem-bmw-prejudice", section: "suivi", keep: true, group: "Démarches",
    title: "1 · Faire chiffrer le préjudice de la BMW",
    priority: "critical",
    detail: "Devis garage ou expert automobile indépendant (~150-300 €, récupérables sur le responsable). Sans montant opposable, il n'y a rien à réclamer.",
    warn: "À FAIRE AVANT LA VENTE. Véhicule vendu, le préjudice ne se chiffre plus et le recours tombe."
  }),
  it({
    id: "dem-bmw-vente", section: "suivi", keep: true, group: "Démarches",
    title: "2 · Vendre la BMW",
    priority: "critical", blockedBy: "dem-bmw-prejudice",
    detail: "~1 000 € en l'état, plus 52 €/mois d'assurance qui tombent. Avec la sortie de 800 € pour sa sœur, c'est ce qui tient novembre et décembre.",
    warn: "Avant novembre. Sans cette vente, les deux mois repassent en négatif."
  }),
  it({
    id: "dem-caf", section: "suivi", keep: true, group: "Démarches",
    title: "3 · CAF — argent dû et prime recalculée",
    priority: "critical",
    detail: "Deux choses dans le même appel : le remboursement de leur erreur, et les 3 mois de RSA manquants dans le calcul de la prime d'activité.",
    warn: "Demander une trace écrite de la réclamation — c'est ce qui protège la date de la demande."
  }),
  it({
    id: "dem-pacifica", section: "suivi", keep: true, group: "Démarches",
    title: "4 · LRAR à Pacifica — accident du 21/01",
    detail: "Trois questions dans le même courrier : nom du gestionnaire adverse, démarches datées depuis janvier, et la garantie défense-recours est-elle mobilisée. Demander aussi le relevé d'information.",
    warn: "Six mois de silence. Sans réponse sous 2 mois : Médiation de l'Assurance."
  }),
  it({
    id: "dem-matmut", section: "sante", keep: true, group: "Démarches",
    title: "5 · Rappeler la Matmut — mutuelle",
    priority: "critical",
    detail: "La CSS n'ouvrira pas avant le 1er décembre : il est sans couverture sur octobre et novembre.",
    warn: "Obtenir la CSS permettra ensuite de résilier le contrat privé, même avant un an."
  }),
  it({
    id: "dem-banque-rib", section: "suivi", keep: true, group: "Démarches",
    title: "6 · Nouveau RIB à l'employeur — avant le 10",
    priority: "critical",
    detail: "Ouvrir le compte au Crédit Agricole, puis donner le RIB à l'employeur. C'est le seul geste qui protège la paye, et il ne dépend d'aucun délai bancaire.",
    warn: "La mobilité bancaire prend 22 jours ouvrés — bien trop long. Et une paye qui tombe sur un compte débiteur peut être absorbée."
  }),
  it({
    id: "dem-banque-dette", section: "suivi", keep: true, group: "Démarches",
    title: "7 · Appeler la SG pour un échéancier",
    blockedBy: "dem-banque-rib",
    detail: "Partir n'efface pas la dette. La laisser courir expose au recouvrement et au fichage Banque de France — ce qui bloquerait justement l'ouverture au Crédit Agricole.",
    warn: "Un compte débiteur ne peut pas être clôturé : la banque exige un solde à zéro."
  }),
  it({
    id: "dem-romain", section: "suivi", keep: true, group: "Démarches",
    title: "8 · Contacter Romain — Vinted",
    detail: "Commande groupée ou solo : c'est le blocage identifié le 17/09, et un seul message le lève.",
    warn: "Rien d'autre n'avance sur cette ligne tant que la question n'est pas posée."
  }),
  it({
    id: "dem-psy-rdv", section: "sante", sub: "rendezvous", keep: true, group: "Démarches",
    title: "9 · Prendre rendez-vous — Mon soutien psy",
    priority: "critical",
    detail: "12 séances par année civile, 50 € la séance, 60 % remboursés — et gratuit dès que la CSS est ouverte. Pas de lettre d'adressage nécessaire. Annuaire : monsoutienpsy.ameli.fr/recherche-psychologue",
    warn: "Accepté depuis le 30 août, toujours pas pris. La 1re séance est obligatoirement en présentiel, le suivi peut passer en visio. L'annuaire n'affiche aucune disponibilité : chercher les noms sur Doctolib."
  }),
  it({
    id: "dem-post-polygraphie", section: "sante", keep: true, group: "Démarches",
    title: "10 · Fixer les actions suivantes après le résultat de la polygraphie",
    blockedBy: "rdv-polygraphie",
    detail: "Pose de l'appareil le jeudi 24/09, nuit d'enregistrement du jeudi au vendredi. Selon l'IAH : orthèse d'avancée mandibulaire entre 15 et 30, PPC au-delà. Débloque aussi la reprise du cou et l'intensité à l'entraînement.",
    warn: "Apporter le bilan sanguin du 12/09 à la pose."
  }),
];

// Correctifs d'items DÉJÀ injectés sur un appareil. applySeed() n'ajoute que
// les ids inconnus ; ces patches sont appliqués par applySeedPatches() dans
// state.js, une seule fois par version (state.seedPatchVersion).
// Règle : ne jamais modifier un patch publié — en ajouter un nouveau avec v+1.
export const SEED_PATCHES = [
  // ===== v2 — téléconsultation du 4 sept. 2026, bilans PDF reçus
  { v: 2, id: "rdv-gen", patch: { status: "done", pinned: false, priority: "normal", warn: "",
      title: "1 · Généraliste — téléconsultation ✅ faite le 4 sept.",
      detail: "Résultat : pas de prise de sang prescrite (« c'est bon »). Hypothèse avancée : apnée du sommeil (ronflement). IRM et contrôle ophtalmologique évoqués. Conseil : être suivi par un médecin en présentiel." } },
  { v: 2, id: "rdv-labo", patch: { blockedBy: "ord-bilan", detail: "7 h 30, à jeun, avant le travail — dès qu'une ordonnance existe." } },
  { v: 2, id: "ord-bilan", patch: { blockedBy: "rdv-medecin-traitant",
      detail: "Refusé en téléconsultation le 4 sept. À obtenir du médecin traitant. Prélèvement 7 h-10 h à jeun — impératif pour la testostérone.",
      warn: "Argument : testostérone 10,90 documentée le 27/09/2025 sans traitement, hématocrite 48,6 → 44,1 %. Et si apnée confirmée, l'axe gonadique est fréquemment touché — le dosage confirme le mécanisme, ce n'est plus de la pêche." } },
  { v: 2, id: "ord-efr", patch: { blockedBy: "rdv-medecin-traitant" } },
  { v: 2, id: "ord-tretinoine", patch: { blockedBy: "rdv-medecin-traitant" } },
  { v: 2, id: "mk-ferritine", patch: { title: "CRP", detail: "Ferritine retirée : 124 µg/L le 18/05/2026, normale — inutile à redemander." } },
  { v: 2, id: "mk-vitamines", patch: { title: "25-OH vitamine D, B12, folates", detail: "Magnésium retiré : supplémenté depuis 9 mois, le dosage refléterait le complément. Vitamine D non supplémentée → vraie mesure de base." } },
  { v: 2, id: "mk-renal", patch: { status: "optional", detail: "Stable sur les deux bilans (G2 sans atteinte rénale). Uniquement si la question du sel de potassium est posée." } },
  { v: 2, id: "adire-3", patch: { title: "Aucune amélioration après suppression du sucre liquide, de l'alcool et des gâteaux industriels",
      detail: "Ne PAS dire « et l'arrêt du sport » : il ne date que de 2 semaines, trop court pour conclure — le médecin le renverrait." } },
  { v: 2, id: "adire-5", patch: { title: "Éosinophilie apparue entre les deux bilans : 279/mm³ (normal, réf < 400) le 27/09/2025 → 617/mm³ (réf < 500) le 18/05/2026",
      detail: "Jamais explorée. Terrain atopique : asthme d'enfance + cacahuète quotidienne." } },
  { v: 2, id: "adire-8", patch: { title: "Sommeil 6-7 h — et ronflement important", detail: "Données Sleep Cycle. Avec des apnées, même 8 h ne réparent pas.", priority: "critical" } },
  { v: 2, id: "adire-10", patch: { title: "Compléments : zinc 15 mg + magnésium bisglycinate, le soir, depuis 9 mois. Pas de vitamine D." } },
  { v: 2, id: "entr-cou", patch: { status: "blocked", blockedBy: "rdv-polygraphie", title: "Séance cou — EN PAUSE",
      detail: "En pause : douleurs cervicales fréquentes. Et un tour de cou élevé (> 43 cm) est un facteur de risque d'apnée — muscler le cou peut aller contre le dossier apnée. À trancher après la polygraphie.",
      warn: "Ne pas reprendre tant que les douleurs cervicales persistent et que la polygraphie n'est pas faite." } },

  // ===== v5 — cervicalgies, lombalgies, ergonomie (2026-09-08)
  { v: 5, id: "entr-cou", patch: {
      title: "Séance cou (hypertrophie) — SUSPENDUE",
      detail: "Suspendue pour deux raisons : cervicalgies actives, et un tour de cou élevé (> 43 cm) est un facteur de risque d'apnée.\nCe n'est PAS le bon exercice pour des cervicalgies : celui-là vise l'hypertrophie pour la mâchoire. Le bon, c'est la flexion craniocervicale — voir la fiche dédiée.",
      warn: "Ne pas reprendre tant que les douleurs persistent et que la polygraphie n'est pas faite." } },
  { v: 5, id: "adire-14", patch: {
      title: "Douleurs cervicales fréquentes — et lombalgies",
      detail: "Tête baissée toute la journée (GPS, scan) + posture de conduite + vibrations + port de charge. Demander une prescription de kiné." } }
];
