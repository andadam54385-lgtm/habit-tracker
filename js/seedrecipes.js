// Recettes de départ — celles construites avec Claude les 21-23 sept. 2026.
//
// Elles sont injectées une seule fois (drapeau `seededPatisseries` dans
// app.js), puis elles t'appartiennent : tu peux changer les quantités,
// ajouter ou retirer un ingrédient, réécrire la préparation, supprimer la
// recette. Rien ne les réécrira ensuite — c'est volontaire, les tests en
// cuisine font bouger les grammages et l'app ne doit pas les ramener à la
// version d'origine.
//
// `portions` = le nombre de parts que donne la recette entière. L'app
// calcule ce que vaut UNE part, et la journée n'enregistre qu'un nombre de
// parts — décimal accepté, d'où le bouton « % ».
//
// `notes` = la préparation. Elle ne s'affiche que dans la fiche, quand on
// touche le nom de la recette : la liste reste lisible, et le mode d'emploi
// est là au moment où on cuisine.

export const SEED_RECIPES = [
  // ------------------------------------------------------------ pâtisserie
  {
    id: "rec-brownie",
    label: "Brownie fondant",
    portions: 9,
    items: { "chocolat-noir": 100, beurre: 80, oeuf: 2, sucre: 60, farine: 50 },
    notes:
      "1. Faire fondre le chocolat et le beurre ensemble.\n" +
      "2. Fouetter les œufs et le sucre, mélanger au chocolat.\n" +
      "3. Ajouter la farine et une pincée de sel.\n" +
      "4. 180 °C pendant 18-20 min.\n\n" +
      "LE FONDANT : il ne vient d'aucun ingrédient magique. Il vient du ratio " +
      "— beaucoup de chocolat, peu de farine — et de la sous-cuisson.\n" +
      "Sortir quand le centre tremble encore. Il finit de prendre en refroidissant ; " +
      "un brownie cuit à cœur est un gâteau sec.\n\n" +
      "Conservation : 3-4 jours en boîte hermétique, à température ambiante. " +
      "Pas au frigo, le beurre fige et il durcit. Congélation en parts : 3 mois.\n\n" +
      "Sucre déjà réduit : 60 g au lieu des 120-150 d'une recette classique."
  },
  {
    id: "rec-brownie-amande",
    label: "Brownie fondant (poudre d'amande)",
    portions: 9,
    items: { "chocolat-noir": 100, beurre: 80, oeuf: 2, sucre: 60, amande: 60 },
    notes:
      "Même méthode que le brownie classique : chocolat et beurre fondus, " +
      "œufs et sucre fouettés, puis la poudre d'amande à la place de la farine.\n" +
      "180 °C pendant 18-20 min, sortir quand le centre tremble.\n\n" +
      "Plus fondant que la version farine, et un peu plus riche.\n" +
      "−10 g de glucides et +2 g de protéines pour 100 g, mais +43 kcal : " +
      "l'amande est plus grasse que la farine.\n" +
      "Les SUCRES, eux, ne bougent pas — ils viennent du sucre ajouté et du chocolat."
  },
  {
    id: "rec-cookies",
    label: "Cookies moelleux",
    portions: 12,
    items: { farine: 120, beurre: 80, cassonade: 70, oeuf: 1, "pepites-chocolat": 100 },
    notes:
      "Mélanger le beurre mou et la cassonade, ajouter l'œuf, puis la farine, " +
      "le bicarbonate (½ c. à café) et une pincée de sel. Pépites en dernier.\n" +
      "12 boules aplaties, 180 °C pendant 10-11 min.\n\n" +
      "LES TROIS RÈGLES DU MOELLEUX, qui comptent plus que la recette :\n" +
      "1. Beurre MOU, jamais fondu. Le beurre fondu étale les cookies et les assèche.\n" +
      "2. Repos de la pâte au frigo : 30 min minimum, idéalement une nuit. " +
      "C'est le geste qui change le plus le résultat.\n" +
      "3. Les sortir quand le centre paraît PAS CUIT. Ils finissent sur la plaque.\n\n" +
      "MEILLEUR SYSTÈME : congeler la pâte en boules crues. Elles tiennent 3 mois " +
      "et se cuisent directement sans décongeler, +2 min. Deux cookies frais quand " +
      "l'envie vient, au lieu d'une fournée qui rassit.\n\n" +
      "Conservation cuits : 5-7 jours en boîte. Un quartier de pomme dedans les garde moelleux.\n\n" +
      "Ce sont les pépites qui font le sucre (32 g/100 g contre 26 pour le brownie). " +
      "Du chocolat noir 70 % concassé à la place fait baisser d'environ 5 g."
  },
  {
    id: "rec-brookie",
    label: "Brookie (brownie + cookie)",
    portions: 12,
    items: { "chocolat-noir": 100, beurre: 120, oeuf: 3, sucre: 95, farine: 110, "pepites-chocolat": 50 },
    notes:
      "Pâte à brownie complète versée dans le moule, puis 6 à 8 BOULES de pâte à " +
      "cookie déposées dessus, espacées. Surtout pas une couche pleine.\n" +
      "170 °C pendant 25-28 min.\n\n" +
      "LES DEUX POINTS QUI FONT TOUT :\n" +
      "1. Pâte à cookie FROIDE, sortie du frigo ou du congélateur. Tiède, elle fond " +
      "dans le brownie et on perd les deux textures.\n" +
      "2. 170 °C et non 180. Le brownie met plus de temps que le cookie ; à 180 les " +
      "blobs brûlent avant que le brownie soit pris.\n\n" +
      "C'est le meilleur usage des boules de pâte à cookie congelées : en poser 6 sur " +
      "un brownie, et avoir un brookie sans faire deux pâtes le même jour.\n\n" +
      "Conservation : comme le brownie, 3-4 jours à l'ambiante, pas au frigo."
  },
  {
    id: "rec-cookies-crus",
    label: "Cookies sans cuisson",
    portions: 12,
    items: { "biscuit-sec": 150, "chocolat-noir": 100, beurre: 50, miel: 30 },
    notes:
      "1. Chocolat et beurre fondus, mélangés au miel.\n" +
      "2. Verser sur les biscuits GROSSIÈREMENT écrasés. Mélanger sans réduire en " +
      "poudre — il faut garder des morceaux, c'est eux qui donnent la mâche.\n" +
      "3. Former 12 palets à la main, sur papier cuisson.\n" +
      "4. Frigo 2 h minimum.\n\n" +
      "Se conservent mieux que les cookies cuits : 2 semaines au frigo, et ils se " +
      "mangent froids.\n\n" +
      "Déjà moins sucrés que la version cuite (26,6 g contre 32,4 pour 100 g) : " +
      "il n'y a pas de sucre ajouté en plus du miel."
  },
  {
    id: "rec-barres-avoine",
    label: "Barres avoine-chocolat (sans dattes)",
    portions: 8,
    items: { avoine: 150, beurre: 50, miel: 60, oeuf: 1, "pepites-chocolat": 50 },
    notes:
      "1. Tout mélanger — la pâte doit être collante.\n" +
      "2. TASSER TRÈS FERMEMENT dans un moule tapissé de papier cuisson, avec le dos " +
      "d'une cuillère. C'est le tassage qui fait tenir la barre.\n" +
      "3. 180 °C pendant 18-20 min.\n" +
      "4. LAISSER REFROIDIR COMPLÈTEMENT AVANT DE COUPER — compter 1 h. " +
      "Coupée tiède, elle s'effrite systématiquement.\n\n" +
      "Ce sont le MIEL et l'ŒUF qui lient, à la place des dattes : le miel caramélise " +
      "légèrement et soude les flocons, l'œuf apporte la tenue. Sans l'un des deux, ça s'effrite.\n\n" +
      "Conservation : 1 semaine en boîte hermétique, HORS frigo.\n\n" +
      "Le meilleur format pour manger au volant : une main, pas de miettes, " +
      "ça ne fond pas. 183 kcal la barre, 23 g de sucres contre 32 pour les cookies.\n\n" +
      "Variante protéinée : 60 g de purée de cacahuète à la place du beurre (+50 % de " +
      "protéines), mais goût de cacahuète marqué."
  },
  {
    id: "rec-boules-avoine",
    label: "Boules avoine-cacahuète (sans cuisson)",
    portions: 14,
    items: { avoine: 120, cacahuete: 100, miel: 40, "chocolat-noir": 40 },
    notes:
      "Tout mixer, rouler en 14 boules, frigo 1 h. Aucune cuisson.\n\n" +
      "100 kcal la boule, 14,6 g de protéines pour 100 g — la plus protéinée des " +
      "recettes sucrées de la liste.\n\n" +
      "Tiennent 5 jours hors frigo : un lot le dimanche couvre la semaine."
  },
  {
    id: "rec-crumble",
    label: "Crumble pommes-avoine",
    portions: 6,
    items: { pomme: 800, avoine: 80, farine: 40, beurre: 50, miel: 30 },
    notes:
      "Sabler l'avoine, la farine et le beurre FROID du bout des doigts. " +
      "Répartir sur les pommes coupées, cannelle. 190 °C pendant 30 min.\n\n" +
      "De loin le moins dense de toutes les recettes sucrées : 157 kcal pour 100 g " +
      "contre ~500 pour le brownie et les cookies, et deux fois moins de sucres. " +
      "C'est le fruit qui fait le volume.\n\n" +
      "Conservation : 2-3 jours au frigo. RÉCHAUFFER AU FOUR 10 min, jamais au " +
      "micro-ondes — il ramollit et perd tout son intérêt.\n\n" +
      "Peut se congeler CRU, non cuit : 3 mois, cuisson directe +10 min."
  },

  // ------------------------------------------------------- pâtes à tartiner
  {
    id: "rec-tartiner-noisette",
    label: "Pâte à tartiner noisette (part = 30 g)",
    portions: 9,
    items: { noisette: 200, "cacao-poudre": 25, miel: 40 },
    notes:
      "1. TORRÉFIER les noisettes 10-12 min à 180 °C. Étape non négociable, " +
      "c'est elle qui fait le goût.\n" +
      "2. Les frotter dans un torchon pour retirer les peaux, qui sont amères.\n" +
      "3. MIXER 10 À 15 MINUTES, en raclant les bords. La texture passe par trois " +
      "stades : poudre → pâte compacte → liquide onctueux. C'est au stade compact " +
      "que les gens abandonnent en croyant avoir raté. Il faut continuer.\n" +
      "4. Ajouter cacao, miel et sel À FROID, mixer brièvement.\n\n" +
      "PAS D'HUILE : les noisettes sont à 60 % de lipides et libèrent la leur en " +
      "mixant. Une pâte sèche n'est pas sous-huilée, elle est sous-mixée. " +
      "Si rattrapage : 1 c. à soupe d'huile neutre ou de noisette. Jamais d'olive " +
      "(le goût domine), jamais de coco (elle fige dur au froid).\n\n" +
      "Conservation : ~1 mois en bocal fermé à température ambiante, sans laitage " +
      "dedans. Elle se sépare au bout de quelques jours — c'est normal, on remue. " +
      "Les pots industriels tiennent grâce à la lécithine.\n\n" +
      "15 g de sucres pour 100 g contre 54,5 au Nocciolata, protéines doublées, " +
      "fibres × 2,5, pour des calories quasi identiques.\n\n" +
      "Sans robot solide : un mixeur plongeant cale sur 15 min de purée sèche. " +
      "Acheter de la purée de noisette toute faite et n'ajouter que cacao + miel."
  },
  {
    id: "rec-tartiner-5050",
    label: "Pâte à tartiner 50/50 noisette-cacahuète (part = 30 g)",
    portions: 9,
    items: { noisette: 100, cacahuete: 100, "cacao-poudre": 25, miel: 40 },
    notes:
      "Même méthode que la version tout noisette : torréfier, frotter les peaux, " +
      "mixer longtemps, cacao et miel à froid.\n\n" +
      "Moitié prix, +29 % de protéines, et la noisette domine encore largement le goût.\n" +
      "La cacahuète ne fait que porter."
  },

  // -------------------------------------------------------------- plats
  {
    id: "rec-pad-thai",
    label: "Pad thaï (poulet)",
    portions: 2,
    items: {
      "nouilles-riz": 150, "poulet-blanc": 200, oeuf: 2, cacahuete: 40,
      tamarin: 45, "nuoc-mam": 30, cassonade: 20, "huile-tournesol": 20
    },
    notes:
      "SAUCE, à mélanger AVANT de commencer : tamarin, nuoc-mâm, cassonade, " +
      "1 c. à café de piment en poudre.\n\n" +
      "1. RÉHYDRATER LES NOUILLES À L'EAU TIÈDE, 30 À 60 MIN. JAMAIS LES BOUILLIR. " +
      "C'est l'erreur qui rate le plat : bouillies, elles cassent et collent en masse. " +
      "Elles doivent rester souples mais fermes, elles finiront dans le wok.\n" +
      "2. Feu TRÈS VIF, et par petites quantités. Un wok surchargé fait bouillir au " +
      "lieu de sauter. Pour deux ça passe, pour quatre faire en deux fois.\n" +
      "3. Saisir le poulet, puis pousser les nouilles sur un côté, casser les œufs " +
      "dans l'espace libre, les brouiller à demi, puis tout mélanger avec la sauce.\n" +
      "4. POUSSES DE SOJA ET CÉBETTE À LA TOUTE FIN, 30 SECONDES. Elles doivent " +
      "rester croquantes — c'est le contraste qui fait le plat.\n\n" +
      "Au service : cacahuètes concassées, citron vert, piment à part.\n\n" +
      "LE TAMARIN EST LA SIGNATURE. Sans lui ce ne sont que des nouilles sautées — " +
      "ni la sauce soja ni la sauce d'huître ne le remplacent. En épicerie asiatique, " +
      "en pot, il se garde des mois au frigo.\n\n" +
      "Pas de beurre de cacahuète : ce n'est pas dans la recette authentique " +
      "(confusion avec la sauce satay), et le rapport est mauvais — +5 g de protéines " +
      "pour +10 g de lipides. 50 g de poulet en plus font mieux, vingt fois moins gras."
  },
  {
    id: "rec-pates-maison",
    label: "Pâtes fraîches maison (1 portion)",
    portions: 1,
    items: { farine: 100, oeuf: 1 },
    notes:
      "100 g de farine pour 1 œuf : c'est le ratio classique italien, il est bon.\n\n" +
      "SI LA PÂTE PARAÎT TROP SÈCHE, CE N'EST PAS LA FARINE, C'EST LE PÉTRISSAGE. " +
      "Une pâte à ce ratio est CENSÉE avoir l'air ratée pendant les 3-4 premières " +
      "minutes : friable, avec de la farine libre.\n" +
      "Il faut pétrir 8 À 10 MINUTES. Elle passe par trois stades : miettes sèches → " +
      "boule grossière → boule lisse et souple. La plupart des gens s'arrêtent au " +
      "premier et concluent qu'il manque du liquide.\n\n" +
      "MÉTHODE PLUS FACILE que le puits sur le plan de travail :\n" +
      "1. Tout mélanger dans un saladier à la fourchette, jusqu'à une masse grumeleuse.\n" +
      "2. Renverser sur le plan de travail.\n" +
      "3. Pétrir avec le TALON DE LA MAIN, en repliant. La chaleur des mains fait une " +
      "partie du travail — c'est pour ça que ça vient d'un coup vers la 6e minute.\n\n" +
      "S'il reste vraiment de la farine après 8 min : de l'eau, 1 c. à café à la fois, " +
      "3 maximum. Jamais plus d'un coup, une pâte trop hydratée colle et devient " +
      "inrattrapable.\n\n" +
      "REPOS 30 MIN, couverte. Pas de film alimentaire ? Un saladier retourné, un " +
      "torchon humide, une boîte ou un sac congélation font pareil — le but est " +
      "seulement d'empêcher la croûte de sécher.\n\n" +
      "Cuisson : 2-3 min seulement, dans un grand volume d'eau bien salée.\n\n" +
      "Pour plus de mordant : 50 % T55 + 50 % semoule de blé dur fine."
  },

  // ------------------------------------------------------------- sauces
  {
    id: "rec-sauce-miel-moutarde",
    label: "Sauce crémeuse réduite (2 parts)",
    portions: 2,
    items: { creme: 45, "sauce-soja": 10, miel: 7, "sauce-sriracha": 5, paprika: 2, "jus-citron": 5 },
    notes:
      "L'ORDRE COMPTE, et il n'est pas intuitif :\n" +
      "1. RÉDUIRE LA CRÈME SEULE, jusqu'à la texture voulue. La crème à 30 % supporte " +
      "l'ébullition sans trancher — ce sont les allégées qui se séparent.\n" +
      "2. Ajouter soja, miel, sriracha et paprika HORS DU FEU, une fois la réduction faite.\n" +
      "3. Citron en dernier.\n\n" +
      "DEUX RAISONS, pas une : réduire concentre le sel, et la sauce soja perd son " +
      "arôme à la cuisson longue — c'est un condiment de finition, pas une base. " +
      "Le miel, lui, caramélise et devient amer s'il réduit fort.\n\n" +
      "LE CITRON EST CE QUI MANQUE À LA PLUPART DES SAUCES CRÈME. Crème, miel, soja, " +
      "paprika : aucun n'est acide. Un filet à la fin réveille tout.\n\n" +
      "Composition choisie le 23/09 : soja + miel + sriracha + paprika. " +
      "La sauce d'huître a été retirée — elle apporte salé ET sucré ET umami, " +
      "donc elle faisait double emploi avec le soja et le miel.\n\n" +
      "ORDRE D'AJUSTEMENT au goût : sel d'abord (beaucoup de sauces jugées fades " +
      "manquent seulement de sel), puis l'acide, puis le sucre, et LE PIMENT EN " +
      "DERNIER — il ne se retire pas.\n\n" +
      "Laisser reposer 15 min au frais avant de goûter : le paprika a besoin de se " +
      "réhydrater. Une sauce goûtée tout de suite paraît toujours plate.\n\n" +
      "Conservation : 3-4 jours au frigo, bocal fermé. C'est la crème qui commande."
  },
  {
    id: "rec-sauce-legere",
    label: "Sauce légère fromage blanc (2 parts)",
    portions: 2,
    items: { "fromage-blanc-0": 45, miel: 7, "sauce-sriracha": 5, paprika: 2, "jus-citron": 5 },
    notes:
      "Même sauce, sans cuisson : tout mélanger à froid.\n\n" +
      "Le fromage blanc 0 % remplace la crème sans difficulté dans une sauce FROIDE : " +
      "texture proche, et il apporte 3 g de protéines en plus.\n" +
      "À CHAUD il tranche — pour une sauce chaude, garder la crème.\n\n" +
      "13 g de lipides économisés par rapport à la version crème, " +
      "soit 12 % du budget gras d'une journée."
  },

  // -------------------------------------------------------------- ramen
  {
    id: "rec-tare-shoyu",
    label: "Tare shoyu pour ramen (4 bols)",
    portions: 4,
    items: { "sauce-soja": 100, "sauce-huitre": 30, miel: 15 },
    notes:
      "Chauffer 5 min SANS BOUILLIR avec 1 gousse d'ail écrasée et 1 tranche de " +
      "gingembre, puis filtrer.\n\n" +
      "LE PRINCIPE : on ne sale JAMAIS le bouillon. Le tare fait tout " +
      "l'assaisonnement, au fond du bol. Le même bouillon sert alors au ramen, " +
      "à la soupe et au risotto.\n\n" +
      "AU SERVICE : 2 à 3 c. à soupe de tare au fond du bol, 1 c. à café d'huile " +
      "aromatique, puis 350 ml de bouillon BRÛLANT par-dessus. Nouilles cuites et " +
      "bien égouttées, puis les garnitures.\n\n" +
      "Conservation : 3 à 4 semaines au réfrigérateur.\n\n" +
      "La sauce d'huître est déjà sucrée et salée — ne pas resucrer au-delà du miel."
  }
];
