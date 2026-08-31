// Catalogue d'aliments, classé par type.
//
// Toutes les valeurs sont données pour `base` unités : 100 g pour les
// solides, 100 ml pour les liquides, 1 pièce pour ce qui se compte à
// l'unité (un œuf, un wrap). La quantité saisie est libre, ce qui évite
// d'inventer des « portions » que personne ne respecte.
//
// Sources : moyennes CIQUAL / USDA, arrondies. Seuls les micronutriments
// significatifs sont renseignés — un blanc vaut zéro dans les totaux.

export const FOOD_CATS = [
  { key: "feculents", label: "Féculents & céréales", icon: "🌾" },
  { key: "proteines", label: "Viandes, poissons, œufs", icon: "🥩" },
  { key: "laitiers", label: "Produits laitiers", icon: "🥛" },
  { key: "legumes", label: "Légumes", icon: "🥦" },
  { key: "fruits", label: "Fruits", icon: "🍎" },
  { key: "noix", label: "Noix & graines", icon: "🥜" },
  { key: "grasses", label: "Matières grasses", icon: "🫒" },
  { key: "boissons", label: "Boissons", icon: "🥤" },
  { key: "divers", label: "Plats & divers", icon: "🍽️" }
];

export const UNIT_LABEL = { g: "g", ml: "ml", u: "unité", portion: "portion" };

// f(id, label, catégorie, unité, base, valeurs, options)
function f(id, label, cat, unit, base, n, opt) {
  return Object.assign({ id, label, cat, unit, base, n, step: unit === "u" || unit === "portion" ? 1 : (unit === "ml" ? 50 : 10) }, opt || {});
}

