// Thème et rappels. Les rappels sont locaux : pas de serveur, pas de compte.
// Ils se déclenchent tant que l'onglet vit ; sans push serveur, aucun
// navigateur ne permet mieux depuis une PWA installée.

import { state } from "./state.js";
import { weighDue, daysSince } from "./corps.js";
import { photoStats, photoInterval, daysSincePhoto } from "./photos.js";

export function applyTheme() {
  const t = (state.settings && state.settings.theme) || "auto";
  const root = document.documentElement;
  if (t === "clair") root.setAttribute("data-theme", "light");
  else if (t === "sombre") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

const timers = [];

function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

function nextOccurrence(hhmm) {
  const parts = String(hhmm || "").split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

function fire(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body: body, icon: "icon-192.png", badge: "icon-192.png", tag: title });
  } catch (e) {
    // Certains navigateurs mobiles exigent le service worker pour notifier.
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title, { body: body, icon: "icon-192.png", tag: title });
      }).catch(function () { /* rappel manqué, sans conséquence */ });
    }
  }
}

// Chaque rappel a son heure : le visage le matin, la pesée à l'heure de la
// séance. `when` décide, au moment de sonner, si le rappel a lieu d'être —
// inutile de réclamer une pesée déjà faite.
function plannedReminders() {
  const r = (state.settings && state.settings.reminders) || {};
  const plan = [];
  if (r.on) {
    plan.push({ time: r.matin, title: "Session du matin", body: "Chaussures enfilées, avant d'ouvrir la porte. Respiration 5-5, 5 min." });
    plan.push({ time: r.retour, title: "Session du retour", body: "Contact coupé, tu ne sors pas avant. Respiration 5-5, 5 min." });
  }
  // La pesée n'a pas d'heure : elle se rappelle au démarrage d'une séance
  // (voir openMuscuSession), là où la balance est à portée.
  if (r.photoOn) {
    plan.push({
      time: r.photoHeure || "07:30", title: "Photos de suivi",
      body: "Visage et corps, même lumière et même endroit qu'la dernière fois.",
      due: function () {
        return photoStats().then(function (stats) {
          const n = photoInterval();
          return Object.keys(stats.last).some(function (k) {
            const since = daysSincePhoto(stats.last[k]);
            return since === null || since >= n;
          });
        }).catch(function () { return true; });
      }
    });
  }
  return plan;
}

export function scheduleReminders() {
  clearTimers();
  for (const p of plannedReminders()) {
    const when = nextOccurrence(p.time);
    if (!when) continue;
    const delay = when.getTime() - Date.now();
    // setTimeout dérive au-delà de ~24 j ; ici on reste sous 24 h.
    timers.push(setTimeout(function () {
      Promise.resolve(p.due ? p.due() : true).then(function (ok) {
        if (ok) fire(p.title, p.body);
        scheduleReminders();
      });
    }, delay));
  }
}

// Rappel « en retard » à l'ouverture de l'app : la pesée ou les photos dues
// depuis plus longtemps que l'intervalle choisi.
export function pendingNudges() {
  const r = (state.settings && state.settings.reminders) || {};
  const out = [];
  if (r.peseeOn && weighDue()) {
    const since = daysSince("poids");
    out.push({ kind: "pesee", label: since === null ? "Première pesée à faire" : "Pesée : " + since + " jour" + (since > 1 ? "s" : "") + " sans mesure" });
  }
  return out;
}
