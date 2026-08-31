// Écran diète : journal du jour, recherche d'aliments par type,
// réglage des cibles et calibrage des compléments.

import { esc, openSheet, toast, confirmSheet } from "./ui.js";
import { dayKey, weekDayKeys } from "./state.js";
import {
  nutrients, nutrientMap, targets, setTarget, kcalTarget, fmtRange,
  allFoods, foodById, searchFoods, addCustomFood, removeCustomFood,
  supplements, upsertSupplement, removeSupplement,
  logFor, setQuantity, addQuantity, setSupplement, addSupplementUnits,
  addLibre, removeLibre, dayTotals, preview, isMet,
  loggedDayKeys, dietRate, FOOD_CATS, CAT_MAP, UNIT_LABEL,
  microCompleteness, foodsNeedingMicros, buildCompletionRequest,
  bestSourcesFor, gapsToday, recipes, recipePerPart, setQuantity as setQty
} from "./nutrition.js";
import { nutritionTabs } from "./recipes.js";

function fmtN(v) {
  const r = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return r.toLocaleString("fr-FR");
}

function unitOf(f) { return f.unit === "u" ? "" : f.unit; }

// --------------------------------------------------------------- tuiles

function macroTile(n, value) {
  const pct = Math.min(100, (value / n.target) * 100);
  const met = isMet(n, value);
  const over = n.ceil && value > n.ceil;
  return '<div class="nut-tile' + (met ? " is-full" : "") + (over ? " is-over" : "") + '">' +
    '<span class="nut-tile-label">' + esc(n.label) + "</span>" +
    '<span class="nut-tile-val">' + fmtN(value) + "</span>" +
    '<span class="nut-tile-target">' + esc(fmtRange(n)) + " " + esc(n.unit) + "</span>" +
    '<div class="bar"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
    "</div>";
}

function bar(n, value) {
  const pct = Math.min(100, (value / n.target) * 100);
  const over = n.ceil && value > n.ceil;
  const full = !over && isMet(n, value);
  return '<div class="nut' + (over ? " is-over" : (full ? " is-full" : "")) + '">' +
    '<div class="nut-head">' +
      '<span class="nut-label">' + esc(n.label) + "</span>" +
      '<span class="nut-val">' + fmtN(value) + ' <span class="nut-target">/ ' +
        esc(fmtRange(n)) + " " + esc(n.unit) + "</span></span>" +
    "</div>" +
    '<div class="bar"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
    (over && n.warn ? '<p class="nut-warn">⚠️ ' + esc(n.warn) + "</p>" : "") +
    (!full && !over
      ? '<button type="button" class="nut-fill" data-act="fill-gap" data-nut="' + esc(n.key) + '">' +
        "Quoi manger pour combler ? →</button>"
      : "") +
    "</div>";
}

// « Quel plat manger pour augmenter ce qui manque » : on classe aliments et
// recettes par teneur pour une portion réaliste, et on dit combien il en faut.
export function openGapFiller(nutKey) {
  const nmap = nutrientMap();
  const n = nmap[nutKey];
  if (!n) return;
  const value = dayTotals()[nutKey] || 0;
  const min = n.min !== undefined ? n.min : n.target;
  const gap = Math.max(0, min - value);

  openSheet("Combler : " + n.label, function (body) {
    const sources = bestSourcesFor(nutKey, gap).slice(0, 12);
    body.innerHTML =
      '<div class="q-preview"><div class="q-macros">' +
        "<span><strong>" + fmtN(value) + "</strong> / " + fmtN(min) + " " + esc(n.unit) + "</span>" +
        (gap > 0 ? '<span class="gap-left">il manque <strong>' + fmtN(gap) + " " + esc(n.unit) + "</strong></span>" : "") +
      "</div></div>" +
      (n.note ? '<p class="hint">' + esc(n.note) + "</p>" : "") +
      (sources.length
        ? '<ul class="food-results">' + sources.map(function (s) {
            return '<li class="food-row' + (s.kind === "recipe" ? " is-recipe" : "") + '">' +
              '<span class="food-row-main">' +
                '<span class="food-row-label">' + (s.kind === "recipe" ? "🍲 " : "") + esc(s.label) + "</span>" +
                '<span class="food-row-detail">' + fmtN(s.amount) + " " + esc(n.unit) +
                  " pour " + esc(s.serving) + " · " + fmtN(s.kcal) + " kcal</span>" +
                (gap > 0 && s.needed
                  ? '<span class="food-row-need">il t\'en faudrait ' + fmtN(s.needed) + " " +
                    esc(s.unit === "u" ? "pièce" + (s.needed > 1 ? "s" : "") : s.unit) + "</span>"
                  : "") +
              "</span></li>";
          }).join("") + "</ul>"
        : '<p class="empty">Aucune source connue dans le catalogue.</p>') +
      '<p class="hint">Classement par teneur pour une portion réaliste. ' +
        "Les recettes sont comptées à la part.</p>";
  });
}

