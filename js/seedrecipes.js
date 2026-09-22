// Recettes de départ — celles construites avec Claude les 21 et 22 sept. 2026.
//
// Elles sont injectées une seule fois (drapeau `seededPatisseries` dans
// app.js), puis elles t'appartiennent : tu peux changer les quantités,
// ajouter ou retirer un ingrédient, supprimer la recette. Rien ne les
// réécrira ensuite — c'est volontaire, les tests en cuisine font bouger
// les grammages et l'app ne doit pas les ramener à la version d'origine.
//
// `portions` = le nombre de parts que donne la recette entière. L'app
// calcule ce que vaut UNE part, et la journée n'enregistre qu'un nombre
// de parts — décimal accepté, d'où le bouton « % mangé ».

export const SEED_RECIPES = [
  // ------------------------------------------------------------ pâtisserie
  {
    id: "rec-brownie",
    label: "Brownie fondant",
    portions: 9,
    items: { "chocolat-noir": 100, beurre: 80, oeuf: 2, sucre: 60, farine: 50 }
  },
  {
    id: "rec-brownie-amande",
    label: "Brownie fondant (poudre d'amande)",
    portions: 9,
    items: { "chocolat-noir": 100, beurre: 80, oeuf: 2, sucre: 60, amande: 60 }
  },
  {
    id: "rec-cookies",
    label: "Cookies moelleux",
    portions: 12,
    items: { farine: 120, beurre: 80, cassonade: 70, oeuf: 1, "pepites-chocolat": 100 }
  },
  {
    id: "rec-brookie",
    label: "Brookie (brownie + cookie)",
    portions: 12,
    items: { "chocolat-noir": 100, beurre: 120, oeuf: 3, sucre: 95, farine: 110, "pepites-chocolat": 50 }
  },
  {
    id: "rec-cookies-crus",
    label: "Cookies sans cuisson",
    portions: 12,
    items: { "biscuit-sec": 150, "chocolat-noir": 100, beurre: 50, miel: 30 }
  },
  {
    id: "rec-barres-avoine",
    label: "Barres avoine-chocolat (sans dattes)",
    portions: 8,
    items: { avoine: 150, beurre: 50, miel: 60, oeuf: 1, "pepites-chocolat": 50 }
  },
  {
    id: "rec-boules-avoine",
    label: "Boules avoine-cacahuète (sans cuisson)",
    portions: 14,
    items: { avoine: 120, cacahuete: 100, miel: 40, "chocolat-noir": 40 }
  },
  {
    id: "rec-crumble",
    label: "Crumble pommes-avoine",
    portions: 6,
    items: { pomme: 800, avoine: 80, farine: 40, beurre: 50, miel: 30 }
  },

  // ------------------------------------------------------- pâtes à tartiner
  // Le pot fait ~265 g : 9 parts ≈ 30 g, la dose d'une tartine.
  {
    id: "rec-tartiner-noisette",
    label: "Pâte à tartiner noisette (part = 30 g)",
    portions: 9,
    items: { noisette: 200, "cacao-poudre": 25, miel: 40 }
  },
  {
    id: "rec-tartiner-5050",
    label: "Pâte à tartiner 50/50 noisette-cacahuète (part = 30 g)",
    portions: 9,
    items: { noisette: 100, cacahuete: 100, "cacao-poudre": 25, miel: 40 }
  },

  // -------------------------------------------------------------- plats
  {
    id: "rec-pad-thai",
    label: "Pad thaï (poulet)",
    portions: 2,
    items: {
      "nouilles-riz": 150, "poulet-blanc": 200, oeuf: 2, cacahuete: 40,
      tamarin: 45, "nuoc-mam": 30, cassonade: 20, "huile-tournesol": 20
    }
  },
  {
    id: "rec-pates-maison",
    label: "Pâtes fraîches maison (1 portion)",
    portions: 1,
    items: { farine: 100, oeuf: 1 }
  },

  // ------------------------------------------------------------- sauces
  // Le pot fait ~70 g : 2 parts, la dose pour deux personnes de frites.
  {
    id: "rec-sauce-miel-moutarde",
    label: "Sauce crémeuse miel-moutarde (2 parts)",
    portions: 2,
    items: { creme: 45, miel: 7 }
  },
  {
    id: "rec-sauce-legere",
    label: "Sauce légère fromage blanc (2 parts)",
    portions: 2,
    items: { "fromage-blanc-0": 45, miel: 7 }
  },

  // -------------------------------------------------------------- ramen
  {
    id: "rec-tare-shoyu",
    label: "Tare shoyu pour ramen (4 bols)",
    portions: 4,
    items: { "sauce-soja": 100, "sauce-huitre": 30, miel: 15 }
  }
];
