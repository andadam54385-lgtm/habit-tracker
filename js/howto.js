// Modes d'emploi des tâches qui ne se devinent pas.
//
// Indexés par id d'item plutôt que stockés dans la graine : le contenu peut
// donc être corrigé sans migration, et n'encombre pas le stockage local.
//
// Ces gestes viennent de la spec ; les précautions ne remplacent pas un avis
// médical, elles rappellent les limites que la spec pose déjà.

export const HOWTO = {
  // ----------------------------------------------------------- cou & nuque
  "entr-cou": {
    intro: "Quatre mouvements, 2 à 3 fois par semaine. Les quatre premières semaines se font sans aucune charge : uniquement le poids de la tête, la main servant de résistance légère.",
    steps: [
      "**Flexion — 3 × 15.** Assis, dos droit. Pose la paume sur le front. Pousse la tête vers l'avant contre la main, qui résiste juste assez pour ralentir le mouvement. Descends le menton vers la poitrine en 2 secondes, remonte en 2 secondes.",
      "**Extension — 3 × 15.** Mains croisées derrière la tête. Pousse la tête vers l'arrière contre les mains, même tempo. Ne bascule jamais la tête loin en arrière : le mouvement s'arrête quand le regard atteint le plafond.",
      "**Flexion latérale — 2 × 12 de chaque côté.** Paume sur la tempe. Incline l'oreille vers l'épaule contre la résistance de la main. L'épaule ne monte pas — c'est la tête qui descend.",
      "**Shrugs — 3 × 12.** Debout, bras le long du corps (charge seulement après 4 semaines). Monte les épaules vers les oreilles, tiens 1 seconde en haut, redescends lentement. Ne roule pas les épaules : c'est un mouvement vertical."
    ],
    tempo: "2 secondes pour aller, 2 secondes pour revenir. Jamais de à-coups, jamais de mouvement rapide.",
    caution: "Arrêt immédiat en cas de douleur cervicale, de vertige ou de fourmillements dans les bras ou les mains. Ces trois signes ne sont pas de la fatigue : ils imposent l'arrêt et une mention au médecin."
  },

  "entr-machoire": {
    intro: "Travail postural et détente, pas de la musculation. L'objectif est la position de repos et le relâchement, pas la force.",
    steps: [
      "**Position de repos — à tenir passivement dans la journée.** Langue à plat contre le palais, pointe juste derrière les incisives sans les toucher. Lèvres fermées, dents qui ne se touchent pas (2 à 3 mm d'écart). Respiration par le nez.",
      "**Relâchement — 2 × 1 min.** Laisse la mâchoire tomber, bouche entrouverte, muscles complètement lâchés. C'est l'inverse du serrement : rien ne doit être contracté.",
      "**Massage des masséters — 2 min.** Trouve le muscle en serrant les dents : il gonfle sous les pommettes. Relâche, puis masse en petits cercles avec deux doigts, pression moyenne. Descends jusqu'à l'angle de la mâchoire.",
      "**Ouverture contrôlée — 2 × 10.** Langue au palais, ouvre lentement la bouche aussi loin que la langue reste collée, referme. Le mouvement doit rester rectiligne, sans déviation d'un côté."
    ],
    tempo: "5 à 10 minutes par jour, en plusieurs fois. La position de repos, elle, se tient toute la journée.",
    caution: "Ne force jamais l'ouverture. Un claquement, un blocage ou une douleur à l'articulation devant l'oreille relèvent d'un avis médical, pas d'un exercice."
  },

  // ---------------------------------------------------------------- visage
  "visage-matin": {
    intro: "Cinq couches, de la plus fluide à la plus épaisse. Chacune doit être absorbée avant la suivante.",
    steps: [
      "**Nettoyant.** Visage humide, masse 30 secondes du bout des doigts, rince à l'eau tiède — jamais chaude. Tamponne avec une serviette propre, ne frotte pas.",
      "**Vitamine C.** 3 à 4 gouttes sur peau encore légèrement humide. Étale sans masser. Attends 1 minute.",
      "**Acide hyaluronique.** Sur peau humide impérativement — sur peau sèche il pompe l'eau de la peau au lieu d'en apporter. Tapote pour faire pénétrer.",
      "**Hydratant.** Une noisette, en remontant du bas du visage vers le haut. Il scelle les couches précédentes.",
      "**SPF 50 — deux doigts.** C'est la mesure : deux bandes de crème sur l'index et le majeur, de la base à la pointe. Visage, oreilles, cou, nuque. Attends 15 minutes avant de sortir."
    ],
    tempo: "5 à 7 minutes en comptant les temps d'absorption.",
    caution: "La quantité de SPF est ce qui rate le plus souvent : moins de deux doigts et l'indice réel s'effondre bien en dessous de 50."
  },

  "visage-spf-retouche": {
    intro: "Une seule application le matin ne tient pas une journée dehors. La retouche de la mi-journée est la moitié du travail.",
    steps: [
      "**Vers 12-13 h**, avant la reprise de l'après-midi.",
      "**Stick, pas crème.** Passe 3 à 4 allers-retours appuyés sur chaque zone : front, nez, pommettes, mâchoire, oreilles, nuque.",
      "**Sur peau sèche.** Éponge la transpiration avant, sinon le stick glisse sans déposer.",
      "**Le stick reste dans le camion**, pas dans le sac que tu laisses chez toi."
    ],
    tempo: "30 secondes.",
    caution: ""
  },

  "visage-soir": {
    intro: "Deux temps d'attente de 20 minutes qui ne sont pas facultatifs : la trétinoïne appliquée sur peau humide pénètre trop vite et brûle.",
    steps: [
      "**Nettoyant**, comme le matin. Puis sèche complètement.",
      "**Attends 20 minutes.** La peau doit être parfaitement sèche. C'est le point qui fait la différence entre une montée tolérée et une peau à vif.",
      "**Trétinoïne — un petit pois pour tout le visage.** Cinq points : front, chaque joue, nez, menton. Étale en couche fine. Évite le contour des yeux, les ailes du nez et les commissures des lèvres.",
      "**Attends encore 20 minutes.**",
      "**Hydratant**, généreusement. Il calme sans annuler l'effet."
    ],
    tempo: "45 minutes en tout, dont 40 d'attente — lance la routine tôt dans la soirée.",
    caution: "Jamais de vitamine C le même soir. Jamais avec du rétinol. Pas d'exfoliant pendant toute la montée."
  },

  "visage-montee": {
    intro: "La montée en fréquence est ce qui évite l'irritation. Doubler la vitesse ne double pas les résultats, ça abîme la barrière cutanée.",
    steps: [
      "**Semaines 1-2 : 2 soirs par semaine.** Par exemple mardi et samedi.",
      "**Semaines 3-4 : 3 soirs par semaine.**",
      "**Semaines 5-8 : un soir sur deux.**",
      "**Ensuite : tous les soirs**, seulement si la peau le tolère sans rougeur ni desquamation persistante.",
      "**En cas d'irritation : recule d'un palier** pendant deux semaines avant de réessayer. Ce n'est pas un échec, c'est le fonctionnement normal."
    ],
    tempo: "8 semaines minimum pour arriver au quotidien.",
    caution: "Une purge est attendue entre la 4e et la 6e semaine : boutons, peau qui pèle. C'est normal et transitoire — ne pas arrêter à ce moment-là, c'est précisément là que la plupart abandonnent."
  },

  "visage-rasage": {
    intro: "Quatre règles qui limitent les poils incarnés et les irritations.",
    steps: [
      "**Après la douche**, jamais avant. La vapeur ramollit le poil pendant plusieurs minutes.",
      "**Premier passage dans le sens du poil.** Sur les joues il descend, dans le cou il remonte souvent : vérifie en passant la main à rebrousse-poil.",
      "**Pas de repassage** sur une zone déjà rasée, même si le résultat n'est pas parfait. C'est le repassage qui crée les irritations.",
      "**Après-rasage sans alcool.** L'alcool assèche et aggrave les rougeurs."
    ],
    tempo: "",
    caution: ""
  },

  // ------------------------------------------------------------ relaxation
  "relax-matin": {
    intro: "Respiration 5-5 : cinq secondes d'inspiration, cinq d'expiration. Six cycles par minute, le rythme qui fait redescendre le système nerveux.",
    steps: [
      "**Déclencheur : chaussures enfilées, main sur la poignée.** Tu ne sors pas avant.",
      "**Assis ou debout, dos droit.** Une main sur le ventre.",
      "**Inspire par le nez 5 secondes** — c'est le ventre qui se gonfle sous la main, pas la poitrine.",
      "**Expire par la bouche 5 secondes**, lèvres légèrement pincées.",
      "**30 cycles**, soit 5 minutes. Compte les cycles, pas les minutes."
    ],
    tempo: "5 minutes. App RespiRelax+ pour tenir le rythme sans compter.",
    caution: "À domicile, jamais en conduisant."
  },

  "relax-retour": {
    intro: "La session la plus importante des trois : elle sépare la journée de travail du reste de la soirée.",
    steps: [
      "**Déclencheur : contact coupé, devant chez toi.** Tu ne sors pas de la voiture avant d'avoir fini.",
      "**Mains sur les cuisses, dos contre le siège.**",
      "**Respiration 5-5**, exactement comme le matin : inspire 5 s par le nez, expire 5 s par la bouche.",
      "**30 cycles.** Si le mental part sur la journée, reviens au comptage sans t'en vouloir — c'est le mécanisme, pas un échec."
    ],
    tempo: "5 minutes. C'est celle à tenir tous les jours, même quand les deux autres sautent.",
    caution: "Moteur coupé, à l'arrêt."
  },

  "relax-coucher": {
    intro: "Respiration 4-8 : l'expiration deux fois plus longue que l'inspiration. C'est l'allongement de l'expiration qui déclenche l'endormissement.",
    steps: [
      "**Allongé sur le dos, lumière éteinte, téléphone posé loin.**",
      "**Inspire par le nez 4 secondes.**",
      "**Expire par la bouche 8 secondes**, lentement, jusqu'à vider complètement.",
      "**Environ 25 cycles**, soit 5 minutes. Si tu t'endors avant la fin, c'est réussi."
    ],
    tempo: "5 minutes.",
    caution: "Si l'expiration à 8 secondes force, commence à 4-6 et allonge sur quelques jours."
  },

  "relax-long": {
    intro: "Deux options au choix, 15 à 20 minutes, deux fois par semaine.",
    steps: [
      "**Jacobson — relaxation musculaire progressive.** Groupe par groupe, des pieds à la tête : contracte fort 5 secondes, relâche 20 secondes en observant la différence. Pieds, mollets, cuisses, fessiers, ventre, mains, bras, épaules, visage.",
      "**NSDR — repos profond sans sommeil.** Allongé, guidage audio, tu restes éveillé. Balayage du corps sans contraction.",
      "**Choisis selon l'état** : Jacobson quand le corps est tendu, NSDR quand c'est la tête qui tourne."
    ],
    tempo: "15 à 20 minutes, 2 fois par semaine.",
    caution: ""
  },

  // ----------------------------------------------------------- musculation
  "entr-muscu": {
    intro: "Full body, 3 exercices, 3 séries, en alternant deux séances. RPE 6 les deux premières semaines : il doit rester 4 répétitions en réserve à la fin de chaque série.",
    steps: [
      "**Séance A — Presse ou squat 3 × 8.** Pieds largeur d'épaules. Descends jusqu'à ce que les cuisses soient parallèles au sol, pas plus bas au début. Dos plaqué au dossier sur la presse, poitrine haute sur le squat.",
      "**Séance A — Développé couché 3 × 8.** Omoplates serrées et plaquées au banc, pieds au sol. Descends la barre au niveau des mamelons en 3 secondes, remonte sans verrouiller les coudes.",
      "**Séance A — Rowing 3 × 10.** Buste penché à 45°, dos plat. Tire vers le nombril en serrant les omoplates, coudes le long du corps. Contrôle la descente.",
      "**Séance B — Soulevé de terre roumain 3 × 8.** Jambes quasi tendues, genoux légèrement déverrouillés. Pousse les hanches vers l'arrière en gardant le dos plat, la barre frôle les cuisses. Descends jusqu'à sentir l'étirement des ischios, pas plus bas.",
      "**Séance B — Développé militaire 3 × 8.** Debout ou assis, gainage abdominal serré. Pousse au-dessus de la tête sans cambrer le bas du dos. La barre passe près du visage.",
      "**Séance B — Tirage vertical 3 × 10.** Poitrine haute, tire la barre vers le haut de la poitrine, pas derrière la nuque. Serre les omoplates en bas du mouvement.",
      "**Un circuit ou un modèle perso compte aussi** : n'importe quelle séance enregistrée dans Sport coche cette case."
    ],
    tempo: "40 minutes par séance. 2 minutes de récupération entre les séries. Charges à 50-60 % de ce que tu faisais avant l'arrêt. Zéro échec musculaire pendant les 8 premières semaines.",
    caution: "Règle absolue : sortir de séance en se sentant capable de la refaire. Et si une aggravation nette survient 24 à 48 h après — un épuisement, pas des courbatures — c'est à noter et à dire au médecin."
  },

  "entr-cardio": {
    intro: "LISS : effort continu de faible intensité. C'est la réponse au « cardio affreux » — pas un complément, pas un peptide.",
    steps: [
      "**Choisis le support** : marche rapide, vélo, rameur lent, tapis en pente.",
      "**Intensité : tu dois pouvoir tenir une conversation** sans être essoufflé. Si tu ne peux plus parler par phrases entières, ralentis.",
      "**30 à 45 minutes en continu**, sans fractionné.",
      "**2 à 3 fois par semaine**, idéalement les jours sans musculation."
    ],
    tempo: "30 à 45 minutes, 2 à 3 fois par semaine.",
    caution: "Si l'essoufflement est disproportionné dès les premières minutes, note-le : c'est une information pour les EFR et pour le médecin."
  },

  // ------------------------------------------------------------- santé
  "rdv-gen": {
    intro: "Téléconsultation de 10 à 15 minutes. Le temps est la contrainte : l'ordre des sujets détermine ce que tu obtiens.",
    steps: [
      "**Ouvre par les ordonnances**, pas par le récit. Les trois en une phrase : bilan sanguin, EFR avec test de réversibilité, trétinoïne 0,025 %.",
      "**Donne les marqueurs du bilan** — la liste est dans la rubrique Santé, lis-la telle quelle.",
      "**Puis le contexte, en 3 phrases** : fatigue depuis novembre 2025, aucune amélioration au repos ni après suppression du sucre et de l'alcool, asthme d'enfance et intolérance à l'effort.",
      "**Ensuite le moral**, et demande explicitement le courrier d'adressage vers un psychiatre.",
      "**Vérifie avant de raccrocher** que les trois ordonnances sont bien envoyées."
    ],
    tempo: "10 à 15 minutes.",
    caution: "Ne lance pas le sujet TDAH ici. Le temps y passerait et les ordonnances repartiraient à vide. Le diagnostic TDAH, c'est le rendez-vous 2, avec le psychiatre."
  },

  "rdv-labo": {
    intro: "Sans rendez-vous, avant le travail. Deux conditions non négociables sur l'horaire.",
    steps: [
      "**À jeun depuis 12 heures.** Eau autorisée, rien d'autre — ni café, ni sucre.",
      "**Prélèvement entre 7 h et 10 h impérativement.** La testostérone et le cortisol varient dans la journée : un prélèvement à 14 h rend ces deux dosages ininterprétables.",
      "**Apporte les deux ordonnances** : le bilan sanguin, et celle des EFR à déposer.",
      "**Pas d'entraînement la veille** : l'effort fausse plusieurs marqueurs."
    ],
    tempo: "7 h 30, environ 20 minutes sur place.",
    caution: "Ne démarre aucun nouveau complément dans les 2 à 3 semaines qui précèdent."
  }
};

export function howtoFor(id) {
  return HOWTO[id] || null;
}

export function hasHowto(id) {
  return !!HOWTO[id];
}