// Les manques du jour, résumés en tête d'écran.
function gapsBanner() {
  const gaps = gapsToday().filter((g) => g.gap > 0);
  if (!gaps.length) return "";
  const top = gaps.slice(0, 3);
  return '<section class="gaps">' +
    '<p class="gaps-title">Ce qui manque aujourd\'hui</p>' +
    '<div class="gaps-row">' + top.map(function (g) {
      return '<button type="button" class="gap-chip" data-act="fill-gap" data-nut="' + esc(g.n.key) + '">' +
        esc(g.n.label) + '<span>' + Math.round(g.share * 100) + " %</span></button>";
    }).join("") + "</div>" +
    (gaps.length > 3 ? '<p class="hint">+ ' + (gaps.length - 3) + " autre" +
      (gaps.length - 3 > 1 ? "s" : "") + " plus bas.</p>" : "") +
    "</section>";
}

// ----------------------------------------------------------------- vue

export function viewNutrition() {
  const day = dayTotals();
  const log = logFor();
  const nuts = nutrients();
  const nmap = nutrientMap();
  const t = targets();

  let html = '<div class="view">';
  html += '<header class="view-head"><h1>🍽️ Diète</h1><p class="sub">' +
    esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })) +
    "</p></header>";

  html += nutritionTabs("jour");

  html += '<div class="nut-tiles">' +
    macroTile(nmap.kcal, day.kcal) + macroTile(nmap.prot, day.prot) +
    macroTile(nmap.glu, day.glu) + macroTile(nmap.lip, day.lip) +
    "</div>";

  html += '<button type="button" class="btn btn-block btn-ghost" data-act="edit-targets">' +
    "🎯 Mes cibles : " + t.prot + " P · " + t.glu + " G · " + t.lip + " L " +
    "<span class=\"target-kcal\">→ " + esc(fmtRange(nmap.kcal)) + " kcal</span></button>";

  // ---- journal du jour
  html += '<div class="block-head"><h2>Ma journée</h2>' +
    '<button type="button" class="btn btn-small btn-primary" data-act="open-search">+ Aliment</button></div>';

  const entries = Object.entries(log.items || {});
  if (!entries.length) {
    html += '<p class="empty">Rien de saisi aujourd\'hui. Cherche un aliment pour commencer.</p>';
  } else {
    html += '<ul class="nut-foods">';
    for (const [id, qty] of entries) {
      const f = foodById(id);
      if (!f) continue;
      const p = preview(f, qty);
      const over = f.warnPer && qty > f.warnPer;
      html += '<li class="nut-food has-qty">' +
        '<div class="nut-food-main" data-act="edit-qty" data-food="' + esc(id) + '" role="button" tabindex="0">' +
          '<span class="nut-food-label">' + esc(f.label) + "</span>" +
          '<span class="nut-food-detail">' + fmtN(p.kcal || 0) + " kcal · " +
            fmtN(p.prot || 0) + " P · " + fmtN(p.glu || 0) + " G · " + fmtN(p.lip || 0) + " L</span>" +
          (over ? '<span class="nut-warn">⚠️ ' + esc(f.warnText) + "</span>" : "") +
        "</div>" +
        '<div class="qty-box">' +
          '<button type="button" class="qty-btn" data-act="qty-minus" data-food="' + esc(id) +
            '" aria-label="Diminuer">−</button>' +
          '<button type="button" class="qty-val" data-act="edit-qty" data-food="' + esc(id) + '">' +
            fmtN(qty) + " " + esc(unitOf(f)) + "</button>" +
          '<button type="button" class="qty-btn" data-act="qty-plus" data-food="' + esc(id) +
            '" aria-label="Augmenter">+</button>' +
        "</div>" +
      "</li>";
    }
    html += "</ul>";
  }

  // ---- recettes enregistrées dans la journée
  const recEntries = Object.entries(log.recipes || {});
  if (recEntries.length) {
    html += '<h3 class="group-title">Recettes</h3><ul class="nut-foods">';
    for (const [rid, parts] of recEntries) {
      const r = recipes().find((x) => x.id === rid);
      if (!r) continue;
      const per = recipePerPart(r);
      html += '<li class="nut-food has-qty">' +
        '<div class="nut-food-main">' +
          '<span class="nut-food-label">🍲 ' + esc(r.label) + "</span>" +
          '<span class="nut-food-detail">' + fmtN((per.kcal || 0) * parts) + " kcal · " +
            fmtN((per.prot || 0) * parts) + " P · " + fmtN((per.glu || 0) * parts) + " G · " +
            fmtN((per.lip || 0) * parts) + " L</span>" +
        "</div>" +
        '<div class="qty-box">' +
          '<button type="button" class="qty-btn" data-act="rec-minus" data-recipe="' + esc(rid) + '" aria-label="Retirer une part">−</button>' +
          '<span class="qty-val is-static">' + fmtN(parts) + " p</span>" +
          '<button type="button" class="qty-btn" data-act="rec-plus" data-recipe="' + esc(rid) + '" aria-label="Ajouter une part">+</button>' +
        "</div>" +
      "</li>";
    }
    html += "</ul>";
  }

  // ---- compléments
  html += '<div class="block-head"><h2>Compléments</h2>' +
    '<button type="button" class="btn btn-small btn-ghost" data-act="manage-supps">Calibrer</button></div>';
  const sups = supplements();
  if (!sups.length) {
    html += '<p class="empty">Aucun complément enregistré.</p>';
  } else {
    html += '<ul class="nut-foods">';
    for (const s of sups) {
      const units = (log.supps || {})[s.id] || 0;
      const apport = Object.entries(s.n).map(function ([k, v]) {
        const n = nmap[k];
        return fmtN(v * (units || 1)) + " " + (n ? n.unit : "") + " " + (n ? n.label.toLowerCase() : k);
      }).join(" · ");
      html += '<li class="nut-food' + (units ? " has-qty" : "") + '">' +
        '<div class="nut-food-main">' +
          '<span class="nut-food-label">' + esc(s.label) + "</span>" +
          '<span class="nut-food-detail">' + (apport ? esc(apport) : "aucun apport chiffré") +
            (units ? "" : " / " + esc(s.unit)) + "</span>" +
        "</div>" +
        '<div class="qty-box">' +
          '<button type="button" class="qty-btn" data-act="sup-minus" data-sup="' + esc(s.id) +
            '" aria-label="Diminuer"' + (units ? "" : " disabled") + ">−</button>" +
          '<span class="qty-val is-static">' + fmtN(units) + "</span>" +
          '<button type="button" class="qty-btn" data-act="sup-plus" data-sup="' + esc(s.id) +
            '" aria-label="Augmenter">+</button>' +
        "</div>" +
      "</li>";
    }
    html += "</ul>";
  }

  // ---- ajout libre
  if (log.libre && log.libre.length) {
    html += '<h3 class="group-title">Ajouts libres</h3><ul class="nut-foods">';
    log.libre.forEach(function (l, idx) {
      html += '<li class="nut-food has-qty">' +
        '<div class="nut-food-main">' +
          '<span class="nut-food-label">' + esc(l.label) + "</span>" +
          '<span class="nut-food-detail">' + fmtN(l.kcal) + " kcal · " + fmtN(l.prot) + " P · " +
            fmtN(l.glu || 0) + " G · " + fmtN(l.lip || 0) + " L</span>" +
        "</div>" +
        '<button type="button" class="nut-del" data-act="nut-del" data-idx="' + idx + '" aria-label="Supprimer">✕</button>' +
      "</li>";
    });
    html += "</ul>";
  }
  html += '<button type="button" class="btn btn-block btn-ghost" data-act="add-libre">+ Ajout libre (kcal / macros)</button>';

  // ---- micronutriments
  html += gapsBanner();
  html += '<div class="block-head"><h2>Jour — minéraux & vitamines</h2></div><div class="nuts">';
  for (const n of nuts) {
    if (n.main || n.period !== "day") continue;
    html += bar(n, day[n.key]);
  }
  html += "</div>";

  const logged = loggedDayKeys(weekDayKeys()).length;
  const dr = dietRate(weekDayKeys());
  html += '<a class="callout" href="#/objectifs"><strong>' +
    (dr === null ? "Aucune journée saisie cette semaine"
      : Math.round(dr * 100) + " % de cibles tenues sur " + logged + " jour" + (logged > 1 ? "s" : "")) +
    "</strong><span>Voir la réussite →</span></a>";

  html += '<p class="hint nut-disclaimer">Valeurs pour 100 g / 100 ml, moyennes arrondies ' +
    "(CIQUAL / USDA). L'outil suit des tendances — il ne remplace ni une pesée ni un avis médical.</p>";

  html += "</div>";
  return html;
}

