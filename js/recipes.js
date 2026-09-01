// Onglet Recettes : on compose une recette une fois, on n'enregistre ensuite
// qu'un nombre de parts dans la journée.

import { esc, openSheet, toast, confirmSheet } from "./ui.js";
import {
  recipes, recipeById, upsertRecipe, removeRecipe, recipePerPart,
  foodById, searchFoods, nutrientMap, FOOD_CATS, addRecipeParts, logFor
} from "./nutrition.js";

function fmtN(v) {
  const r = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return r.toLocaleString("fr-FR");
}

function unitOf(f) { return f.unit === "u" ? "" : f.unit; }

export function nutritionTabs(active) {
  return '<nav class="tabs nut-tabs">' +
    '<a class="tab' + (active === "jour" ? " is-active" : "") + '" href="#/nutrition">Ma journée</a>' +
    '<a class="tab' + (active === "recettes" ? " is-active" : "") + '" href="#/recettes">Recettes</a>' +
    "</nav>";
}

export function viewRecipes() {
  const list = recipes();
  const log = logFor();

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>🍲 Recettes</h1><p class="sub">' +
    "Compose une fois, enregistre ensuite en parts.</p></header>";
  html += nutritionTabs("recettes");

  html += '<button type="button" class="btn btn-block btn-primary" data-act="new-recipe">+ Nouvelle recette</button>';

  if (!list.length) {
    html += '<p class="empty">Aucune recette. Crée-en une : tu indiques les ingrédients ' +
      "et le nombre de parts, l'app calcule ce que vaut une part.</p>";
  } else {
    html += '<ul class="nut-foods">';
    for (const r of list) {
      const per = recipePerPart(r);
      const parts = (log.recipes || {})[r.id] || 0;
      const nb = Object.keys(r.items || {}).length;
      html += '<li class="nut-food' + (parts ? " has-qty" : "") + '">' +
        '<div class="nut-food-main" data-act="edit-recipe" data-recipe="' + esc(r.id) + '" role="button" tabindex="0">' +
          '<span class="nut-food-label">' + esc(r.label) + "</span>" +
          '<span class="nut-food-detail">1 part : ' + fmtN(per.kcal || 0) + " kcal · " +
            fmtN(per.prot || 0) + " P · " + fmtN(per.glu || 0) + " G · " + fmtN(per.lip || 0) + " L</span>" +
          '<span class="nut-food-detail">' + nb + " ingrédient" + (nb > 1 ? "s" : "") +
            " · " + r.portions + " part" + (r.portions > 1 ? "s" : "") + "</span>" +
        "</div>" +
        '<div class="qty-box">' +
          '<button type="button" class="qty-btn" data-act="rec-minus" data-recipe="' + esc(r.id) +
            '" aria-label="Retirer une part"' + (parts ? "" : " disabled") + ">−</button>" +
          '<span class="qty-val is-static">' + fmtN(parts) + "</span>" +
          '<button type="button" class="qty-btn" data-act="rec-plus" data-recipe="' + esc(r.id) +
            '" aria-label="Ajouter une part">+</button>' +
        "</div>" +
      "</li>";
    }
    html += "</ul>";
    html += '<p class="hint">Le + ajoute une part à ta journée. Touche le nom pour modifier la recette.</p>';
  }

  html += "</div>";
  return html;
}

// ------------------------------------------------------------- éditeur

// Brouillon en cours d'édition : la feuille se rouvre après chaque ajout
// d'ingrédient, il faut donc conserver l'état entre deux ouvertures.
let draft = null;

