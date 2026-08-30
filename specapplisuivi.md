# Spécification — Application de suivi personnel

> **Comment utiliser ce document** : copie-colle l'intégralité de ce fichier dans Claude Code (ou tout assistant de développement) en disant simplement « construis cette application ». Tout ce dont il a besoin est dedans, y compris les données de départ.

---

## 1. Objectif

Une application personnelle de suivi qui rassemble en un seul endroit tous les protocoles en cours (santé, diète, entraînement, relaxation, apparence, apprentissages) et permet de :

- **consulter** un protocole sans le chercher,
- **cocher** ce qui est fait au quotidien,
- **ajouter** de nouvelles informations en une action, depuis n'importe quel écran,
- **voir** ce qui bloque et ce qui avance.

**Utilisateur unique.** Pas de comptes, pas de partage, pas de backend multi-utilisateurs.

**Contexte d'usage réel** : l'utilisateur travaille en livraison de 8 h à 17 h, dehors ou en camion, avec une seule pause. Il consulte l'app **au téléphone**, souvent debout, une main, parfois au soleil. Le matin et le soir à la maison, il l'utilise plus longuement.

---

## 2. Principes de conception

1. **Mobile d'abord.** Écran vertical, cibles tactiles larges, contraste élevé (lisibilité en extérieur).
2. **Ajouter une info doit prendre 5 secondes.** Un bouton « + » flottant, présent sur tous les écrans, qui ouvre un champ texte libre avec choix de la rubrique de destination. C'est la fonctionnalité la plus importante de l'app — si elle est lente, l'app meurt.
3. **Aucune donnée obligatoire.** L'app doit être utile même remplie à 20 %.
4. **Rien ne se perd.** Toute note ajoutée reste consultable, même mal rangée. Prévoir une rubrique « Boîte de réception » pour ce qui n'a pas de place évidente.
5. **Distinguer visuellement trois états** : `à faire` / `en cours` / `bloqué par autre chose`. Beaucoup d'éléments sont en attente d'un examen médical — l'app doit le montrer, pas le cacher.
6. **Pas de gamification, pas de streaks punitifs.** L'objectif affiché est « 2 sur 3 », pas « 7 jours d'affilée ».

---

## 3. Structure — 8 rubriques

### A. Santé (rubrique prioritaire, affichée en premier)

Sous-sections :
- **Rendez-vous** — à prendre / pris / fait, avec date.
- **Ordonnances à demander** — liste cochable.
- **À dire au médecin** — liste de points à ne pas oublier le jour J.
- **Résultats** — champ libre pour reporter les valeurs quand elles arrivent.

### B. Diète
Repas type, courses, boissons, potassium/sodium, recettes.

### C. Compléments & produits
Ce qui est pris aujourd'hui / ce qui est en attente / ce qui est écarté et pourquoi.

### D. Entraînement
Reprise musculation, exercices du cou, cardio.

### E. Relaxation
Sessions quotidiennes, technique, déclencheurs.

### F. Visage & apparence
Routine matin, rasage, routine soir, cheveux, sourcils.

### G. Apprentissages
Un seul apprentissage actif à la fois. Les autres en file d'attente.

### H. Suivi quotidien
Une seule vue avec les cases du jour + trois champs numériques optionnels : heures de sommeil, fréquence cardiaque au repos, énergie ressentie (1-5).

---

## 4. Données de départ à pré-remplir

### A. SANTÉ

**Rendez-vous — trois consultations distinctes, dans cet ordre. Ne pas les mélanger.**

