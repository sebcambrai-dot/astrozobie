/* Garde l'appli utilisable sans réseau : les calculs du ciel marchent hors ligne, seule la météo a besoin d'internet.
   Changer VERSION à chaque mise en ligne pour que les téléphones prennent les nouveaux fichiers,
   et ajouter une ligne au journal des versions montré dans l'appli (pied de page de index.html). */
var VERSION = 'astrozobie-2026-11-27-g';
var FICHIERS = ['./', 'index.html', 'style.css', 'astro.js', 'messier.js', 'catalogue.js', 'dessin.js', 'savant.js', 'distances.js', 'app.js', 'manifest.webmanifest', 'icone.svg', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n != VERSION; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method != 'GET' || u.origin != location.origin) return;          /* la météo passe toujours par le réseau */
  /* réseau d'abord, pour rester à jour ; copie gardée en secours quand il n'y a pas de connexion */
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok) { var c = r.clone(); caches.open(VERSION).then(function (k) { k.put(e.request, c); }); } return r; })
    .catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); }); }));
});
