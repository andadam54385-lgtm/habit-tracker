// Écran d'import (spec §4 bis). Trois chemins : coller, partage système,
// fichier. Aucun n'écrit sans aperçu validé.

import { esc, escLines, toast } from "./ui.js";
import { parseImport } from "./parser.js";
import { commitImport } from "./io.js";
import { state } from "./state.js";
import { SECTION_MAP } from "./seed.js";

let pending = null;     // résultat de parseImport en attente de validation
let pendingSource = "claude";

const CONSIGNE = [
  "Quand tu me donnes un résultat à reporter dans mon app de suivi, termine par un bloc de code balisé `suivi`.",
  "Une ligne = une entrée, avec un tag entre crochets en début de ligne.",
  "Tags valides : sante/rendezvous, sante/ordonnances, sante/adire, sante/resultats, diete, nutrition, nutrition/plancher, nutrition/rotation, complements, entrainement, relaxation, visage, apprentissage, suivi.",
  "La ligne [suivi] accepte des paires clé=valeur : sommeil, fc, energie.",
  "Pour compléter un aliment : [aliment:<id>] k=350 mg=140 ca=54 fe=4 zn=3 c=0 b9=32 d=0 b12=0 se=28 om3=0",
  "Exemple :",
  "```suivi",
  "[sante/rendezvous] Téléconsultation prise — mardi 2 sept, 20h30, Qare",
  "[complements] Créatine 5 g démarrée le 01/09",
  "[suivi] sommeil=7.5 fc=58 energie=3",
  "```"
].join("\n");

function canReadClipboard() {
  return typeof navigator !== "undefined" && navigator.clipboard &&
    typeof navigator.clipboard.readText === "function";
}

export function viewImport() {
  return '<div class="view">' +
    '<header class="view-head"><h1>Importer depuis Claude</h1>' +
      '<p class="sub">Colle le bloc <code>suivi</code>, vérifie l\'aperçu, valide.</p></header>' +

    '<textarea id="imp-text" class="imp-text" rows="8" ' +
      'placeholder="Colle ici le bloc produit par Claude…"></textarea>' +

    '<div class="imp-actions">' +
      // iOS n'implémente pas le Web Share Target : coller en un tap est le
      // chemin le plus court depuis Claude sur iPhone.
      (canReadClipboard()
        ? '<button type="button" class="btn btn-primary" data-act="paste">Coller et analyser</button>' +
          '<button type="button" class="btn btn-ghost" data-act="analyse">Analyser</button>'
        : '<button type="button" class="btn btn-primary" data-act="analyse">Analyser</button>') +
      '<button type="button" class="btn btn-ghost" data-act="pick-file">Depuis un fichier</button>' +
      '<input type="file" id="imp-file" accept=".md,.markdown,.txt,.json" hidden>' +
    "</div>" +

    '<div id="imp-preview"></div>' +

    '<section class="imp-help">' +
      "<h3>Le format attendu</h3>" +
      "<pre class=\"code\">```suivi\n" +
        "[sante/rendezvous] Téléconsultation prise — mardi 2 sept, 20h30, Qare\n" +
        "[diete] Salade de riz testée — bonne froide avec citron et cumin\n" +
        "[suivi] sommeil=7.5 fc=58 energie=3\n" +
        "```</pre>" +
      '<p class="hint">Une ligne sans tag, ou avec un tag inconnu, part dans la boîte de réception. ' +
        "Rien n'est jamais perdu. Réimporter deux fois le même bloc ne crée pas de doublons.</p>" +
      '<button type="button" class="btn btn-ghost btn-block" data-act="copy-consigne">' +
        "Copier la consigne à donner à Claude</button>" +
    "</section>" +

    // Pont Apple Santé sans cloud : un Raccourci iOS ouvre l'app avec le
    // relevé dans l'adresse, l'import se remplit tout seul.
    '<details class="fold imp-help"><summary class="fold-head"><span class="fold-caret" aria-hidden="true">›</span>' +
      "<h2>Relier Sleep Cycle / Apple Santé (Raccourci iOS)</h2></summary><div class=\"fold-body\">" +
      '<p class="hint">Sleep Cycle écrit ton sommeil dans Apple Santé. Un Raccourci le lit chaque matin et ouvre cette page ' +
        "avec la ligne déjà remplie : le sommeil pré-remplit le check-in du matin.</p>" +
      '<ol class="howto-steps">' +
        "<li>Dans <strong>Sleep Cycle</strong> → Réglages → Apple Santé : active l'écriture de <strong>Analyse du sommeil</strong>.</li>" +
        "<li>Dans <strong>Raccourcis</strong> → « + » → action <strong>Rechercher des échantillons de santé</strong> : type <em>Analyse du sommeil</em>, " +
          "filtre <em>Valeur est Endormi</em> et <em>Date de début est dans les dernières 24 heures</em>.</li>" +
        "<li>Action <strong>Obtenir les statistiques</strong> sur le résultat : <em>Somme</em>, unité <em>heures</em>. Puis <strong>Arrondir le nombre</strong> à 1 décimale.</li>" +
        "<li>Action <strong>Texte</strong> : <code>[suivi] sommeil=</code> suivi de la variable arrondie. " +
          "Avec une Apple Watch, ajoute sur la même ligne <code>fc=</code> (fréquence cardiaque au repos) et <code>hrv=</code> (variabilité) obtenus de la même façon.</li>" +
        "<li>Action <strong>Encoder l'URL</strong> sur le texte, puis <strong>Ouvrir des URL</strong> : " +
          "<code>https://andadam54385-lgtm.github.io/habit-tracker/#/import?t=</code> suivi du texte encodé.</li>" +
        "<li>Onglet <strong>Automatisation</strong> → Heure du jour → 7 h → <em>Exécuter immédiatement</em> → ce raccourci. Le matin, l'app s'ouvre sur l'aperçu, tu valides.</li>" +
      "</ol>" +
      '<p class="hint">Sans montre, pas de HRV ni de FC de repos : Sleep Cycle ne les mesure pas. Le sommeil seul suffit au check-in.</p>' +
    "</div></details>" +
    "</div>";
}