// ------------------------------------------------- recherche d'aliments

let searchState = { q: "", cat: "all" };

export function openFoodSearch() {
  openSheet("Chercher un aliment", function (body, close) {
    function render() {
      const results = searchFoods(searchState.q, searchState.cat);
      body.innerHTML =
        '<input type="search" id="fs-q" class="input input-lg" placeholder="Nom de l\'aliment…" ' +
          'value="' + esc(searchState.q) + '" autocomplete="off">' +
        '<select id="fs-cat" class="input">' +
          '<option value="all"' + (searchState.cat === "all" ? " selected" : "") + ">Toutes les catégories</option>" +
          FOOD_CATS.map(function (c) {
            return '<option value="' + c.key + '"' + (searchState.cat === c.key ? " selected" : "") + ">" +
              esc(c.icon + " " + c.label) + "</option>";
          }).join("") +
        "</select>" +
        '<p class="sub result-count">' + results.length +
          (results.length > 1 ? " aliments" : " aliment") + "</p>" +
        (results.length
          ? '<ul class="food-results">' + results.map(function (f) {
              return '<li class="food-row" data-act="pick-food" data-food="' + esc(f.id) + '" role="button" tabindex="0">' +
                '<span class="food-row-main">' +
                  '<span class="food-row-label">' + esc(f.label) +
                    (f.custom ? ' <span class="badge badge-quiet">perso</span>' : "") + "</span>" +
                  '<span class="food-row-detail">' + fmtN(f.n.kcal || 0) + " kcal · " +
                    fmtN(f.n.prot || 0) + " P · " + fmtN(f.n.glu || 0) + " G · " +
                    fmtN(f.n.lip || 0) + " L / " + f.base + " " + esc(unitOf(f) || "pièce") + "</span>" +
                "</span>" +
                '<span class="food-row-add" aria-hidden="true">+</span>' +
              "</li>";
            }).join("") + "</ul>"
          : '<p class="empty">Aucun aliment trouvé.</p>') +
        '<button type="button" class="btn btn-block btn-ghost" data-act="new-food">+ Créer un aliment</button>' +
        '<button type="button" class="btn btn-block btn-ghost" data-act="my-foods">🍽️ Mes aliments' +
          (function () { const k = foodsNeedingMicros().length; return k ? " · " + k + " à compléter" : ""; })() +
        "</button>";

      const q = body.querySelector("#fs-q");
      let timer = null;
      q.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          searchState.q = q.value;
          const caret = q.selectionStart;
          render();
          const nq = body.querySelector("#fs-q");
          nq.focus();
          nq.setSelectionRange(caret, caret);
        }, 200);
      });
      body.querySelector("#fs-cat").addEventListener("change", function (e) {
        searchState.cat = e.target.value;
        render();
      });
      body.querySelector('[data-act="new-food"]').addEventListener("click", function () {
        close();
        openNewFood();
      });
      body.querySelector('[data-act="my-foods"]').addEventListener("click", function () {
        close();
        openMyFoods();
      });
      body.querySelectorAll('[data-act="pick-food"]').forEach(function (row) {
        row.addEventListener("click", function () {
          close();
          openQuantity(row.dataset.food);
        });
      });
    }
    render();
  });
}

