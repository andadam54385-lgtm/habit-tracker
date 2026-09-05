// Compte rendu à copier dans Claude : tout ce qu'il faut pour conseiller,
// rien de plus. Les photos n'y sont jamais — elles restent sur l'appareil.

import { state, dayKey, weekDayKeys } from "./state.js";
import { SECTION_MAP } from "./seed.js";
import {
  weekStartAt, weekDates, monthDates, computeTotalRate, computeRate,
  sectionRates, trackedItems, frequencyOf, formatPercent
} from "./objectives.js";
import { averageOf, journalFor, topStreaks, checkinStreak } from "./forme.js";
import { loadStatus, muscleVolume, sessionLoad } from "./charge.js";
import { workouts, weeklySummary, exercisesPracticed, fmtDuration, exerciseById } from "./sport.js";
import { BODY_FIELDS, trendFor, composition, lastEntry, daysSince } from "./corps.js";
import { nutrients, dayTotals, weekTotals, weekAverages, isMet, topGaps, loggedDayKeys, fmtRange } from "./nutrition.js";

export const PERIODS = [7, 14, 30];

function lastKeys(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

function lastDates(days) {
  return lastKeys(days).map((k) => new Date(k + "T12:00:00"));
}

function num(v, dec) {
  const p = Math.pow(10, dec === undefined ? 1 : dec);
  return Math.round(v * p) / p;
}

function arrow(delta) {
  if (delta === null || delta === 0) return "=";
  return delta > 0 ? "+" + delta : String(delta);
}

/**
 * Le compte rendu, en Markdown. `days` : 7, 14 ou 30.
 * Structure pensée pour la lecture par Claude : des chiffres, leurs
 * périodes, et ce qui manque explicitement marqué comme manquant.
 */
export function rapportMarkdown(days) {
  const n = PERIODS.indexOf(+days) >= 0 ? +days : 14;
  const keys = lastKeys(n);
  const dates = lastDates(n);
  const out = [];
  const today = new Date();

  out.push("# Compte rendu de suivi — " + n + " derniers jours");
  out.push("");
  out.push("_Généré le " + today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " par mon app de suivi. Période couverte : " + keys[0] + " → " + keys[keys.length - 1] + "._");
  out.push("");

  // ---- corps
  out.push("## Corps");
  const comp = composition();
  if (!comp) {
    out.push("- Aucune pesée enregistrée.");
  } else {
    out.push("- Dernière pesée : **" + comp.poids + " kg** (" + comp.date + ")");
    if (comp.gras) out.push("- Masse grasse : " + comp.gras.pct + " % ≈ " + comp.gras.kg + " kg (mesuré le " + comp.gras.date + ")");
    if (comp.muscle) out.push("- Masse musculaire : " + comp.muscle.pct + " % ≈ " + comp.muscle.kg + " kg (mesuré le " + comp.muscle.date + ")");
    for (const f of BODY_FIELDS) {
      for (const w of [7, 14]) {
        const t = trendFor(f.key, w);
        if (t.current === null) continue;
        out.push("- " + f.label + ", moyenne " + w + " j : **" + t.current + " " + f.unit + "** sur " + t.n + " mesure" + (t.n > 1 ? "s" : "") +
          (t.previous !== null ? " · " + w + " j précédents : " + t.previous + " " + f.unit + " (" + arrow(t.delta) + " " + f.unit + ")" : " · pas de période précédente pour comparer"));
      }
    }
    const sinceP = daysSince("poids"), sinceG = daysSince("gras");
    if (sinceP !== null && sinceP > 3) out.push("- ⚠️ Pas de pesée depuis " + sinceP + " jours.");
    if (sinceG !== null && sinceG > 21) out.push("- ⚠️ Composition (gras/muscle) pas mesurée depuis " + sinceG + " jours — elle se prend à la salle.");
    if (sinceG === null) out.push("- Composition jamais mesurée (balance à impédance de la salle).");
  }
  out.push("");

  // ---- forme et sommeil
  out.push("## Forme, sommeil, moral");
  const forme = averageOf("forme", keys), sommeil = averageOf("sommeil", keys);
  const journee = averageOf("journee", keys), fc = averageOf("fc", keys), hrv = averageOf("hrv", keys);
  out.push("- Forme du matin (auto-évaluation /10) : " + (forme === null ? "non renseignée" : "**" + forme + "**"));
  out.push("- Sommeil : " + (sommeil === null ? "non renseigné" : sommeil + " h en moyenne"));
  out.push("- Journée notée le soir (/10) : " + (journee === null ? "non renseignée" : journee));
  if (fc !== null) out.push("- FC de repos : " + fc + " bpm");
  if (hrv !== null) out.push("- HRV : " + hrv + " ms");
  const ck = checkinStreak();
  out.push("- Check-ins du matin : " + ck.current + " jours d'affilée (record " + ck.best + ")");
  out.push("");

  // ---- entraînement
  out.push("## Entraînement");
  const ws = workouts().filter((w) => keys.indexOf(w.date) >= 0);
  const byType = (t) => ws.filter((w) => w.type === t).length;
  out.push("- Séances sur " + n + " jours : **" + ws.length + "** (" + byType("muscu") + " muscu, " + byType("circuit") + " circuit, " +
    byType("course") + " course, " + byType("mobilite") + " mobilité)");
  out.push("- Volume horaire : " + Math.round(ws.reduce((a, w) => a + (w.duration || 0), 0) / 60) + " min · charge cumulée (RPE × min) : " +
    ws.reduce((a, w) => a + sessionLoad(w), 0));
  const ls = loadStatus();
  if (ls.mean) {
    out.push("- Charge de la semaine en cours : " + ls.current + " contre " + ls.mean + " en moyenne sur les 4 semaines précédentes (" +
      (ls.ratio >= 1 ? "+" : "") + Math.round((ls.ratio - 1) * 100) + " %)" + (ls.level === "high" ? " — **au-dessus du seuil de 130 %**" : ""));
  } else {
    out.push("- Charge : pas encore assez d'historique pour comparer.");
  }
  const vol = muscleVolume();
  if (vol.length) {
    out.push("- Volume de la semaine par groupe : " + vol.map((v) => v.label + " " + v.sets + " séries" + (v.tonnage ? " / " + v.tonnage + " kg" : "")).join(" · "));
  }
  const prog = exercisesPracticed().filter((p) => p.last && p.last.best).slice(0, 8);
  if (prog.length) {
    out.push("- Progression (1RM estimé, dernier vs record) : " + prog.map(function (p) {
      const rm = p.last.best.rm;
      return p.ex.label + " " + rm + (p.delta !== null && p.delta !== 0 ? " (" + arrow(num(p.delta)) + ")" : "");
    }).join(" · "));
  }
  const rpes = ws.map((w) => w.rpe).filter(Boolean);
  if (rpes.length) out.push("- RPE moyen des séances : " + num(rpes.reduce((a, r) => a + r, 0) / rpes.length));
  out.push("");

  // ---- réussite des habitudes
  out.push("## Habitudes et objectifs");
  const items = trackedItems();
  out.push("- Réussite globale sur la période : **" + formatPercent(computeTotalRate(items, dates)) + "**");
  const wDates = weekDates(weekStartAt(0));
  out.push("- Semaine en cours : " + formatPercent(computeTotalRate(items, wDates)) + " · mois : " + formatPercent(computeTotalRate(items, monthDates(today))));
  const rates = sectionRates(dates).sort((a, b) => (a.rate === null ? 2 : a.rate) - (b.rate === null ? 2 : b.rate));
  for (const s of rates) out.push("  - " + (s.section.short || s.section.label) + " : " + formatPercent(s.rate) + " (" + s.count + " habitudes suivies)");
  const low = items.map((i) => ({ i: i, r: computeRate(i, dates) })).filter((x) => x.r !== null && x.r < 0.5)
    .sort((a, b) => a.r - b.r).slice(0, 6);
  if (low.length) {
    out.push("- Habitudes qui décrochent (sous 50 %) :");
    for (const x of low) out.push("  - " + x.i.title + " — " + formatPercent(x.r) + " pour un objectif de " + frequencyOf(x.i) + "×/semaine");
  }
  const streaks = topStreaks(5);
  if (streaks.length) out.push("- Séries en cours : " + streaks.map((x) => x.item.title + " " + x.s.current + " " + x.s.unit + (x.s.current > 1 ? "s" : "")).join(" · "));
  out.push("");

  // ---- diète
  out.push("## Diète");
  const logged = loggedDayKeys(keys).length;
  out.push("- Journées alimentaires saisies : " + logged + " / " + n);
  if (logged) {
    const dt = dayTotals(), wt = weekTotals();
    const macros = nutrients().filter((x) => x.main);
    out.push("- Aujourd'hui : " + macros.map((x) => x.label + " " + Math.round(dt[x.key]) + " / " + fmtRange(x) + " " + x.unit).join(" · "));
    const avg = weekAverages();
    if (avg.days) {
      out.push("- Moyenne de la semaine (" + avg.days + " jour" + (avg.days > 1 ? "s" : "") + " saisi" + (avg.days > 1 ? "s" : "") + ") : " +
        avg.kcal + " kcal · " + avg.prot + " g P · " + avg.glu + " g G · " + avg.lip + " g L" +
        (avg.ags ? " · dont " + avg.ags + " g de gras saturés" : ""));
    }
    const gaps = topGaps(6);
    if (gaps.length) {
      out.push("- Manques les plus marqués :");
      for (const g of gaps) {
        const val = (g.period === "week" ? wt : dt)[g.n.key] || 0;
        out.push("  - " + g.n.label + " : " + Math.round(val) + " / " + fmtRange(g.n) + " " + g.n.unit +
          " (" + (g.over ? "au-dessus du plafond" : Math.round(g.share * 100) + " % de la cible") + ", période : " + (g.period === "week" ? "semaine" : "jour") + ")");
      }
    } else {
      out.push("- Toutes les cibles connues sont tenues.");
    }
  }
  out.push("");

  // ---- journal
  const journal = keys.map((k) => ({ k: k, j: journalFor(k) })).filter((x) => x.j);
  if (journal.length) {
    out.push("## Journal du soir");
    for (const x of journal) {
      out.push("- **" + x.k + "**" + (x.j.note ? " (" + x.j.note + "/10)" : "") + " : " + x.j.reussites.replace(/\n/g, " / ") +
        (x.j.bloque ? " — bloqué : " + x.j.bloque : ""));
    }
    out.push("");
  }

  out.push("## Ce que j'attends de toi");
  out.push("Regarde les tendances, pas les valeurs isolées : la composition corporelle n'est mesurée qu'à la salle, " +
    "et les jours non renseignés ne sont pas des échecs.");
  out.push("1. Ce qui progresse et ce qui décroche vraiment sur la période.");
  out.push("2. Les ajustements concrets pour les " + n + " prochains jours (entraînement, diète, sommeil).");
  out.push("3. Ce que je devrais mesurer ou surveiller de plus.");
  out.push("");
  out.push("Réponds en finissant par un bloc ```suivi``` que je peux importer directement dans l'app.");
  out.push("");
  out.push("_Les photos de suivi ne sont pas incluses : elles restent sur mon téléphone._");
  return out.join("\n");
}

// Aperçu court affiché dans l'app avant la copie.
export function rapportSummary(days) {
  const n = PERIODS.indexOf(+days) >= 0 ? +days : 14;
  const keys = lastKeys(n);
  const ws = workouts().filter((w) => keys.indexOf(w.date) >= 0);
  const p = trendFor("poids", n <= 7 ? 7 : 14);
  return {
    days: n,
    sessions: ws.length,
    logged: loggedDayKeys(keys).length,
    forme: averageOf("forme", keys),
    poids: p.current,
    delta: p.delta,
    rate: computeTotalRate(trackedItems(), lastDates(n)),
    journal: keys.filter((k) => journalFor(k)).length
  };
}