| # | Qui | Format | Pour quoi | Statut |
|---|---|---|---|---|
| **1** | **Généraliste** | Téléconsultation (Qare / Livi, créneaux jusqu'à 22-23 h) | Les 3 ordonnances + parler du moral + demander un **courrier d'adressage vers un psychiatre** | 🔴 **À prendre — débloque tout le reste** |
| **1 bis** | **Laboratoire** | Sans rendez-vous, **7 h 30, à jeun**, avant le travail | Prise de sang + dépôt de l'ordonnance EFR | ⏸ Après le rendez-vous 1 |
| **2** | **Psychiatre** | **Visio** (annuaire HyperSupers / TDAH France) | TDAH, dyslexie, moral. **C'est le point d'entrée du diagnostic**, pas le généraliste | 🔴 À prendre séparément |
| **3** | **Psychologue** | **Cabinet** (distanciel seulement en soupape) | Thérapie des schémas, suivi de fond | ⏸ Après le 2 |
| — | Coiffeur spécialisé bouclés | — | Finition, plus prioritaire depuis l'amélioration | ⚪ Optionnel |

⚠️ **Règle à afficher dans l'app** : la téléconsultation généraliste dure 10-15 minutes. **Ne pas y lancer le sujet TDAH** — le temps y passerait et les ordonnances repartiraient à vide. Le moral, oui. Le diagnostic TDAH, c'est le rendez-vous 2.

**Ordonnances à demander (téléconsultation généraliste)**
1. Bilan sanguin — prélèvement matinal à jeun, **entre 7 h et 10 h** (impératif pour la testostérone)
2. EFR — épreuves fonctionnelles respiratoires avec test de réversibilité
3. Trétinoïne 0,025 %

**Marqueurs du bilan sanguin (liste à cocher)**
- NFS
- Ferritine + CRP
- Glycémie à jeun + HbA1c
- TSH + T4 libre + **T3 libre** + anti-TPO
- Testostérone totale + **SHBG** + LH + FSH + œstradiol + prolactine
- Cortisol 8 h
- 25-OH vitamine D, B12, folates, magnésium
- **Ionogramme sanguin (sodium + potassium)**
- Bilan hépatique
- Créatinine / DFG
- Bilan lipidique

**À dire au médecin**
- Fatigue depuis **novembre 2025**, aggravation progressive jusqu'en février 2026
- **Aucune amélioration au repos**, y compris pendant une période de chômage
- **Aucune amélioration** après suppression du sucre liquide, de l'alcool, des gâteaux industriels **et arrêt total de l'entraînement**
- **Asthme diagnostiqué dans l'enfance** + « cardio affreux » + intolérance à l'effort
- Éosinophilie à 9 % (617/mm³) sur un ancien bilan, jamais expliquée — hypothèse atopique
- Marqueur rénal G2 sur ce même ancien bilan
- Rétention d'eau et visage gonflé persistants
- Sommeil de 6-7 h habituellement (données disponibles dans Sleep Cycle)
- Moral bas, projets à l'arrêt, motivation en berne — **demander un avis**
- Liste complète des compléments pris

### B. DIÈTE

**Cibles** : ~3 000 kcal · ~190 g protéines · potassium 4 000-4 500 mg · sodium 3 000-3 500 mg

**Journée type**
| Moment | Contenu |
|---|---|
| 7 h, maison | 3 œufs + 80 g avoine + banane + purée d'amande |
| Sac | Lait entier 500 ml, amandes, fruits |
| Pause | Salade de riz **ou** boulettes **ou** wrap |
| 18 h, maison | Viande ou poisson + riz/pâtes + julienne + huile d'olive |
| Avant de dormir | 400 ml lait entier |

**À ajouter à l'alimentation actuelle**
- Œufs entiers, 3/jour
- Bœuf 5-15 %, 2-3×/semaine *(absent depuis longtemps)*
- Sardines ou maquereau, 2×/semaine
- Pommes de terre — **meilleure source de potassium**, remplace une partie du riz
- Julienne de légumes (courgette, carotte)
- Avocat, 1/jour
- Noix du Brésil — **2/jour, jamais plus** (sélénium)
- Fruits, 2/jour

**Rejeté explicitement** : skyr nature, brocoli, épinards, œufs durs froids, eau de coco pure *(mélangée, ça passe)*

**Allergies / précautions** : noisette (aphtes) · cacahuète en suspens tant que l'éosinophilie n'est pas clarifiée

**Boissons**
- Boisson de journée : 1 L eau + 500 ml eau de coco + ¾ c. à café de sel + jus d'un citron
- Pré-salle (2-3 h avant) : 300 g betterave crue + 2 carottes + citron + gingembre — 2-3×/semaine
- Post-training : jus de grenade 200-250 ml — jours d'entraînement uniquement
- **Piège à éviter** : remplacer l'ice tea supprimé par un jus de fruits quotidien, plus concentré en sucre

### C. COMPLÉMENTS & PRODUITS

**Ne rien démarrer dans les 2-3 semaines avant la prise de sang.**

| Produit | Statut |
|---|---|
| Créatine monohydrate 5 g/j | ✅ À prendre — le mieux prouvé |
| Vitamine D3 + K2 | ⏸ Après dosage du 25-OH-D |
| Magnésium bisglycinate 300-400 mg soir | ✅ Vérifier la prise effective |
| Zinc bisglycinate 15-25 mg | ⏸ Si carence — max 3 mois d'affilée |
| Oméga-3 2 g EPA+DHA | ✅ Si peu de poisson gras |
| Ashwagandha KSM-66 600 mg | 🔴 **Après le bilan thyroïdien** — stimule la thyroïde |
| Sel de potassium (KCl) | 🔴 Avis médical requis — marqueur rénal G2 |
| Tribulus, fenugrec, Tongkat Ali, maca « booster », DAA, ZMA | ❌ Sans effet — ne pas acheter |

**Peptides — registre d'intérêt** *(aucun ne franchit les conditions préalables à ce jour)* : Rétatrutide, TRT, sécrétagogues GH, BPC-157, SS-31, MOTS-c, Cardiogen, Retinalamin.
**Ordre décidé** : perte de gras → bilan → décision TRT. Pas l'inverse.

### D. ENTRAÎNEMENT

**Reprise progressive** — après 10 mois d'arrêt
- Semaines 1-2 : 2 séances, full body, 3 exercices, 3 séries, **RPE 6**, 40 min, charges à 50-60 %
- Semaines 3-4 : 3 séances, 4 exercices, RPE 7
- Semaines 5-8 : montée progressive, **zéro échec musculaire**
- **Règle absolue** : sortir de séance en se sentant capable de la refaire

Séance A : Presse ou squat 3×8 · Développé couché 3×8 · Rowing 3×10
Séance B : Soulevé de terre roumain 3×8 · Développé militaire 3×8 · Tirage vertical 3×10

⚠️ **À signaler au médecin** : aggravation nette 24-48 h après une séance (pas des courbatures — un épuisement)

**Cou** — 2-3×/semaine, 4 premières semaines sans charge
Flexion 3×15 · Extension 3×15 · Flexion latérale 2×12 · Shrugs 3×12
Arrêt immédiat si douleur cervicale, vertige ou fourmillements

**Cardio** — LISS 2-3×/semaine. *C'est la réponse au « cardio affreux », pas un peptide.*

### E. RELAXATION

**2 sessions par jour, à domicile** (pas en voiture)
| Session | Déclencheur | Contenu |
|---|---|---|
| Matin | Chaussures enfilées, avant d'ouvrir la porte | Respiration 5-5, 5 min |
| Retour — **la plus importante** | Contact coupé devant chez toi, tu ne sors pas avant | Respiration 5-5, 5 min |
| Coucher | Allongé, lumière éteinte | Inspire 4 s / expire 8 s, 5 min |
| 2×/semaine | — | Jacobson ou NSDR, 15-20 min |

App : **RespiRelax+**. Objectif : la session du retour tous les jours, celle du matin quand c'est possible.

### F. VISAGE & APPARENCE

**Matin** : nettoyant → vitamine C → acide hyaluronique → hydratant → **SPF50, deux doigts**
→ ⚠️ **Stick SPF dans le camion**, retouche vers 12-13 h (travail en extérieur toute la journée)

**Rasage** : après la douche · premier passage dans le sens du poil · pas de repassage · après-rasage sans alcool

**Soir** : nettoyant → attendre 20 min → trétinoïne (petit pois) → attendre 20 min → hydratant

**Montée trétinoïne** : S1-2 → 2 soirs/sem · S3-4 → 3 soirs/sem · S5-8 → 1 soir sur 2 · puis quotidien si toléré
⚠️ Purge attendue à S4-S6 : **c'est normal, ne pas arrêter**
⚠️ Jamais vitamine C le même soir · jamais avec le rétinol · pas d'exfoliants pendant la montée

**En attente** : photo de référence des golfes · après-shampoing à rincer · sourcils (sous l'arcade uniquement) · test barbe 4 mm

### G. APPRENTISSAGES

**Actif — un seul : Mentalisme, 20 min/jour**
Quatre briques : techniques de mémoire · cold reading · magie mentale · **présentation (80 % de l'effet)**
Livres : *Tricks of the Mind* (Derren Brown) → *13 Steps to Mentalism* (Corinda)
Méthode : un effet à la fois, jusqu'à l'exécuter sans y penser, **puis le présenter à de vraies personnes**

**En passif** : anglais — bascule ce que tu regardes déjà en VO sous-titrée. Zéro temps dédié.

**En file d'attente** : charisme *(porté par le mentalisme)* · détection du mensonge · peptides · le reste

---

## 4 bis. Import depuis une conversation avec Claude — **fonctionnalité centrale**

Le besoin : après une discussion avec Claude, faire atterrir le résultat dans l'app **sans tout retaper**. C'est le complément indispensable du bouton « + ».

### Le format d'échange

Claude produit un bloc de code balisé `suivi`. Une ligne = un ajout. Le tag entre crochets désigne la rubrique de destination.

```suivi
[sante/rendezvous] Téléconsultation prise — mardi 2 sept, 20h30, Qare
[sante/adire] Signaler l'asthme de l'enfance et l'intolérance à l'effort
[diete] Salade de riz testée — bonne froide avec citron et cumin
[complements] Créatine 5 g démarrée le 01/09
[entrainement] Séance A faite — RPE 6, aucune douleur le lendemain
[relaxation] Session du retour tenue 4 jours sur 5
[visage] SPF stick acheté pour le camion
[apprentissage] Premier effet mentalisme travaillé — forçage classique
[suivi] sommeil=7.5 fc=58 energie=3
```

**Règles de parsing**
- Une ligne par entrée, tag obligatoire en début de ligne entre crochets.
- Tags valides : `sante/rendezvous`, `sante/ordonnances`, `sante/adire`, `sante/resultats`, `diete`, `complements`, `entrainement`, `relaxation`, `visage`, `apprentissage`, `suivi`.
- **Tag inconnu ou absent → l'entrée part dans la Boîte de réception, jamais perdue.**
- La ligne `[suivi]` accepte des paires `clé=valeur` (`sommeil`, `fc`, `energie`) et alimente le graphique.
- Toute entrée importée est horodatée et marquée « importé depuis Claude », pour la distinguer d'une saisie manuelle.

### Les trois chemins d'import (à implémenter dans cet ordre)

**1. Coller — indispensable, marche partout.**
Un bouton **« Importer depuis Claude »** ouvre une grande zone de texte. L'utilisateur colle le bloc, l'app affiche un aperçu de ce qui va être ajouté et où, il valide. Environ 10 secondes. **C'est le chemin par défaut, à faire en premier.**

**2. Partage direct (Android) — le plus fluide sur téléphone.**
Déclarer la PWA comme **Web Share Target** dans le manifeste. L'app apparaît alors dans le menu « Partager » du système : depuis n'importe quelle application, y compris Claude, on sélectionne le texte → Partager → l'app de suivi → l'import s'ouvre pré-rempli.

```json
"share_target": {
  "action": "/import",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

**3. Fichier — pour les gros volumes.**
Import d'un `.md` ou `.json`. Sert aussi de passerelle avec le coffre Obsidian : Claude écrit un fichier `inbox-app.md` dans le coffre (synchronisé par OneDrive), l'app l'importe.

### Robustesse

- **L'import doit être idempotent** : réimporter deux fois le même bloc ne crée pas de doublons (hacher chaque ligne).
- L'aperçu avant validation est obligatoire — jamais d'écriture silencieuse.
- Si le bloc est mal formé, importer quand même **tout le texte brut** dans la Boîte de réception plutôt que d'échouer.

---

## 5. Fonctionnalités

**Indispensables**
1. Bouton **« + »** flottant sur tous les écrans → champ texte libre + sélecteur de rubrique → enregistré, horodaté.
2. Cases à cocher sur tout élément d'un protocole.
3. Vue **« Aujourd'hui »** : uniquement ce qui est à faire aujourd'hui.
4. Vue **« Bloqué »** : tout ce qui attend le bilan sanguin, regroupé. Doit rendre visible que *presque tout* dépend d'un seul rendez-vous.
5. Recherche plein texte.
6. **Export complet** en Markdown — pour reverser dans Obsidian.

**Utiles ensuite**
- Historique du suivi quotidien avec un graphique simple (sommeil, FC repos, énergie).
- Rappels sur les deux sessions de relaxation.
- Une note libre par rubrique.

**À ne pas faire**
- Pas de comptes ni de synchronisation cloud au départ.
- Pas de notifications autres que les deux rappels.
- Pas de scores ni de badges.

---

## 6. Technique suggérée

- **Web app installable (PWA)** — fonctionne sur téléphone et ordinateur, pas de store, mise à jour instantanée.
- **React + Vite + Tailwind**, stockage **local** (`localStorage` ou IndexedDB) au départ.
- **Un seul objet JSON** contenant toutes les rubriques → simplifie l'export Markdown et la sauvegarde.
- Thème clair **et** sombre, contraste élevé (consultation en extérieur).
- Export/import du JSON en un bouton, pour ne jamais perdre les données.

---

## 7. Écran d'accueil — les trois blocs

1. **La prochaine action bloquante** — en haut, en grand. Aujourd'hui : *« Prendre la téléconsultation »*.
2. **Les cases du jour** — relaxation, compléments, repas, entraînement.
3. **Le bouton « + »** — toujours visible.

Tout le reste vit derrière un menu.