// Saisie de la quantité, dans l'unité de l'aliment.
export function openQuantity(foodId) {
  const f = foodById(foodId);
  if (!f) return;
  const current = (logFor().items || {})[foodId] || 0;
  const unit = unitOf(f) || "pièce";

  openSheet(f.label, function (body, close) {
    const quick = f.unit === "ml" ? [50, 100, 250, 500]
      : f.unit === "g" ? [10, 50, 100, 200]
      : [1, 2, 3, 5];

    body.innerHTML =
      '<label class="field"><span>Quantité en ' + esc(unit) + "</span>" +
        '<input type="number" id="q-input" class="input input-lg" inputmode="decimal" min="0" ' +
          'step="' + (f.unit === "u" || f.unit === "portion" ? 1 : 1) + '" value="' + (current || f.step) + '"></label>' +
      '<div class="chips">' + quick.map(function (v) {
        return '<button type="button" class="chip" data-add="' + v + '">+' + v + " " + esc(unit) + "</button>";
      }).join("") + "</div>" +
      '<div id="q-preview" class="q-preview"></div>' +
      '<div class="sheet-actions">' +
        (current ? '<button type="button" class="btn btn-danger-ghost" data-act="q-remove">Retirer</button>' : "") +
        '<button type="button" class="btn btn-primary" data-act="q-save">' +
          (current ? "Mettre à jour" : "Ajouter") + "</button>" +
      "</div>";

    const input = body.querySelector("#q-input");
    const prev = body.querySelector("#q-preview");
    const nmap = nutrientMap();

    function refresh() {
      const p = preview(f, input.value);
      prev.innerHTML =
        '<div class="q-macros">' +
          '<span><strong>' + fmtN(p.kcal || 0) + "</strong> kcal</span>" +
          "<span><strong>" + fmtN(p.prot || 0) + "</strong> g P</span>" +
          "<span><strong>" + fmtN(p.glu || 0) + "</strong> g G</span>" +
          "<span><strong>" + fmtN(p.lip || 0) + "</strong> g L</span>" +
        "</div>" +
        (function () {
          const micros = Object.keys(p).filter((k) => nmap[k] && !nmap[k].main && p[k] >= 0.5);
          if (!micros.length) return "";
          return '<p class="q-micros">' + micros.map(function (k) {
            return esc(nmap[k].label) + " " + fmtN(p[k]) + " " + esc(nmap[k].unit);
          }).join(" · ") + "</p>";
        })();
    }

    input.addEventListener("input", refresh);
    body.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = (parseFloat(input.value) || 0) + parseFloat(b.dataset.add);
        refresh();
      });
    });
    body.querySelector('[data-act="q-save"]').addEventListener("click", function () {
      setQuantity(foodId, input.value);
      close();
      toast(f.label + " · " + fmtN(input.value) + " " + unit);
    });
    const rm = body.querySelector('[data-act="q-remove"]');
    if (rm) rm.addEventListener("click", function () { setQuantity(foodId, 0); close(); });

    refresh();
    input.focus();
    input.select();
  });
}

