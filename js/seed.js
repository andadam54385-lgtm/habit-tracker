// Données de départ — issues de specapplisuivi.md §4.
// Les ids sont stables : ils servent de cibles à `blockedBy`.
// Ne pas les renommer sans prévoir une migration dans state.js.

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
  { key: "diete", label: "Diète", short: "Diète", icon: "🍽️", subs: [] },
  { key: "complements", label: "Compléments & produits", short: "Compléments", icon: "💊", subs: [] },
  { key: "entrainement", label: "Entraînement", short: "Entraînement", icon: "🏋️", subs: [] },
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
  "diete": { section: "diete", sub: null },
  "nutrition": { section: "diete", sub: null },
  "nutrition/plancher": { section: "diete", sub: null },
  "nutrition/rotation": { section: "diete", sub: null },
  "complements": { section: "complements", sub: null },
  "entrainement": { section: "entrainement", sub: null },
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
    pinned: false
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
  it({
    id: "entr-reprise", section: "entrainement", kind: "info", pinned: true,
    title: "Reprise progressive — après 10 mois d'arrêt",
    detail: "Semaines 1-2 : 2 séances, full body, 3 exercices, 3 séries, RPE 6, 40 min, charges à 50-60 %\nSemaines 3-4 : 3 séances, 4 exercices, RPE 7\nSemaines 5-8 : montée progressive, zéro échec musculaire",
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
    id: "entr-cou", section: "entrainement", group: "Cou",
    title: "Séance cou",
    detail: "Flexion 3×15 · Extension 3×15 · Flexion latérale 2×12 · Shrugs 3×12\n4 premières semaines sans charge.",
    warn: "Arrêt immédiat si douleur cervicale, vertige ou fourmillements.",
    recurrence: week(2)
  }),
  it({
    id: "entr-machoire", section: "entrainement", group: "Cou",
    title: "Mâchoire — position de repos et relâchement",
    detail: "Langue au palais, dents décollées, respiration nasale. Massage des masséters + ouverture contrôlée.",
    warn: "Ne jamais forcer l'ouverture. Claquement, blocage ou douleur devant l'oreille : avis médical.",
    recurrence: daily
  }),
  it({
    id: "entr-cardio", section: "entrainement", group: "Cardio",
    title: "Cardio",
    detail: "Course, LISS, HIIT ou fractionné : chaque sortie enregistrée coche la case. Fréquence réglable dans la fiche.",
    recurrence: week(2)
  }),
  it({
    id: "entr-myofonctionnel", section: "entrainement", group: "Cou",
    title: "Thérapie myofonctionnelle — langue & pharynx",
    detail: "Les exercices qui réduisent l'index d'apnées d'environ 50 % chez l'adulte (méta-analyses, Cochrane 2020). Ce sont ces muscles-là qui comptent pour l'apnée — pas le cou. Routine chronométrée dans Sport.",
    warn: "Effet attendu à 8-12 semaines de pratique quotidienne. Ne remplace pas une CPAP si l'apnée est sévère.",
    recurrence: daily, priority: "critical", pinned: true
  }),
  it({
    id: "entr-marche", section: "entrainement", group: "Cardio",
    title: "Marche 20-30 min dehors",
    detail: "Le premier levier perdu fin novembre 2025 et jamais repris. Gratuit, ne fausse aucun bilan, agit sur l'énergie et l'humeur.",
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
  it({ id: "app-file-reste", section: "apprentissage", group: "File d'attente", title: "Le reste", kind: "queue", status: "queue" })
];

// Correctifs d'items DÉJÀ injectés sur un appareil. applySeed() n'ajoute que
// les ids inconnus ; ces patches sont appliqués par applySeedPatches() dans
// state.js, une seule fois par version (state.seedPatchVersion).
// Règle : ne jamais modifier un patch publié — en ajouter un nouveau avec v+1.
export const SEED_PATCHES = [
  // ===== v2 — téléconsultation du 4 sept. 2026, bilans PDF reçus, inventaire compléments confirmé
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
  { v: 2, id: "entr-cou", patch: { status: "blocked", blockedBy: "rdv-polygraphie", title: "Séance cou — EN PAUSE",
      detail: "En pause : douleurs cervicales fréquentes. Et un tour de cou élevé (> 43 cm) est un facteur de risque d'apnée — muscler le cou peut aller contre le dossier apnée. À trancher après la polygraphie.",
      warn: "Ne pas reprendre tant que les douleurs cervicales persistent et que la polygraphie n'est pas faite." } },
  { v: 2, id: "diete-allergie-cacahuete", patch: { blockedBy: "mk-ige", detail: "Tant que les IgE spécifiques (cacahuète incluse) ne sont pas faites." } }
];