export const CATALOGUE = [
  // ------------------------------------------------------- féculents
  f("avoine", "Flocons d'avoine", "feculents", "g", 100,
    { kcal: 380, prot: 13, glu: 60, lip: 7, k: 350, mg: 140, ca: 54, fe: 4, zn: 3, b9: 32, se: 28, na: 3 }),
  f("riz-blanc", "Riz blanc cuit", "feculents", "g", 100,
    { kcal: 130, prot: 2.7, glu: 28, lip: 0.3, k: 35, mg: 12, fe: 0.2, zn: 0.6, b9: 3, na: 1, se: 8 }),
  f("riz-complet", "Riz complet cuit", "feculents", "g", 100,
    { kcal: 123, prot: 2.7, glu: 26, lip: 1, k: 43, mg: 39, fe: 0.5, zn: 0.7, se: 6, na: 3 }),
  f("pates", "Pâtes cuites", "feculents", "g", 100,
    { kcal: 145, prot: 5, glu: 28.5, lip: 0.9, k: 44, mg: 18, fe: 0.5, zn: 0.7, b9: 7, se: 15, na: 1 }),
  f("pomme-de-terre", "Pomme de terre cuite", "feculents", "g", 100,
    { kcal: 87, prot: 2, glu: 20, lip: 0.1, k: 420, na: 6, mg: 23, ca: 10, fe: 0.8, zn: 0.3, c: 9.6, b9: 18, se: 0.3 }),
  f("patate-douce", "Patate douce cuite", "feculents", "g", 100,
    { kcal: 90, prot: 2, glu: 21, lip: 0.1, k: 475, mg: 27, ca: 38, fe: 0.7, c: 20, b9: 6, na: 36, se: 0.2 }),
  f("pain-complet", "Pain complet", "feculents", "g", 100,
    { kcal: 250, prot: 10, glu: 43, lip: 3.5, k: 250, na: 450, mg: 80, ca: 60, fe: 2.5, zn: 1.8, b9: 40, se: 25 }),
  f("semoule", "Semoule / couscous cuit", "feculents", "g", 100,
    { kcal: 112, prot: 3.8, glu: 23, lip: 0.2, k: 55, mg: 8, fe: 0.3, zn: 0.3, b9: 15, se: 27, na: 5 }),
  f("lentilles", "Lentilles cuites", "feculents", "g", 100,
    { kcal: 116, prot: 9, glu: 20, lip: 0.4, k: 370, mg: 36, ca: 19, fe: 3.3, zn: 1.3, b9: 181, se: 3, na: 2 }),
  f("pois-chiches", "Pois chiches cuits", "feculents", "g", 100,
    { kcal: 164, prot: 8.9, glu: 27, lip: 2.6, k: 291, mg: 48, ca: 49, fe: 2.9, zn: 1.5, b9: 172, se: 4, na: 7 }),
  f("quinoa", "Quinoa cuit", "feculents", "g", 100,
    { kcal: 120, prot: 4.4, glu: 21, lip: 1.9, k: 172, mg: 64, ca: 17, fe: 1.5, zn: 1.1, b9: 42, se: 3, na: 7 }),

  // ------------------------------------------------------- protéines
  f("oeuf", "Œuf (1, ~50 g)", "proteines", "u", 1,
    { kcal: 78, prot: 6.5, glu: 0.6, lip: 5.3, k: 70, na: 70, mg: 6, ca: 28, fe: 0.9, zn: 0.6, b9: 24, d: 1.1, b12: 0.5, se: 15, om3: 40 }),
  f("poulet-blanc", "Blanc de poulet cuit", "proteines", "g", 100,
    { kcal: 165, prot: 31, glu: 0, lip: 3.6, k: 256, na: 74, mg: 29, fe: 0.7, zn: 1, b9: 4, b12: 0.3, se: 22 }),
  f("poulet-cuisse", "Cuisse de poulet cuite", "proteines", "g", 100,
    { kcal: 209, prot: 26, glu: 0, lip: 11, k: 230, na: 90, mg: 23, fe: 1.3, zn: 2, b12: 0.5, se: 20 }),
  f("boeuf-5", "Bœuf haché 5 %", "proteines", "g", 100,
    { kcal: 137, prot: 21.4, glu: 0, lip: 5, k: 330, na: 60, mg: 21, fe: 2.6, zn: 5, b12: 2.5, se: 20 }),
  f("boeuf-15", "Bœuf haché 15 %", "proteines", "g", 100,
    { kcal: 215, prot: 19, glu: 0, lip: 15, k: 290, na: 65, mg: 19, fe: 2.3, zn: 4.5, b12: 2.3, se: 18 }),
  f("steak", "Steak / entrecôte", "proteines", "g", 100,
    { kcal: 250, prot: 26, glu: 0, lip: 16, k: 315, na: 55, mg: 20, fe: 2.5, zn: 5, b12: 2.5, se: 22 }),
  f("porc-filet", "Filet de porc", "proteines", "g", 100,
    { kcal: 143, prot: 26, glu: 0, lip: 3.5, k: 400, na: 55, mg: 25, fe: 0.9, zn: 2, b12: 0.7, se: 33 }),
  f("dinde", "Dinde (escalope)", "proteines", "g", 100,
    { kcal: 135, prot: 29, glu: 0, lip: 1.7, k: 250, na: 60, mg: 28, fe: 1.1, zn: 1.7, b12: 0.4, se: 27 }),
  f("sardines", "Sardines (égouttées)", "proteines", "g", 100,
    { kcal: 208, prot: 24.6, glu: 0, lip: 11.5, k: 397, na: 450, mg: 39, ca: 382, fe: 2.9, zn: 1.3, d: 6.8, b12: 8.9, se: 52, om3: 1480 }),
  f("maquereau", "Maquereau", "proteines", "g", 100,
    { kcal: 205, prot: 19, glu: 0, lip: 13.9, k: 314, na: 90, mg: 30, ca: 12, fe: 1.6, zn: 0.6, d: 8.2, b12: 8.7, se: 44, om3: 1700 }),
  f("saumon", "Saumon", "proteines", "g", 100,
    { kcal: 208, prot: 20, glu: 0, lip: 13, k: 363, na: 59, mg: 27, ca: 12, fe: 0.3, zn: 0.4, d: 11, b12: 3.2, se: 36, om3: 2200 }),
  f("thon-naturel", "Thon en boîte au naturel", "proteines", "g", 100,
    { kcal: 116, prot: 26, glu: 0, lip: 1, k: 237, na: 320, mg: 27, fe: 1.3, zn: 0.7, d: 1.7, b12: 2.2, se: 80, om3: 250 }),
  f("cabillaud", "Cabillaud / poisson blanc", "proteines", "g", 100,
    { kcal: 82, prot: 18, glu: 0, lip: 0.7, k: 413, na: 54, mg: 32, ca: 16, fe: 0.4, zn: 0.5, d: 1.2, b12: 0.9, se: 33, om3: 200 }),
  f("crevettes", "Crevettes", "proteines", "g", 100,
    { kcal: 99, prot: 24, glu: 0.2, lip: 0.3, k: 259, na: 111, mg: 39, ca: 70, fe: 0.5, zn: 1.6, b12: 1.1, se: 38, om3: 300 }),
  f("jambon", "Jambon blanc", "proteines", "g", 100,
    { kcal: 107, prot: 18, glu: 1, lip: 3, k: 300, na: 1100, mg: 18, fe: 0.8, zn: 1.5, b12: 0.6, se: 20 }),

  // -------------------------------------------------------- laitiers
  f("lait-entier", "Lait entier", "laitiers", "ml", 100,
    { kcal: 65, prot: 3.2, glu: 4.8, lip: 3.2, k: 156, na: 43, mg: 11, ca: 120, zn: 0.4, b9: 5, d: 0.1, b12: 0.45, se: 1 }),
  f("lait-demi", "Lait demi-écrémé", "laitiers", "ml", 100,
    { kcal: 47, prot: 3.3, glu: 4.8, lip: 1.6, k: 156, na: 43, mg: 11, ca: 120, zn: 0.4, b12: 0.45 }),
  f("fromage-blanc", "Fromage blanc 3 %", "laitiers", "g", 100,
    { kcal: 74, prot: 8, glu: 4, lip: 3, k: 130, na: 40, ca: 110, mg: 11, b12: 0.5 }),
  f("yaourt", "Yaourt nature", "laitiers", "g", 100,
    { kcal: 61, prot: 3.5, glu: 4.7, lip: 3.3, k: 155, na: 46, ca: 120, mg: 12, b12: 0.4 }),
  f("comte", "Comté / emmental", "laitiers", "g", 100,
    { kcal: 400, prot: 27, glu: 1.5, lip: 32, k: 100, na: 700, ca: 900, mg: 30, zn: 4, b12: 1.7, se: 15 }),
  f("mozzarella", "Mozzarella", "laitiers", "g", 100,
    { kcal: 280, prot: 22, glu: 2, lip: 20, na: 600, ca: 500, mg: 20, zn: 2.9, b12: 1.5, k: 76 }),

  // --------------------------------------------------------- légumes
  f("courgette", "Courgette", "legumes", "g", 100,
    { kcal: 17, prot: 1.2, glu: 3.1, lip: 0.3, k: 260, mg: 18, ca: 16, fe: 0.4, c: 17, b9: 24, na: 8 }),
  f("carotte", "Carotte", "legumes", "g", 100,
    { kcal: 41, prot: 0.9, glu: 9.6, lip: 0.2, k: 320, na: 69, mg: 12, ca: 33, fe: 0.3, c: 6, b9: 19 }),
  f("tomate", "Tomate", "legumes", "g", 100,
    { kcal: 18, prot: 0.9, glu: 3.9, lip: 0.2, k: 237, mg: 11, ca: 10, fe: 0.3, c: 14, b9: 15, na: 5 }),
  f("haricots-verts", "Haricots verts", "legumes", "g", 100,
    { kcal: 31, prot: 1.8, glu: 7, lip: 0.1, k: 211, mg: 25, ca: 37, fe: 1, c: 12, b9: 33, na: 6 }),
  f("poivron", "Poivron", "legumes", "g", 100,
    { kcal: 31, prot: 1, glu: 6, lip: 0.3, k: 211, mg: 12, ca: 7, fe: 0.4, c: 128, b9: 46, na: 4 }),
  f("salade", "Salade verte", "legumes", "g", 100,
    { kcal: 15, prot: 1.4, glu: 2.9, lip: 0.2, k: 194, mg: 13, ca: 36, fe: 0.9, c: 9, b9: 38, na: 28 }),
  f("champignons", "Champignons", "legumes", "g", 100,
    { kcal: 22, prot: 3.1, glu: 3.3, lip: 0.3, k: 318, mg: 9, fe: 0.5, zn: 0.5, b9: 17, se: 9, d: 0.2, na: 5 }),
  f("betterave", "Betterave crue", "legumes", "g", 100,
    { kcal: 43, prot: 1.6, glu: 10, lip: 0.2, k: 325, na: 78, mg: 23, ca: 16, fe: 0.8, c: 5, b9: 109 }),

  // ---------------------------------------------------------- fruits
  f("banane", "Banane", "fruits", "g", 100,
    { kcal: 89, prot: 1.1, glu: 23, lip: 0.3, k: 358, mg: 27, ca: 5, fe: 0.3, zn: 0.2, c: 8.7, b9: 20, na: 1 }),
  f("pomme", "Pomme", "fruits", "g", 100,
    { kcal: 52, prot: 0.3, glu: 14, lip: 0.2, k: 107, mg: 5, ca: 6, c: 4.6, b9: 3, na: 1 }),
  f("orange", "Orange", "fruits", "g", 100,
    { kcal: 47, prot: 0.9, glu: 12, lip: 0.1, k: 181, mg: 10, ca: 40, c: 53, b9: 30, na: 0 }),
  f("kiwi", "Kiwi", "fruits", "g", 100,
    { kcal: 61, prot: 1.1, glu: 15, lip: 0.5, k: 312, mg: 17, ca: 34, c: 93, b9: 25, na: 3 }),
  f("fraises", "Fraises", "fruits", "g", 100,
    { kcal: 32, prot: 0.7, glu: 7.7, lip: 0.3, k: 153, mg: 13, ca: 16, c: 59, b9: 24, na: 1 }),
  f("avocat", "Avocat", "fruits", "g", 100,
    { kcal: 160, prot: 2, glu: 8.5, lip: 15, k: 485, mg: 29, ca: 12, fe: 0.6, zn: 0.6, c: 10, b9: 81, na: 7 }),
  f("raisin", "Raisin", "fruits", "g", 100,
    { kcal: 69, prot: 0.7, glu: 18, lip: 0.2, k: 191, mg: 7, ca: 10, c: 3.2, b9: 2, na: 2 }),

  // ---------------------------------------------------- noix & graines
  f("amandes", "Amandes", "noix", "g", 100,
    { kcal: 579, prot: 21, glu: 22, lip: 50, k: 733, mg: 270, ca: 269, fe: 3.7, zn: 3.1, b9: 44, se: 4, na: 1 }),
  f("puree-amande", "Purée d'amande", "noix", "g", 100,
    { kcal: 614, prot: 21, glu: 19, lip: 56, k: 748, mg: 279, ca: 347, fe: 3.5, zn: 3.2, b9: 50, na: 7 }),
  f("noix-bresil", "Noix du Brésil", "noix", "g", 100,
    { kcal: 659, prot: 14, glu: 12, lip: 67, k: 659, mg: 376, ca: 160, fe: 2.4, zn: 4.1, se: 1917, na: 3 },
    { warnPer: 12, warnText: "Au-delà de ~12 g (2 noix), le sélénium dépasse la dose sûre." }),
  f("noix", "Noix", "noix", "g", 100,
    { kcal: 654, prot: 15, glu: 14, lip: 65, k: 441, mg: 158, ca: 98, fe: 2.9, zn: 3.1, b9: 98, om3: 9000, na: 2 }),
  f("cacahuete", "Beurre de cacahuète", "noix", "g", 100,
    { kcal: 588, prot: 25, glu: 20, lip: 50, k: 649, na: 400, mg: 168, ca: 43, fe: 1.9, zn: 2.9, b9: 87 }),
  f("graines-courge", "Graines de courge", "noix", "g", 100,
    { kcal: 559, prot: 30, glu: 11, lip: 49, k: 809, mg: 592, ca: 46, fe: 8.8, zn: 7.8, b9: 58, se: 9, na: 7 }),

  // ------------------------------------------------- matières grasses
  f("huile-olive", "Huile d'olive", "grasses", "ml", 100,
    { kcal: 884, prot: 0, glu: 0, lip: 100, na: 2, k: 1 }, { step: 10 }),
  f("beurre", "Beurre", "grasses", "g", 100,
    { kcal: 717, prot: 0.9, glu: 0.1, lip: 81, na: 11, ca: 24, d: 1.5, k: 24 }, { step: 5 }),
  f("creme", "Crème fraîche 30 %", "grasses", "g", 100,
    { kcal: 290, prot: 2.4, glu: 3, lip: 30, k: 90, ca: 80, na: 35 }),

  // -------------------------------------------------------- boissons
  f("eau-coco", "Eau de coco", "boissons", "ml", 100,
    { kcal: 19, prot: 0.7, glu: 3.7, lip: 0.2, k: 250, na: 105, mg: 25, ca: 24, c: 2.4 }),
  f("jus-grenade", "Jus de grenade", "boissons", "ml", 100,
    { kcal: 54, prot: 0.15, glu: 13, lip: 0.3, k: 214, na: 9, mg: 7, c: 0.1 }),
  f("jus-orange", "Jus d'orange", "boissons", "ml", 100,
    { kcal: 45, prot: 0.7, glu: 10, lip: 0.2, k: 200, mg: 11, ca: 11, c: 50, b9: 30, na: 1 }),
  f("jus-citron", "Jus de citron", "boissons", "ml", 100,
    { kcal: 22, prot: 0.4, glu: 6.9, lip: 0.2, k: 103, mg: 6, ca: 6, c: 38, na: 1 }, { step: 10 }),

  // ---------------------------------------------------------- divers
  f("wrap", "Wrap / tortilla (1)", "divers", "u", 1,
    { kcal: 190, prot: 5, glu: 32, lip: 4.5, k: 70, na: 400, mg: 12, ca: 40, fe: 1.5 }),
  f("pain-mie", "Pain de mie", "divers", "g", 100,
    { kcal: 265, prot: 9, glu: 49, lip: 3.2, k: 120, na: 490, mg: 25, ca: 150, fe: 1.8 }),
  f("miel", "Miel", "divers", "g", 100,
    { kcal: 304, prot: 0.3, glu: 82, lip: 0, k: 52, na: 4 }, { step: 5 }),
  f("chocolat-noir", "Chocolat noir 70 %", "divers", "g", 100,
    { kcal: 598, prot: 7.8, glu: 46, lip: 43, k: 715, mg: 228, ca: 73, fe: 11.9, zn: 3.3, na: 20 }),
  f("sel", "Sel de table", "divers", "g", 1,
    { na: 388, k: 8 }, { step: 1 })
];

export const CAT_MAP = FOOD_CATS.reduce(function (a, c) { a[c.key] = c; return a; }, {});