export function openRecipeEditor(id, resume) {
  const existing = id ? recipeById(id) : null;
  // « Nouvelle recette » repart toujours de zéro : sans ce reset, un brouillon
  // abandonné des jours plus tôt ressusciterait (resume = retour du picker).
  if (!resume && !existing) draft = null;
  if (!draft || draft.id !== (existing ? existing.id : null)) {
    draft = existing
      ? { id: existing.id, label: existing.label, portions: existing.portions, items: Object.assign({}, existing.items) }
      : { id: null, label: "", portions: 4, items: {} };
  }

  openSheet(existing ? "Modifier la recette" : "Nouvelle recette", function (body, close) {
    function totals() {
      const t = {};
      for (const [fid, qty] of Object.entries(draft.items)) {
        const f = foodById(fid);
        if (!f) continue;
        const factor = qty / f.base;
        for (const nk in f.n) t[nk] = (t[nk] || 0) + f.n[nk] * factor;
      }
      return t;
    }

    function render() {
      const t = totals();
      const parts = Math.max(1, draft.portions || 1);
      body.innerHTML =
        '<label class="field"><span>Nom</span>' +
          '<input type="text" id="rc-label" class="input" maxlength="80" placeholder="Ex : Salade de riz du midi" ' +
            'value="' + esc(draft.label) + '"></label>' +
        '<label class="field"><span>Nombre de parts</span>' +
          '<input type="number" id="rc-parts" class="input input-lg" inputmode="numeric" min="1" max="30" ' +
            'value="' + parts + '"></label>' +

        '<div class="block-head" style="margin-top:14px"><h2>Ingrédients</h2>' +
          '<button type="button" class="btn btn-small btn-primary" data-act="rc-add">+ Ajouter</button></div>' +

        (Object.keys(draft.items).length
          ? '<ul class="nut-foods">' + Object.entries(draft.items).map(function ([fid, qty]) {
              const f = foodById(fid);
              if (!f) return "";
              return '<li class="nut-food has-qty">' +
                '<div class="nut-food-main">' +
                  '<span class="nut-food-label">' + esc(f.label) + "</span>" +
                  '<span class="nut-food-detail">' + fmtN(qty) + " " + esc(unitOf(f) || "pièce") + "</span>" +
                "</div>" +
                '<button type="button" class="nut-del" data-act="rc-del" data-food="' + esc(fid) +
                  '" aria-label="Retirer">✕</button>' +
              "</li>";
            }).join("") + "</ul>"
          : '<p class="empty">Aucun ingrédient pour l\'instant.</p>') +

        '<div class="q-preview"><div class="q-macros">' +
          '<span><strong>' + fmtN((t.kcal || 0) / parts) + "</strong> kcal</span>" +
          "<span><strong>" + fmtN((t.prot || 0) / parts) + "</strong> g P</span>" +
          "<span><strong>" + fmtN((t.glu || 0) / parts) + "</strong> g G</span>" +
          "<span><strong>" + fmtN((t.lip || 0) / parts) + "</strong> g L</span>" +
        '</div><p class="q-micros">par part · total ' + fmtN(t.kcal || 0) + " kcal pour " +
          parts + " part" + (parts > 1 ? "s" : "") + "</p></div>" +

        '<div class="sheet-actions">' +
          (existing ? '<button type="button" class="btn btn-danger-ghost" data-act="rc-remove">Supprimer</button>' : "") +
          '<button type="button" class="btn btn-primary" data-act="rc-save">Enregistrer</button>' +
        "</div>";

      body.querySelector("#rc-label").addEventListener("input", (e) => { draft.label = e.target.value; });
      body.querySelector("#rc-parts").addEventListener("input", function (e) {
        draft.portions = parseInt(e.target.value, 10) || 1;
        const caret = e.target.selectionStart;
        render();
        const el = body.querySelector("#rc-parts");
        el.focus();
        try { el.setSelectionRange(caret, caret); } catch (err) { /* champ number */ }
      });

      body.querySelector('[data-act="rc-add"]').addEventListener("click", function () {
        close();
        openIngredientPicker();
      });

      body.querySelectorAll('[data-act="rc-del"]').forEach(function (b) {
        b.addEventListener("click", function () { delete draft.items[b.dataset.food]; render(); });
      });

      body.querySelector('[data-act="rc-save"]').addEventListener("click", function () {
        if (!draft.label.trim()) { body.querySelector("#rc-label").focus(); return; }
        if (!Object.keys(draft.items).length) { toast("Ajoute au moins un ingrédient", "error"); return; }
        const saved = upsertRecipe(draft);
        draft = null;
        close();
        if (saved) toast(saved.label + " enregistrée");
      });

      const rm = body.querySelector('[data-act="rc-remove"]');
      if (rm) rm.addEventListener("click", function () {
        const label = draft.label;
        const rid = draft.id;
        draft = null;
        close();
        confirmSheet("Supprimer ?", "« " + label + " » sera retirée, ainsi que ses parts enregistrées.",
          "Supprimer", function () { removeRecipe(rid); toast("Supprimée"); });
      });
    }

    render();
  }, { onClose: function () { /* le brouillon survit à la fermeture */ } });
}