export function mountImport(prefill) {
  const text = document.getElementById("imp-text");
  const preview = document.getElementById("imp-preview");
  const file = document.getElementById("imp-file");
  if (!text) return;

  if (prefill) {
    text.value = prefill;
    pendingSource = "partage";
    analyse();
  }

  document.querySelector('[data-act="analyse"]').addEventListener("click", function () {
    pendingSource = "claude";
    analyse();
  });

  const pasteBtn = document.querySelector('[data-act="paste"]');
  if (pasteBtn) {
    pasteBtn.addEventListener("click", function () {
      navigator.clipboard.readText().then(function (clip) {
        if (!clip || !clip.trim()) { toast("Presse-papiers vide", "error"); return; }
        text.value = clip;
        pendingSource = "claude";
        analyse();
      }).catch(function () {
        toast("Colle le texte à la main dans le champ ci-dessus", "error");
        text.focus();
      });
    });
  }

  document.querySelector('[data-act="pick-file"]').addEventListener("click", () => file.click());

  file.addEventListener("change", function () {
    const f = file.files && file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      text.value = String(reader.result || "");
      pendingSource = "fichier";
      analyse();
    };
    reader.onerror = function () { toast("Lecture du fichier impossible", "error"); };
    reader.readAsText(f);
    file.value = "";
  });

  document.querySelector('[data-act="copy-consigne"]').addEventListener("click", function () {
    navigator.clipboard.writeText(CONSIGNE)
      .then(() => toast("Consigne copiée"))
      .catch(() => toast("Copie impossible — sélectionne le texte à la main", "error"));
  });

  // Modifier le texte après l'analyse rend l'aperçu mensonger : on l'invalide,
  // il faudra ré-analyser avant de pouvoir importer (spec §4 bis).
  text.addEventListener("input", function () {
    if (pending) { pending = null; preview.innerHTML = ""; }
  });

  function analyse() {
    const raw = text.value;
    if (!raw.trim()) { preview.innerHTML = ""; pending = null; return; }

    // Une sauvegarde JSON complète collée ici finirait en bloc brut dans
    // l'inbox : on aiguille vers la vraie restauration.
    if (raw.trim()[0] === "{") {
      try {
        const maybe = JSON.parse(raw.trim());
        if (maybe && Array.isArray(maybe.items)) {
          pending = null;
          preview.innerHTML = '<p class="callout callout-static">Ceci ressemble à une ' +
            "sauvegarde JSON de l'app, pas à un bloc « suivi ». Passe par " +
            "<strong>Réglages → Restaurer depuis un JSON</strong>.</p>";
          return;
        }
      } catch (e) { /* pas du JSON : import texte normal */ }
    }

    pending = parseImport(raw, state.importedHashes);
    renderPreview();
  }

  function renderPreview() {
    if (!pending || !pending.entries.length) {
      preview.innerHTML = '<p class="empty">Rien à importer dans ce texte.</p>';
      return;
    }

    let html = '<section class="preview">';
    html += '<div class="block-head"><h2>Aperçu</h2><span class="counter">' +
      pending.fresh + " à ajouter" + (pending.duplicates ? " · " + pending.duplicates + " déjà importés" : "") +
      "</span></div>";

    if (pending.malformed) {
      html += '<p class="callout callout-static">Aucun tag reconnu dans ce texte. ' +
        "Il sera importé en entier dans la boîte de réception plutôt que perdu.</p>";
    }

    const groups = new Map();
    for (const e of pending.entries) {
      const key = e.type === "metric" ? "suivi" : (e.type === "food" ? "__aliments" : e.section);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }

    for (const [key, list] of groups) {
      const sec = key === "__aliments"
        ? { icon: "🍽️", label: "Aliments à compléter" }
        : (SECTION_MAP[key] || { icon: "📥", label: "Boîte de réception" });
      html += '<h3 class="group-title">' + esc(sec.icon + " " + sec.label) + "</h3><ul class=\"preview-list\">";
      for (const e of list) {
        const label = e.type === "metric"
          ? esc(e.label) + (e.date ? " — " + esc(e.date) : " — aujourd'hui")
          : (e.type === "food" ? esc(e.label) : escLines(e.title));
        html += '<li class="preview-item' + (e.duplicate ? " is-dup" : "") + '">' +
          '<span class="preview-mark">' + (e.duplicate ? "↺" : "+") + "</span>" +
          "<span>" + label +
            (e.unknownTag ? ' <span class="badge badge-quiet">tag inconnu : ' + esc(e.originalTag) + "</span>" : "") +
            (e.duplicate ? ' <span class="badge badge-quiet">déjà importé</span>' : "") +
          "</span></li>";
      }
      html += "</ul>";
    }

    html += '<div class="sheet-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="cancel-import">Annuler</button>' +
      '<button type="button" class="btn btn-primary" data-act="commit"' + (pending.fresh ? "" : " disabled") + ">" +
        (pending.fresh ? "Importer " + pending.fresh + (pending.fresh > 1 ? " entrées" : " entrée") : "Rien de nouveau") +
      "</button></div>";
    html += "</section>";

    preview.innerHTML = html;

    const commitBtn = preview.querySelector('[data-act="commit"]');
    if (commitBtn) {
      commitBtn.addEventListener("click", function () {
        const res = commitImport(pending.entries, pendingSource);
        pending = null;
        text.value = "";
        preview.innerHTML = "";
        const bits = [];
        if (res.added) bits.push(res.added + (res.added > 1 ? " entrées ajoutées" : " entrée ajoutée"));
        if (res.foods) bits.push(res.foods + " aliment" + (res.foods > 1 ? "s complétés" : " complété"));
        if (res.metrics) bits.push(res.metrics + " relevé" + (res.metrics > 1 ? "s" : "") + " de suivi");
        if (res.skipped) bits.push(res.skipped + " doublon" + (res.skipped > 1 ? "s" : "") + " ignoré" + (res.skipped > 1 ? "s" : ""));
        toast(bits.join(" · ") || "Rien à importer");
      });
    }
    preview.querySelector('[data-act="cancel-import"]').addEventListener("click", function () {
      pending = null;
      preview.innerHTML = "";
    });
  }
}
