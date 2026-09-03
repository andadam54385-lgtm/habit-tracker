/* Service worker : coquille hors ligne + réception du partage système.
   Pas de push, pas de serveur — l'app reste entièrement locale. */

const VERSION = "suivi-v29";
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./js/seed.js",
  "./js/state.js",
  "./js/parser.js",
  "./js/io.js",
  "./js/ui.js",
  "./js/components.js",
  "./js/views.js",
  "./js/sheets.js",
  "./js/importview.js",
  "./js/settings.js",
  "./js/notify.js",
  "./js/nutrition.js",
  "./js/objectives.js",
  "./js/foods.js",
  "./js/nutritionview.js",
  "./js/recipes.js",
  "./js/howto.js",
  "./js/exercises.js",
  "./js/sport.js",
  "./js/forme.js",
  "./js/corps.js",
  "./js/photos.js",
  "./js/corpsview.js",
  "./js/rapport.js",
  "./js/charge.js",
  "./js/formeview.js",
  "./js/sportview.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION)
      // addAll échoue en bloc dès qu'un fichier manque : on tolère les absents.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION && k !== "suivi-share").map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  // Cible de partage (spec §4 bis, chemin 2) : on range le texte reçu et on
  // renvoie l'utilisateur sur l'écran d'import, qui viendra le chercher.
  if (event.request.method === "POST" && url.pathname.endsWith("/share-target")) {
    event.respondWith((async function () {
      let payload = "";
      try {
        const form = await event.request.formData();
        payload = [form.get("title"), form.get("text"), form.get("url")]
          .filter(Boolean)
          .join("\n")
          .trim();
      } catch (e) {
        payload = "";
      }
      if (payload) {
        const cache = await caches.open("suivi-share");
        await cache.put("shared-payload", new Response(payload, {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }));
      }
      return Response.redirect(new URL("./index.html#/import", self.registration.scope).href, 303);
    })());
    return;
  }

  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Réseau d'abord pour la navigation : une version fraîche si elle existe,
  // la coquille en cache sinon.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          // Ne jamais écraser la coquille en cache avec une page d'erreur
          // (404/500 transitoire pendant un déploiement GitHub Pages).
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put("./index.html", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match("./index.html")
            .then((r) => r || caches.match("./"))
            .then((r) => r || new Response("Hors ligne", { status: 503 }))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const network = fetch(event.request)
        .then(function (res) {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(event.request, copy)).catch(() => {});
          }
          return res;
        })
        // respondWith(undefined) lèverait un TypeError opaque : on répond
        // toujours quelque chose.
        .catch(() => cached || new Response("", { status: 504 }));
      return cached || network;
    })
  );
});
