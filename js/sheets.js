// Feuilles d'action : ajout rapide (le « + ») et fiche d'un item.

import { esc, escLines, openSheet, toast, confirmSheet } from "./ui.js";
import { SECTIONS, SECTION_MAP, IMPORT_TAGS } from "./seed.js";
import {
  byId, addItem, updateItem, removeItem,
  isRecurring, weekProgress, rootBlocker, dependentCount
} from "./state.js";

// Destinations proposées à l'ajout rapide, dans l'ordre d'usage.
export const DESTINATIONS = (function () {
  const out = [{ section: "inbox", sub: null, label: "Boîte de réception", icon: "📥" }];
  for (const s of SECTIONS) {
    if (s.key === "inbox") continue;
    if (s.subs.length) {
      for (const sub of s.subs) {
        out.push({ section: s.key, sub: sub.key, label: s.short + " · " + sub.label, icon: s.icon });
      }
    } else {
      out.push({ section: s.key, sub: null, label: s.label, icon: s.icon });
    }
  }
  return out;
})();

function destKey(d) { return d.section + "/" + (d.sub || ""); }

// ------------------------------------------------------------ ajout rapide

// La fonctionnalité la plus importante de l'app : elle doit tenir en 5 secondes.
// Ouverture -> champ déjà actif -> une frappe -> Enregistrer. Destination par
// défaut : la boîte de réception, pour ne jamais forcer un rangement.
export function openQuickAdd(prefill) {
  openSheet("Ajouter", function (body, close) {
    let selected = "inbox/";

    body.innerHTML =
      '<textarea id="qa-text" class="qa-text" rows="3" placeholder="Qu\'est-ce que tu notes ?" ' +
        'autocomplete="off" autocapitalize="sentences">' + esc(prefill || "") + "</textarea>" +
      '<p class="qa-hint">Destination — par défaut, la boîte de réception.</p>' +
      '<div class="chips" id="qa-chips">' +
        DESTINATIONS.map(function (d) {
          return '<button type="button" class="chip' + (destKey(d) === selected ? " is-active" : "") +
            '" data-dest="' + esc(destKey(d)) + '">' + d.icon + " " + esc(d.label) + "</button>";
        }).join("") +
      "</div>" +
      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="cancel">Annuler</button>' +
        '<button type="button" class="btn btn-primary" data-act="save">Enregistrer</button>' +
      "</div>";

    const text = body.querySelector("#qa-text");
    const chips = body.querySelector("#qa-chips");

    function select(key) {
      selected = key;
      chips.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c.dataset.dest === key);
      });
    }

    chips.addEventListener("click", function (e) {
      const chip = e.target.closest(".chip");
      if (chip) select(chip.dataset.dest);
    });

    // Un tag collé en tête de ligne choisit la destination tout seul.
    text.addEventListener("input", function () {
      const m = text.value.match(/^\s*\[([^\]]{1,40})\]/);
      if (!m) return;
      const dest = IMPORT_TAGS[m[1].trim().toLowerCase()];
      if (dest) select(dest.section + "/" + (dest.sub || ""));
    });

    function commit() {
      let value = text.value.trim();
      if (!value) { text.focus(); return; }
      value = value.replace(/^\s*\[[^\]]{1,40}\]\s*/, "");
      const [section, sub] = selected.split("/");
      const lines = value.split(/\r?\n/);
      const first = lines[0];
      const tooLong = first.length > 200;
      addItem({
        section: section,
        sub: sub || null,
        // Une première ligne trop longue est abrégée en titre mais conservée
        // intégralement en détail — rien ne se perd (spec §2.4).
        title: tooLong ? first.slice(0, 197) + "…" : first,
        detail: tooLong ? value : lines.slice(1).join("\n").trim(),
        source: "manual"
      });
      close();
      const label = SECTION_MAP[section].label;
      toast("Ajouté dans " + label);
    }

    body.querySelector('[data-act="save"]').addEventListener("click", commit);
    body.querySelector('[data-act="cancel"]').addEventListener("click", close);

    // Entrée valide, Maj+Entrée fait un retour à la ligne.
    text.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
    });

    text.focus();
    text.setSelectionRange(text.value.length, text.value.length);
  });
}

// ---------------------------------------------------------- fiche d'item