// Choix d'un ingrédient puis de sa quantité, sans quitter le brouillon.
function openIngredientPicker() {
  let q = "", cat = "all";

  openSheet("Ajouter un ingrédient", function (body, close) {
    function render() {
      const results = searchFoods(q, cat).slice(0, 60);
      body.innerHTML =
        '<input type="search" id="ip-q" class="input input-lg" placeholder="Nom de l\'ingrédient…" ' +
          'value="' + esc(q) + '" autocomplete="off">' +
        '<select id="ip-cat" class="input">' +
          '<option value="all">Toutes les catégories</option>' +
          FOOD_CATS.map((c) => '<option value="' + c.key + '"' + (cat === c.key ? " selected" : "") +
            ">" + esc(c.icon + " " + c.label) + "</option>").join("") +
        "</select>" +
        (results.length
          ? '<ul class="food-results">' + results.map(function (f) {
              return '<li class="food-row" data-food="' + esc(f.id) + '" role="button" tabindex="0">' +
                '<span class="food-row-main">' +
                  '<span class="food-row-label">' + esc(f.label) + "</span>" +
                  '<span class="food-row-detail">' + fmtN(f.n.kcal || 0) + " kcal / " +
                    f.base + " " + esc(unitOf(f) || "pièce") + "</span>" +
                "</span><span class=\"food-row-add\" aria-hidden=\"true\">+</span></li>";
            }).join("") + "</ul>"
          : '<p class="empty">Aucun aliment trouvé.</p>');

      const qi = body.querySelector("#ip-q");
      let timer = null;
      qi.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          q = qi.value;
          const caret = qi.selectionStart;
          render();
          const nq = body.querySelector("#ip-q");
          nq.focus();
          nq.setSelectionRange(caret, caret);
        }, 200);
      });
      body.querySelector("#ip-cat").addEventListener("change", function (e) { cat = e.target.value; render(); });

      body.querySelectorAll(".food-row").forEach(function (row) {
        row.addEventListener("click", function () {
          close();
          openIngredientQuantity(row.dataset.food);
        });
      });
    }
    render();
  });
}

function openIngredientQuantity(foodId) {
  const f = foodById(foodId);
  if (!f) return;
  const unit = unitOf(f) || "pièce";
  const current = draft && draft.items[foodId] ? draft.items[foodId] : (f.unit === "u" ? 1 : f.base);

  openSheet(f.label, function (body, close) {
    const quick = f.unit === "ml" ? [50, 100, 250, 500] : f.unit === "g" ? [50, 100, 200, 500] : [1, 2, 4, 6];
    body.innerHTML =
      '<label class="field"><span>Quantité dans la recette, en ' + esc(unit) + "</span>" +
        '<input type="number" id="iq-input" class="input input-lg" inputmode="decimal" min="0" value="' + esc(current) + '"></label>' +
      '<div class="chips">' + quick.map((v) => '<button type="button" class="chip" data-add="' + v + '">+' + v + "</button>").join("") + "</div>" +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-primary" data-act="iq-ok">Ajouter à la recette</button>' +
      "</div>";

    const input = body.querySelector("#iq-input");
    body.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = (parseFloat(input.value) || 0) + parseFloat(b.dataset.add);
      });
    });
    body.querySelector('[data-act="iq-ok"]').addEventListener("click", function () {
      const q = Math.max(0, Math.round(parseFloat(String(input.value).replace(",", ".")) || 0));
      if (q > 0 && draft) draft.items[foodId] = q;
      close();
      openRecipeEditor(draft ? draft.id : null, true);
    });
    input.focus();
    input.select();
  });
}

export function mountRecipes() { /* délégation dans app.js */ }
