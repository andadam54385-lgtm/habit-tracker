// Thème et rappels. Les rappels sont locaux : pas de serveur, pas de compte.
// Ils se déclenchent tant que l'onglet vit ; sans push serveur, aucun
// navigateur ne permet mieux depuis une PWA installée.

import { state } from "./state.js";

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

export function scheduleReminders() {
  clearTimers();
  const r = state.settings && state.settings.reminders;
  if (!r || !r.on) return;

  const plan = [
    { time: r.matin, title: "Session du matin", body: "Chaussures enfilées, avant d'ouvrir la porte. Respiration 5-5, 5 min." },
    { time: r.retour, title: "Session du retour", body: "Contact coupé, tu ne sors pas avant. Respiration 5-5, 5 min." }
  ];

  for (const p of plan) {
    const when = nextOccurrence(p.time);
    if (!when) continue;
    const delay = when.getTime() - Date.now();
    // setTimeout dérive au-delà de ~24 j ; ici on reste sous 24 h.
    timers.push(setTimeout(function () {
      fire(p.title, p.body);
      scheduleReminders();
    }, delay));
  }
}