const STATUSES = [
  { key: "todo", label: "À faire" },
  { key: "doing", label: "En cours" },
  { key: "blocked", label: "Bloqué" },
  { key: "done", label: "Fait" },
  { key: "optional", label: "Optionnel" },
  { key: "queue", label: "File d'attente" },
  { key: "rejected", label: "Écarté" }
];

export function openItem(id) {
  const item = byId(id);
  if (!item) return;

  openSheet(item.title, function (body, close) {
    const blocker = rootBlocker(item);
    const deps = dependentCount(item.id);
    const prog = isRecurring(item) ? weekProgress(item) : null;

    body.innerHTML =
      (item.warn ? '<p class="sheet-warn">⚠️ ' + escLines(item.warn) + "</p>" : "") +
      (blocker
        ? '<p class="sheet-blocked">🔒 Bloqué par <button type="button" class="linkish" data-act="goto" data-target="' +
          esc(blocker.id) + '">' + esc(blocker.title) + "</button></p>"
        : "") +
      (deps ? '<p class="sheet-deps">' + deps + (deps > 1 ? " éléments dépendent" : " élément dépend") + " de cet item.</p>" : "") +
      (prog ? '<p class="sheet-prog">' + prog.done + " sur " + prog.target + " cette semaine</p>" : "") +

      '<label class="field"><span>Intitulé</span>' +
        '<input id="it-title" class="input" type="text" value="' + esc(item.title) + '"></label>' +
      '<label class="field"><span>Détail</span>' +
        '<textarea id="it-detail" class="input" rows="4">' + esc(item.detail) + "</textarea></label>" +

      (isRecurring(item) ? "" :
        '<div class="field"><span>État</span><div class="chips" id="it-status">' +
          STATUSES.map(function (s) {
            return '<button type="button" class="chip' + (item.status === s.key ? " is-active" : "") +
              '" data-status="' + s.key + '">' + esc(s.label) + "</button>";
          }).join("") +
        "</div></div>") +

      '<label class="field"><span>Rubrique</span>' +
        '<select id="it-dest" class="input">' +
          DESTINATIONS.map(function (d) {
            const key = destKey(d);
            const cur = item.section + "/" + (item.sub || "");
            return '<option value="' + esc(key) + '"' + (key === cur ? " selected" : "") + ">" +
              esc(d.icon + " " + d.label) + "</option>";
          }).join("") +
        "</select></label>" +

      '<p class="sheet-meta">' + metaLine(item) + "</p>" +

      '<div class="sheet-actions">' +
        '<button type="button" class="btn btn-danger-ghost" data-act="delete">Supprimer</button>' +
        '<button type="button" class="btn btn-primary" data-act="save">Enregistrer</button>' +
      "</div>";

    const statusBox = body.querySelector("#it-status");
    if (statusBox) {
      statusBox.addEventListener("click", function (e) {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        statusBox.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
      });
    }

    const gotoBtn = body.querySelector('[data-act="goto"]');
    if (gotoBtn) {
      gotoBtn.addEventListener("click", function () {
        close();
        openItem(gotoBtn.dataset.target);
      });
    }

    body.querySelector('[data-act="save"]').addEventListener("click", function () {
      const dest = body.querySelector("#it-dest").value.split("/");
      const fields = {
        title: body.querySelector("#it-title").value.trim() || item.title,
        detail: body.querySelector("#it-detail").value.trim(),
        section: dest[0],
        sub: dest[1] || null
      };
      const active = statusBox && statusBox.querySelector(".chip.is-active");
      if (active) {
        fields.status = active.dataset.status;
        fields.doneAt = active.dataset.status === "done" ? Date.now() : null;
      }
      updateItem(item.id, fields);
      close();
      toast("Enregistré");
    });

    body.querySelector('[data-act="delete"]').addEventListener("click", function () {
      close();
      confirmSheet(
        "Supprimer ?",
        "« " + item.title + " » sera retiré définitivement.",
        "Supprimer",
        function () { removeItem(item.id); toast("Supprimé"); }
      );
    });
  });
}

function metaLine(item) {
  const bits = [];
  if (item.source === "seed") bits.push("Contenu de départ");
  else if (item.source === "manual") bits.push("Saisie manuelle");
  else bits.push("Importé depuis Claude (" + esc(item.source) + ")");
  if (item.createdAt) bits.push("ajouté le " + new Date(item.createdAt).toLocaleDateString("fr-FR"));
  if (item.doneAt) bits.push("fait le " + new Date(item.doneAt).toLocaleDateString("fr-FR"));
  return bits.join(" · ");
}