// ----------------------------------------- mes aliments / complétion micros

// Un aliment saisi sans vitamines ni minéraux laisse un trou silencieux :
// ses micros comptent zéro dans les totaux. Cet écran rend le trou visible
// et fabrique la demande à coller dans une conversation avec Claude.
export function openMyFoods() {
  openSheet("Mes aliments", function (body, close) {
    const perso = allFoods().filter((f) => f.custom);
    const incomplets = foodsNeedingMicros();

    body.innerHTML =
      (incomplets.length
        ? '<p class="callout callout-static"><strong>' + incomplets.length +
          " aliment" + (incomplets.length > 1 ? "s n'ont" : " n'a") +
          " aucune vitamine ni minéral renseigné.</strong> Leurs micros comptent " +
          "pour zéro dans tes totaux — ce qui les sous-estime.</p>" +
          '<button type="button" class="btn btn-block btn-primary" data-act="ask-claude">' +
          "📋 Copier la demande pour Claude</button>" +
          '<p class="hint">Colle-la dans une conversation, puis rapporte ma réponse ' +
          "dans <strong>Diète → Importer</strong>. Les valeurs se rangeront toutes seules.</p>"
        : '<p class="callout callout-static">Tous tes aliments ont au moins un micronutriment renseigné.</p>') +

      (perso.length
        ? '<h3 class="group-title">Aliments créés (' + perso.length + ")</h3>" +
          '<ul class="sup-list">' + perso.map(function (f) {
            const c = microCompleteness(f);
            return '<li class="sup-row">' +
              '<div class="sup-main">' +
                '<span class="sup-label">' + esc(f.label) + "</span>" +
                '<span class="sup-detail">' + fmtN(f.n.kcal || 0) + " kcal · " +
                  fmtN(f.n.prot || 0) + " P · " + fmtN(f.n.glu || 0) + " G · " +
                  fmtN(f.n.lip || 0) + " L / " + f.base + " " + esc(unitOf(f) || "pièce") +
                  ' — <span class="' + (c.known ? "micro-ok" : "micro-hole") + '">' +
                  c.known + "/" + c.total + " micros</span></span>" +
              "</div>" +
              '<button type="button" class="nut-del" data-act="cf-remove" data-food="' + esc(f.id) +
                '" aria-label="Supprimer">✕</button>' +
            "</li>";
          }).join("") + "</ul>"
        : '<p class="empty">Aucun aliment créé pour l\'instant.</p>');

    const ask = body.querySelector('[data-act="ask-claude"]');
    if (ask) {
      ask.addEventListener("click", function () {
        const req = buildCompletionRequest();
        if (!req) { toast("Rien à compléter"); return; }
        navigator.clipboard.writeText(req)
          .then(() => toast("Demande copiée — colle-la à Claude"))
          .catch(() => toast("Copie impossible", "error"));
      });
    }

    body.querySelectorAll('[data-act="cf-remove"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        const f = foodById(btn.dataset.food);
        close();
        confirmSheet("Supprimer ?", "« " + (f ? f.label : "") + " » sera retiré du catalogue.",
          "Supprimer", function () { removeCustomFood(btn.dataset.food); toast("Supprimé"); });
      });
    });
  });
}

// ------------------------------------------------------- créer un aliment

export function openNewFood() {
  openSheet("Créer un aliment", function (body, close) {
    body.innerHTML =
      '<label class="field"><span>Nom</span>' +
        '<input type="text" id="nf-label" class="input" maxlength="80" placeholder="Ex : Galette de riz"></label>' +
      '<label class="field"><span>Catégorie</span><select id="nf-cat" class="input">' +
        FOOD_CATS.map((c) => '<option value="' + c.key + '">' + esc(c.icon + " " + c.label) + "</option>").join("") +
      "</select></label>" +
      '<label class="field"><span>Unité</span><select id="nf-unit" class="input">' +
        '<option value="g">Grammes — valeurs pour 100 g</option>' +
        '<option value="ml">Millilitres — valeurs pour 100 ml</option>' +
        '<option value="u">À l\'unité — valeurs pour 1 pièce</option>' +
      "</select></label>" +
      '<p class="hint">Renseigne au moins les calories et les macros. ' +
        "Les vitamines et minéraux sont facultatifs : laisse vide ce que tu ne sais pas.</p>" +
      '<div class="nf-grid">' +
        ["kcal", "prot", "glu", "lip"].map(function (k) {
          const lbl = { kcal: "kcal", prot: "P (g)", glu: "G (g)", lip: "L (g)" }[k];
          return '<input type="number" inputmode="decimal" id="nf-' + k + '" placeholder="' + lbl + '" step="0.1" min="0">';
        }).join("") +
      "</div>" +
      '<details class="fold nf-micros"><summary class="fold-head">' +
        '<span class="fold-caret" aria-hidden="true">›</span><h2>Vitamines & minéraux</h2></summary>' +
        '<div class="fold-body"><div class="nf-grid">' +
          nutrients().filter((n) => !n.main).map(function (n) {
            return '<input type="number" inputmode="decimal" id="nf-' + n.key +
              '" placeholder="' + esc(n.label + " (" + n.unit + ")") + '" step="0.1" min="0">';
          }).join("") +
        "</div></div></details>" +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="nf-cancel">Annuler</button>' +
        '<button type="button" class="btn btn-primary" data-act="nf-save">Créer</button>' +
      "</div>";

    body.querySelector('[data-act="nf-cancel"]').addEventListener("click", close);
    body.querySelector('[data-act="nf-save"]').addEventListener("click", function () {
      const label = body.querySelector("#nf-label").value.trim();
      if (!label) { body.querySelector("#nf-label").focus(); return; }
      const n = {};
      for (const nn of nutrients()) {
        const el = body.querySelector("#nf-" + nn.key);
        if (el && el.value !== "") n[nn.key] = el.value;
      }
      const created = addCustomFood({
        label: label,
        cat: body.querySelector("#nf-cat").value,
        unit: body.querySelector("#nf-unit").value,
        n: n
      });
      close();
      if (!created) return;
      // Prévenir tout de suite plutôt que de laisser un trou silencieux.
      if (microCompleteness(created).known === 0) {
        openSheet("Vitamines et minéraux manquants", function (b2, close2) {
          b2.innerHTML =
            '<p class="sheet-text">« ' + esc(label) + " » n'a aucun micronutriment renseigné : " +
            "ses vitamines et minéraux compteront pour zéro dans tes totaux.</p>" +
            '<p class="hint">Je peux te donner les valeurs : copie la demande, colle-la dans ' +
            "une conversation, puis rapporte ma réponse dans l'écran Importer.</p>" +
            '<div class="sheet-actions">' +
              '<button type="button" class="btn btn-ghost" data-act="skip">Plus tard</button>' +
              '<button type="button" class="btn btn-primary" data-act="copy">📋 Copier la demande</button>' +
            "</div>";
          b2.querySelector('[data-act="skip"]').addEventListener("click", function () {
            close2(); openQuantity(created.id);
          });
          b2.querySelector('[data-act="copy"]').addEventListener("click", function () {
            navigator.clipboard.writeText(buildCompletionRequest([foodById(created.id)]) || "")
              .then(() => toast("Demande copiée — colle-la à Claude"))
              .catch(() => toast("Copie impossible", "error"));
            close2();
            openQuantity(created.id);
          });
        });
        return;
      }
      toast(label + " créé");
      openQuantity(created.id);
    });
    body.querySelector("#nf-label").focus();
  });
}

// ------------------------------------------------------------- cibles

export function openTargets() {
  openSheet("Mes cibles", function (body, close) {
    const t = targets();
    body.innerHTML =
      '<p class="hint">Fixe tes macros : les calories en découlent (4 kcal par gramme ' +
        "de protéines et de glucides, 9 pour les lipides) et s'affichent en fourchette.</p>" +
      '<label class="field"><span>Protéines (g)</span>' +
        '<input type="number" id="t-prot" class="input input-lg" inputmode="numeric" min="0" max="500" value="' + t.prot + '"></label>' +
      '<label class="field"><span>Glucides (g)</span>' +
        '<input type="number" id="t-glu" class="input input-lg" inputmode="numeric" min="0" max="900" value="' + t.glu + '"></label>' +
      '<label class="field"><span>Lipides (g)</span>' +
        '<input type="number" id="t-lip" class="input input-lg" inputmode="numeric" min="0" max="400" value="' + t.lip + '"></label>' +
      '<label class="field"><span>Tolérance autour de la cible</span><select id="t-tol" class="input">' +
        [["0.05", "± 5 %"], ["0.08", "± 8 %"], ["0.1", "± 10 %"], ["0.15", "± 15 %"]].map(function (o) {
          return '<option value="' + o[0] + '"' + (Math.abs(t.tolerance - parseFloat(o[0])) < 0.001 ? " selected" : "") +
            ">" + o[1] + "</option>";
        }).join("") +
      "</select></label>" +
      '<div id="t-preview" class="t-preview"></div>' +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="t-reset">Valeurs par défaut</button>' +
        '<button type="button" class="btn btn-primary" data-act="t-save">Enregistrer</button>' +
      "</div>";

    const get = (id) => parseFloat(body.querySelector(id).value) || 0;
    const prev = body.querySelector("#t-preview");

    function refresh() {
      const kcal = get("#t-prot") * 4 + get("#t-glu") * 4 + get("#t-lip") * 9;
      const tol = parseFloat(body.querySelector("#t-tol").value);
      prev.innerHTML = '<span class="t-preview-label">Total calorique</span>' +
        '<span class="t-preview-val">' + Math.round(kcal * (1 - tol)).toLocaleString("fr-FR") +
        " – " + Math.round(kcal * (1 + tol)).toLocaleString("fr-FR") + " kcal</span>";
    }

    body.querySelectorAll("#t-prot, #t-glu, #t-lip, #t-tol").forEach(function (el) {
      el.addEventListener("input", refresh);
      el.addEventListener("change", refresh);
    });

    body.querySelector('[data-act="t-save"]').addEventListener("click", function () {
      setTarget("prot", get("#t-prot"));
      setTarget("glu", get("#t-glu"));
      setTarget("lip", get("#t-lip"));
      setTarget("tolerance", body.querySelector("#t-tol").value);
      close();
      toast("Cibles mises à jour");
    });
    body.querySelector('[data-act="t-reset"]').addEventListener("click", function () {
      setTarget("prot", 190); setTarget("glu", 335); setTarget("lip", 100); setTarget("tolerance", 0.08);
      close();
      toast("Cibles remises par défaut");
    });

    refresh();
  });
}

// -------------------------------------------------- calibrer compléments

export function openSupplements() {
  openSheet("Calibrer les compléments", function (body, close) {
    function render() {
      const sups = supplements();
      body.innerHTML =
        '<p class="hint">Indique ce qu\'apporte <strong>une</strong> gélule ou dose. ' +
          "L'app multiplie par la quantité prise : 400 mg × 2 = 800 mg.</p>" +
        (sups.length
          ? '<ul class="sup-list">' + sups.map(function (s) {
              const nmap = nutrientMap();
              const apport = Object.entries(s.n).map(function ([k, v]) {
                return fmtN(v) + " " + (nmap[k] ? nmap[k].unit + " " + nmap[k].label.toLowerCase() : k);
              }).join(" · ");
              return '<li class="sup-row">' +
                '<div class="sup-main" data-act="sup-edit" data-sup="' + esc(s.id) + '" role="button" tabindex="0">' +
                  '<span class="sup-label">' + esc(s.label) + "</span>" +
                  '<span class="sup-detail">' + (apport ? esc(apport) : "aucun apport chiffré") +
                    " / " + esc(s.unit) + "</span>" +
                "</div>" +
                '<button type="button" class="nut-del" data-act="sup-remove" data-sup="' + esc(s.id) +
                  '" aria-label="Supprimer">✕</button>' +
              "</li>";
            }).join("") + "</ul>"
          : '<p class="empty">Aucun complément.</p>') +
        '<button type="button" class="btn btn-block btn-primary" data-act="sup-new">+ Nouveau complément</button>';

      body.querySelectorAll('[data-act="sup-edit"]').forEach(function (row) {
        row.addEventListener("click", function () { close(); openSupplementEditor(row.dataset.sup); });
      });
      body.querySelectorAll('[data-act="sup-remove"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          const s = supplements().find((x) => x.id === btn.dataset.sup);
          close();
          confirmSheet("Supprimer ?", "« " + (s ? s.label : "") + " » sera retiré, ainsi que ses prises enregistrées.",
            "Supprimer", function () { removeSupplement(btn.dataset.sup); toast("Supprimé"); });
        });
      });
      body.querySelector('[data-act="sup-new"]').addEventListener("click", function () {
        close();
        openSupplementEditor(null);
      });
    }
    render();
  });
}

export function openSupplementEditor(id) {
  const existing = id ? supplements().find((s) => s.id === id) : null;
  openSheet(existing ? existing.label : "Nouveau complément", function (body, close) {
    const n = existing ? existing.n : {};
    body.innerHTML =
      '<label class="field"><span>Nom</span>' +
        '<input type="text" id="se-label" class="input" maxlength="80" placeholder="Ex : Magnésium bisglycinate" ' +
          'value="' + esc(existing ? existing.label : "") + '"></label>' +
      '<label class="field"><span>Unité de prise</span>' +
        '<input type="text" id="se-unit" class="input" maxlength="20" placeholder="gélule, dose, goutte…" ' +
          'value="' + esc(existing ? existing.unit : "gélule") + '"></label>' +
      '<p class="hint">Apport par unité. Laisse vide ce que le produit n\'apporte pas.</p>' +
      '<div class="nf-grid">' +
        nutrients().map(function (nn) {
          return '<input type="number" inputmode="decimal" id="se-' + nn.key +
            '" placeholder="' + esc(nn.label + " (" + nn.unit + ")") + '" step="0.1" min="0" value="' +
            (n[nn.key] !== undefined ? n[nn.key] : "") + '">';
        }).join("") +
      "</div>" +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="se-cancel">Annuler</button>' +
        '<button type="button" class="btn btn-primary" data-act="se-save">Enregistrer</button>' +
      "</div>";

    body.querySelector('[data-act="se-cancel"]').addEventListener("click", close);
    body.querySelector('[data-act="se-save"]').addEventListener("click", function () {
      const label = body.querySelector("#se-label").value.trim();
      if (!label) { body.querySelector("#se-label").focus(); return; }
      const vals = {};
      for (const nn of nutrients()) {
        const el = body.querySelector("#se-" + nn.key);
        if (el && el.value !== "") vals[nn.key] = el.value;
      }
      upsertSupplement({ id: existing ? existing.id : null, label: label, unit: body.querySelector("#se-unit").value, n: vals });
      close();
      toast("Complément enregistré");
    });
    body.querySelector("#se-label").focus();
  });
}

// ---------------------------------------------------------- ajout libre

export function openLibre() {
  openSheet("Ajout libre", function (body, close) {
    body.innerHTML =
      '<p class="hint">Pour un plat dont tu connais seulement les calories et les macros.</p>' +
      '<label class="field"><span>Nom</span>' +
        '<input type="text" id="lb-label" class="input" maxlength="60" placeholder="Ex : Restaurant, kebab"></label>' +
      '<div class="nf-grid">' +
        '<input type="number" id="lb-kcal" inputmode="numeric" placeholder="kcal" min="0">' +
        '<input type="number" id="lb-prot" inputmode="decimal" placeholder="P (g)" step="0.5" min="0">' +
        '<input type="number" id="lb-glu" inputmode="decimal" placeholder="G (g)" step="0.5" min="0">' +
        '<input type="number" id="lb-lip" inputmode="decimal" placeholder="L (g)" step="0.5" min="0">' +
      "</div>" +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="lb-cancel">Annuler</button>' +
        '<button type="button" class="btn btn-primary" data-act="lb-save">Ajouter</button>' +
      "</div>";

    body.querySelector('[data-act="lb-cancel"]').addEventListener("click", close);
    body.querySelector('[data-act="lb-save"]').addEventListener("click", function () {
      const v = (id) => body.querySelector(id).value;
      if (addLibre(v("#lb-label"), v("#lb-kcal"), v("#lb-prot"), v("#lb-glu"), v("#lb-lip")) === false) {
        body.querySelector("#lb-label").focus();
        return;
      }
      close();
      toast("Ajouté");
    });
    body.querySelector("#lb-label").focus();
  });
}

// ------------------------------------------------------------- montage

export function mountNutrition() { /* tout passe par la délégation dans app.js */ }
