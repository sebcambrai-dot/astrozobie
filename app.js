/* Observatoire : l'application. Quatre écrans (Ce soir, Carte, À voir, Jeux), le choix du lieu, la météo, le viseur.
   Tout se calcule sur l'appareil ; seule la météo vient d'internet (Open-Meteo, sans clé). */
(function () {
'use strict';
var $ = function (i) { return document.getElementById(i); };
var CLE = 'observatoire-v1', CLE_M = 'observatoire-meteo';
var PN = { ve: 'Vénus', ju: 'Jupiter', sa: 'Saturne', ma: 'Mars', me: 'Mercure' };
var DIR = ['au nord', 'au nord-est', 'à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest'];
var INS = ['Œil nu', 'Jumelles', 'Télescope'], INS_S = ['sans matériel', '10 × 50', '114 mm'], GENRE = ['', 'Système solaire', 'Étoile', 'Ciel profond'];
var ICONES = ['<path d="M2 14c5-8 19-8 24 0-5 8-19 8-24 0z"/><circle cx="14" cy="14" r="4"/>',
  '<circle cx="8" cy="19" r="5.5"/><circle cx="20" cy="19" r="5.5"/><path d="M4 15 7 5h4v9M24 15 21 5h-4v9M13 18h2"/>',
  '<path d="M3 16 21 5l3 5L6 21zM14 16l-5 10M14 16l5 10"/>'];

/* ---------- mémoire de l'appareil ---------- */
function lire(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
var E = Object.assign({ lieu: { n: 'Cambrai', s: 'Hauts-de-France, France', lat: 50.176, lon: 3.235, tz: 'Europe/Paris' }, suivi: 0, ciel: 1, ins: 0, vus: {}, pts: 0, nb: 0, serie: 0, dernier: '', defi: -1, quiz: 0, sansFaute: 0, lieux: [], accueil: 0, voeux: 0, voyages: {} }, lire(CLE) || {});
E.acquis = E.acquis || {}; Object.keys(E.vus).forEach(function (k) { E.acquis[k] = 1; });   /* astres déjà payés en points */
if (!E.fait || !E.fait.l) E.fait = { j: '', l: [] };                                         /* défis réussis aujourd'hui */
function sauver() { ecrire(CLE, E); }
var visite = null;                       /* lieu du « voyage express », jamais enregistré */
function L() { return visite || E.lieu; }

/* ---------- heures et dates, dans le fuseau du lieu regardé ---------- */
var FH, TZ, NB = String.fromCharCode(160);
function fuseau() {
  TZ = L().tz || undefined;
  try { FH = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone: TZ }); }
  catch (e) { TZ = undefined; FH = new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }); }
}
function hmp(t) { var h = 0, m = 0; FH.formatToParts(t).forEach(function (x) { if (x.type == 'hour') h = +x.value % 24; if (x.type == 'minute') m = +x.value; }); return [h, m]; }
function hm(t) { var x = hmp(t); return x[0] + NB + 'h' + NB + ('0' + x[1]).slice(-2); }
function hh(t) { return hmp(t)[0] + NB + 'h'; }
function jour(t, o) { return new Date(t).toLocaleDateString('fr-FR', Object.assign({ timeZone: TZ }, o || { weekday: 'long', day: 'numeric', month: 'long' })); }
function heureRonde(t) { t = Math.ceil(t / 6e4) * 6e4; return t + ((60 - hmp(t)[1]) % 60) * 6e4; }
function duree(ms) { return Math.floor(ms / 36e5) + ' h ' + ('0' + Math.round(ms % 36e5 / 6e4) % 60).slice(-2); }
function pct(x) { return Math.round(x * 100) + NB + '%'; }
function cleJour(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function direction(p) { return p.alt >= 80 ? 'au zénith' : DIR[Math.round(p.az / 45) % 8]; }
/* instant de minuit, au lieu regardé, du jour donné (mois compté à partir de 0) */
function minuitLocal(y, m, d) { var t = Date.UTC(y, m, d), x = hmp(t + 432e5), dec = ((x[0] + x[1] / 60 - 12 + 36) % 24) - 12, l = L().lon / 15; if (dec - l > 12) dec -= 24; else if (dec - l < -12) dec += 24; return t - dec * 36e5; }
function poings(p) { var f = Math.max(1, Math.round(p.alt / 10)); return f + ' poing' + (f > 1 ? 's' : ''); }
function txt(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

/* ---------- météo (Open-Meteo) ---------- */
var M = null, meteoEtat = 'attente';     /* attente, ok, vieille, absente */
function cleMeteo() { return L().lat.toFixed(2) + ',' + L().lon.toFixed(2); }
function meteo(force) {
  var cle = cleMeteo(), c = lire(CLE_M), frais = c && c.cle == cle && c.v == 2 && Date.now() - c.maj < 27e5;      /* v 2 : avec la veille ; une copie plus ancienne se redemande tout de suite */
  if (c && c.cle == cle) { M = c; meteoEtat = frais ? 'ok' : 'vieille'; fuseauMeteo(); if (!hChoisie) selH = 0; recalcul(); } else { M = null; meteoEtat = 'attente'; }
  if (frais && !force) { tout(); return Promise.resolve(); }
  if (typeof fetch != 'function') { meteoEtat = M ? 'vieille' : 'absente'; return Promise.resolve(); }
  var ici = L();
  return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + ici.lat.toFixed(2) + '&longitude=' + ici.lon.toFixed(2)
    + '&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,temperature_2m,dew_point_2m,wind_speed_10m&forecast_days=16&past_days=1&timeformat=unixtime&timezone=auto')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var h = j.hourly;
      if (!h || !h.time || !h.cloud_cover) throw new Error('réponse vide');
      var m = { v: 2, cle: cle, maj: Date.now(), t0: h.time[0] * 1e3, c: h.cloud_cover, lo: h.cloud_cover_low, mi: h.cloud_cover_mid, hi: h.cloud_cover_high, pp: h.precipitation_probability, te: h.temperature_2m, ro: h.dew_point_2m, ve: h.wind_speed_10m, tz: j.timezone };
      ecrire(CLE_M, m);
      if (cle != cleMeteo()) return;      /* le lieu a changé pendant l'attente */
      M = m; meteoEtat = 'ok'; fuseauMeteo(); if (!hChoisie) selH = 0; recalcul();
    })
    .catch(function () { if (cle == cleMeteo()) meteoEtat = M ? 'vieille' : 'absente'; })
    .then(function () { if (cle == cleMeteo()) tout(); });
}
/* une position trouvée par GPS n'a pas de fuseau : la météo le donne */
function fuseauMeteo() { if (M && M.tz && !L().tz && M.tz != 'GMT') { L().tz = M.tz; if (!visite) sauver(); fuseau(); } }
function val(a, t) { if (!M || !a) return null; var x = (t - M.t0) / 36e5, i = Math.floor(x); if (x < 0 || i >= a.length) return null; var u = a[i], v = a[Math.min(i + 1, a.length - 1)]; if (u == null) return null; if (v == null) v = u; return u + (v - u) * (x - i); }
function nuages(t) { var v = val(M && M.c, t); return v == null ? null : v / 100; }

/* ---------- bilan d'une nuit ---------- */
function bilan(N) {
  var t, su, mo, il, k, n = 0, l = 0, pl = {}, cs = 0, cn = 0, c, H = [];
  if (!N.jour) for (t = heureRonde(N.a); t <= N.b; t += 36e5) {
    su = pos('so', t); if (su.alt > -12) continue;
    n++; mo = pos('lu', t); il = (1 - C(mo.lon - su.lon)) / 2; if (mo.alt > 0) l += il;
    for (k in PN) if (pos(k, t).alt > 10) pl[k] = 1;
    c = nuages(t); if (c != null) { cs += c; cn++; }
    H.push({ t: t, c: c, q: c == null ? null : (1 - c) * (1 - .45 * (mo.alt > 0 ? il : 0)), ok: pos('so', t + 36e5).alt < -10 });
  }
  var B = { N: N, n: n, pl: Object.keys(pl), il: lune(N.m + 432e5).il };
  B.astro = n ? Math.min(100, Math.round(55 * (1 - l / n) + 9 * B.pl.length)) : 0;
  B.c = n && cn >= n * .6 ? cs / cn : null;
  B.s = B.c == null ? B.astro : Math.round(B.astro * (1 - .9 * B.c));
  var j = Math.round((N.m - midi(Date.now())) / 864e5);
  B.fiab = B.c == null ? 0 : j <= 5 ? 2 : 1;
  /* meilleur créneau : jusqu'à trois heures d'affilée, les plus dégagées et les moins gênées par la Lune */
  function creneau(soiree) {
    var m = -1, i, q, w, r = null;
    /* une heure compte si elle a une prévision, n'est pas finie, et reste sombre jusqu'au bout */
    function bon(x) { return x.q != null && x.ok && x.t + 36e5 >= maintenant && (!soiree || hmp(x.t)[0] >= 12); }
    for (i = 0; i < H.length; i++) {
      if (!bon(H[i])) continue; w = [H[i]]; while (w.length < 3 && H[i + w.length] && bon(H[i + w.length])) w.push(H[i + w.length]);
      q = w.reduce(function (a, x) { return a + x.q; }, 0) / w.length;
      if (q > m + .001) { m = q; r = { a: w[0].t, b: w[w.length - 1].t + 36e5, c: w.reduce(function (a, x) { return a + x.c; }, 0) / w.length }; }
    }
    return r;
  }
  B.cr = creneau(0);
  B.so = B.cr && hmp(B.cr.a)[0] < 12 ? creneau(1) : null;      /* meilleur moment après minuit : on donne aussi le meilleur de la soirée */
  B.mot = N.jour ? 'Pas de nuit ici' : !n ? 'Ciel jamais noir'
    : B.c == null ? (B.s >= 75 ? 'Nuit très noire' : B.s >= 55 ? 'Nuit sombre' : B.s >= 35 ? 'Nuit correcte' : 'Lune trop forte')      /* sans météo, on ne promet que le noir */
    : B.s >= 75 ? 'Nuit de rêve' : B.s >= 55 ? 'Belle nuit' : B.s >= 35 ? 'Nuit correcte' : B.c > .5 ? (B.c > .8 ? 'Ciel bouché' : 'Trop de nuages') : 'Lune trop forte';
  return B;
}

/* ---------- état commun ---------- */
var maintenant, NU, NUITS = [], selN = 0, meilleure = 0, selH = 0, hChoisie = 0, page = 'soir', heureVue = 0, couvert = 0;
function ceSoir() { return maintenant > NU.a && !NU.jour ? 'Cette nuit' : 'Ce soir'; }
function recalcul() {
  lieu(L().lat, L().lon); maintenant = Date.now(); NU = nuitDe(maintenant);
  NUITS = []; meilleure = 0;
  for (var i = 0; i < 30; i++) NUITS.push(bilan(i ? nuit(NU.m + i * 864e5) : NU));
  /* la meilleure nuit se choisit parmi celles qui ont une prévision : sans météo, une note ne compte que la Lune et les planètes */
  var avec = NUITS.some(function (B) { return B.c != null; }), mx = -1;
  NUITS.forEach(function (B, i) { if ((!avec || B.c != null) && B.s > mx) { mx = B.s; meilleure = i; } });
  heureVue = Math.floor(maintenant / 36e5);
  if (selN > 29) selN = 0;
}

/* ============ en-tête ============ */
function entete() {
  var l = L(), t = Date.now();
  $('lieu-n').textContent = l.n;
  $('lieu-s').textContent = visite ? 'en visite' : l.gps ? (E.suivi ? 'suivie en direct · ' : '') + coord(l) : (l.s || coord(l));
  $('hl-h').textContent = hm(t); $('hl-j').textContent = jour(t, { weekday: 'short', day: 'numeric', month: 'short' });
  $('visite').hidden = !visite;
  if (visite) $('visite-t').textContent = 'En visite : ' + visite.n + ', ' + visite.s + '.';
}
function coord(l) { return Math.abs(l.lat).toFixed(2).replace('.', ',') + '° ' + (l.lat < 0 ? 'S' : 'N') + ', ' + Math.abs(l.lon).toFixed(2).replace('.', ',') + '° ' + (l.lon < 0 ? 'O' : 'E'); }

/* ============ écran « Ce soir » ============ */
var noteAff = 0;
function soir() {
  var B = NUITS[selN], N = B.N, quand = selN ? jour(N.m) : 'Ce soir', d = [], t0 = Date.now(), de = noteAff;
  /* jauge */
  $('j-arc').style.strokeDashoffset = 377 * (1 - B.s / 100);
  (function pas() { var f = Math.min(1, (Date.now() - t0) / 300); noteAff = Math.round(de + (B.s - de) * f); $('j-n').textContent = noteAff; if (f < 1) setTimeout(pas, 30); })();
  $('v-quand').textContent = (selN ? jour(N.m) : ceSoir()) + ', ' + (L().gps ? 'là où tu es' : L().ou || 'à ' + L().n);
  $('v-retour').hidden = !selN; $('v-maj').hidden = !!selN;      /* le retour prend la place du bouton météo : la page ne bouge pas sous le doigt */ $('v-retour').textContent = 'Revenir à ' + ceSoir().toLowerCase(); $('b0').textContent = ceSoir();
  $('v-titre').textContent = B.mot;
  d.push(B.c == null ? (meteoEtat == 'attente' ? 'Météo en cours de chargement' : selN > 15 || meteoEtat != 'absente' ? 'Pas encore de prévision météo' : 'Météo indisponible') : 'Dégagé à ' + pct(1 - B.c) + (B.fiab == 1 ? ' (tendance)' : ''));
  d.push('Lune éclairée à ' + pct(selN ? B.il : lune(refTemps()).il));
  d.push(N.jour ? 'le Soleil ne se couche pas' : N.polaire ? 'le Soleil ne se lève pas' + (N.d1 ? ', nuit noire de ' + hm(N.d1) + ' à ' + hm(N.d2) : '') : N.d1 ? 'nuit noire de ' + hm(N.d1) + ' à ' + hm(N.d2) : 'coucher du Soleil à ' + hm(N.ss) + ', pas de nuit vraiment noire');
  $('v-detail').textContent = d.join(' · ');
  var c = B.cr, cause = B.c != null && B.c < .4 && B.s < 55 && B.il > .5 && !N.jour ? 'Peu de nuages, mais la Lune, très éclairée, efface les étoiles faibles. ' : '';
  $('v-creneau').innerHTML = !c ? (B.c == null && meteoEtat == 'absente' ? 'Note calculée sans les nuages : pas de connexion à la météo.' : cause)
    : cause + (c.c > .7 ? '<b>Aucune vraie éclaircie</b> prévue cette nuit-là.' : '<b>Meilleur moment :</b> de ' + hh(c.a) + ' à ' + hh(c.b) + ', dégagé à ' + pct(1 - c.c) + '.'
      + (B.so && B.so.c <= .7 ? ' <b>En soirée :</b> de ' + hh(B.so.a) + ' à ' + hh(B.so.b) + ', dégagé à ' + pct(1 - B.so.c) + '.' : ''));
  if (!selH || selH < N.a - 36e5 || selH > N.b + 36e5) {
    selH = heureRonde((c && c.c <= .7 ? c.a : (N.d1 || (N.jour ? N.m + 432e5 : N.ss + 54e5))) - 18e5);
    if (!selN && !N.jour && selH < maintenant && maintenant < N.b) selH = heureRonde(maintenant) - 36e5;      /* jamais une heure déjà finie : l'heure en cours */
  }
  $('v-maj').textContent = meteoEtat == 'attente' ? 'Météo en cours…' : 'Actualiser la météo';
  $('v-meteo').textContent = !M ? '' : meteoEtat == 'vieille' ? 'Attention : prévision du ' + jour(M.maj, { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' + hm(M.maj) + '. Mise à jour impossible pour le moment.' : 'Météo mise à jour à ' + hm(M.maj) + '.';
  heures(N); haut3(); barres(); rendezVous();
}
function heures(N) {
  var t, h = '', n = Math.round((N.b - N.a) / 36e5), i = 0, now = Date.now();
  if (!N.jour) for (t = heureRonde(N.a); t <= N.b; t += 36e5, i++) {
    var c = nuages(t), su = pos('so', t).alt, mo = pos('lu', t).alt > 0, a = borne((su + 18) / 17);
    h += '<button type="button" class="h' + (Math.abs(t - selH) < 18e5 ? ' s' : '') + (t <= now && now < t + 36e5 ? ' n' : '') + '" data-t="' + t + '" aria-label="' + hh(t) + (c == null ? '' : ', nuages ' + pct(c)) + '">'
      + '<u style="background:rgb(' + (9 + 150 * a | 0) + ',' + (30 + 105 * a | 0) + ',' + (44 + 96 * a | 0) + ')">' + (c == null ? '<em>?</em>' : '<i style="height:' + Math.round(c * 100) + '%"></i>') + (mo ? '<s></s>' : '') + '</u>'
      + '<b>' + (n > 12 && i % 2 && Math.abs(t - selH) >= 18e5 ? '' : hmp(t)[0]) + '</b></button>';
  }
  $('heures').innerHTML = h || '<p class="note">Pas de nuit à découper : le Soleil ne se couche pas ici en ce moment.</p>';
  $('h-note').hidden = $('h-aide').hidden = !h; $('h-fl').hidden = !$('heures').querySelector('.n');
  noteHeure();
}
function noteHeure() {
  var t = selH, c = nuages(t), te = val(M && M.te, t), ro = val(M && M.ro, t), ve = val(M && M.ve, t), pp = val(M && M.pp, t), lo = val(M && M.lo, t), mi = val(M && M.mi, t), hi = val(M && M.hi, t), s;
  var ici = !selN && (!!NU.jour || (t <= Date.now() && Date.now() < t + 36e5));      /* sans nuit à découper, le bouton montre le ciel du moment */
  $('v-carte').textContent = ici ? 'Voir le ciel maintenant' : 'Voir le ciel à ' + hh(t);
  if (c == null) s = 'À ' + hh(t) + ' : pas de prévision de nuages.';
  else {
    s = 'À ' + hh(t) + ' : nuages ' + pct(c) + (lo != null ? ' (bas ' + Math.round(lo) + ', moyens ' + Math.round(mi) + ', hauts ' + Math.round(hi) + ')' : '') + ', ' + Math.round(te) + NB + '°C, vent ' + Math.round(ve) + NB + 'km/h'
      + (pp > 30 ? ', pluie possible (' + Math.round(pp) + ' %)' : '') + (te - ro < 2 ? '. Air très humide : ' + (E.ins ? 'buée probable sur les optiques' : 'brume possible') : '') + '.';
  }
  $('h-note').textContent = s;
}
function refTemps() { /* l'instant qui sert pour « à voir » : maintenant s'il fait nuit, sinon le début de la nuit */
  var t = Date.now(); return NU.jour ? t : pos('so', t).alt < -6 && t <= NU.b ? t : (NU.d1 && NU.d1 > t ? NU.d1 : cross('so', Math.max(t, NU.a), -10, -1, 12) || NU.a + 54e5);
}
function visibles(i, T, e) { var v = []; OBJETS.forEach(function (o, n) { var p = at(o, T), m = mar(o, p, i, e, E.ciel); if (p.alt >= 5 && m >= 0) v.push({ n: n, p: p, m: m }); }); return v; }
function interet(x) { return Math.min(x.m, 3) + x.p.alt / 40 + (OBJETS[x.n].g == 1 && !OBJETS[x.n].mi ? 3 : 0); }
function haut3() {
  var T = refTemps(), e = env(T), nu = nuages(T), v = visibles(E.ins, T, e).sort(function (a, b) { return interet(b) - interet(a); }).slice(0, innerWidth >= 900 ? 6 : 4), direct = Math.abs(T - Date.now()) < 6e4;
  couvert = nu != null && nu > .8;
  $('top-t').textContent = (couvert ? 'Derrière les nuages' : 'À voir') + (direct ? ' maintenant' : ' vers ' + hm(T)) + ', ' + ['à l’œil nu', 'aux jumelles', 'au télescope'][E.ins];
  $('top').innerHTML = v.length ? v.map(function (x) { var o = OBJETS[x.n]; return '<button type="button" class="o" data-n="' + x.n + '"><em style="background:' + o.c + '"></em><span><b>' + o.n + '</b><small>' + direction(x.p) + ', ' + Math.round(x.p.alt) + '°, ' + poings(x.p) + '</small></span><i>' + difficulte(x, o) + '</i></button>'; }).join('')
    : '<p class="note">' + (NU.jour ? 'Il fait jour toute la nuit ici en ce moment : seule la Lune reste à chercher.' : 'Rien à portée à cette heure avec ce matériel.') + '</p>';
}
function barres() {
  var b = $('bars'), h = '';
  NUITS.forEach(function (B, i) { h += '<button type="button" class="' + (B.fiab == 2 ? 'f2' : B.fiab == 1 ? 'f1' : 'f0') + (B.s >= 70 ? ' g' : '') + (i == selN ? ' s' : '') + '" data-i="' + i + '" style="height:' + Math.max(4, B.s) + '%" title="' + jour(B.N.m) + ' : ' + B.s + ' / 100" aria-label="' + jour(B.N.m) + ', ' + B.s + ' sur 100"></button>'; });
  b.innerHTML = h;
  var a = $('ax').children; [0, 15, 29].forEach(function (i, k) { a[k].textContent = jour(NUITS[i].N.m, { day: 'numeric', month: 'short' }); });
  var B = NUITS[selN];
  $('info').innerHTML = '<b>' + (selN ? jour(B.N.m) : ceSoir()) + '</b> : ' + B.s + ' sur 100. ' + (B.pl.length ? 'Planètes bien placées : ' + B.pl.map(function (k) { return PN[k]; }).join(', ') + '.' : 'Aucune planète haute dans le ciel noir.');
  $('b-note').textContent = 'Barres pleines : météo prévue (fiable sur cinq jours, simple tendance ensuite). Barres en contour : pas encore de prévision, la note ne compte que la Lune et les planètes. « Meilleure nuit » choisit parmi les nuits qui ont une prévision.';
}

/* rendez-vous : lunes, étoiles filantes, planètes au plus près */
var RDV = [];
function rendezVous() {
  var now = Date.now(), y = new Date(now).getFullYear(), a = lune(now).age, b, x, pl = 0, nl = 0, nord = L().lat >= 0;
  RDV = [];
  /* l'instant exact, à la minute : sans cela le compte à rebours repartirait d'une heure ronde à chaque affichage */
  function affine(x, f) { var u = x - 36e5, v = x, i, m; for (i = 0; i < 12; i++) { m = (u + v) / 2; if (f(m)) v = m; else u = m; } return Math.round(v / 6e4) * 6e4; }
  for (x = now + 36e5; x < now + 27e8 && !(pl && nl); x += 36e5) {
    b = lune(x).age;
    if (!pl && a < 180 && b >= 180) pl = affine(x, function (t) { return lune(t).age >= 180; });
    if (!nl && a > 300 && b < 60) nl = affine(x, function (t) { return lune(t).age < 180; });
    a = b;
  }
  RDV.push([pl, 'Pleine lune', 'Elle se lève au coucher du Soleil et éclaire toute la nuit.'], [nl, 'Nouvelle lune', 'Le ciel le plus noir du mois : la meilleure nuit pour les étoiles.']);
  PLUIES.forEach(function (s) {
    if (s[3] && (s[3] > 0) != nord) return;
    x = minuitLocal(y, s[0] - 1, s[1]); if (x < now - 432e5) x = minuitLocal(y + 1, s[0] - 1, s[1]);
    RDV.push([x, 'Étoiles filantes : ' + s[2], 'Maximum dans la nuit du ' + (jour(x - 432e5, { day: 'numeric' })) + ' au ' + jour(x + 6e4, { day: 'numeric', month: 'long' }) + '.', s[2]]);
  });
  RDV.push([Date.UTC(2027, 1, 11), 'Jupiter au plus près', 'Visible toute la nuit, très brillante.'], [Date.UTC(2027, 1, 19), 'Mars au plus près', 'Un point orange vif, visible toute la nuit.'], [Date.UTC(2027, 9, 18), 'Saturne au plus près', 'Visible toute la nuit.']);
  if (L().lat > 0 && L().lat < 66 && L().lon > -25 && L().lon < 60) RDV.push([Date.UTC(2027, 7, 2, 8), 'Éclipse de Soleil', 'Le 2 août 2027 au matin : totale du sud de l’Espagne à l’Égypte, partielle sur l’Europe. Lunettes spéciales obligatoires.']);
  RDV = RDV.filter(function (e) { return e[0] > now - 432e5; }).sort(function (p, q) { return p[0] - q[0]; }).slice(0, 5);
  $('rdv').innerHTML = RDV.map(function (e, i) { var n = Math.max(0, Math.floor((e[0] - now) / 864e5)); return '<div class="e"><u>' + n + '<small>jour' + (n > 1 ? 's' : '') + '</small></u><div><b>' + e[1] + ', ' + jour(e[0] + 6e4, { day: 'numeric', month: 'long' }) + '</b><span>' + e[2] + '</span></div></div>'; }).join('');
  $('cd-t').textContent = RDV.length ? 'Temps restant avant : ' + (RDV[0][3] || RDV[0][1]) : '';
  rebours();
}
function rebours() {
  if (!RDV.length || page != 'soir') return;
  var s = Math.max(0, Math.floor((RDV[0][0] - Date.now()) / 1e3));
  $('cd').innerHTML = [[Math.floor(s / 86400), 'jours'], [Math.floor(s / 3600) % 24, 'h'], [Math.floor(s / 60) % 60, 'min'], [s % 60, 's']].map(function (x) { return '<div>' + x[0] + '<small>' + x[1] + '</small></div>'; }).join('');
}

/* ============ écran « Carte » ============ */
var cg, cT = 0, cN, cLive = 0, cAuto = 0, cSel = '', cTimer = 0, cPO = {}, cA, cB;
function carteNuit(N, T) {
  cN = N; cA = N.jour ? N.m : N.a - 36e5; cB = N.jour ? N.m + 864e5 : N.b + 36e5; $('c-sl').max = Math.round((cB - cA) / 3e5);
  var c = [], i, a, h = '', t, pas;
  for (i = 0; i <= 32; i++) { a = borne((pos('so', cA + (cB - cA) * i / 32).alt + 18) / 17); c.push('rgb(' + (12 + 170 * a | 0) + ',' + (18 + 100 * a | 0) + ',' + (38 + 70 * a | 0) + ') ' + (i / .32).toFixed(1) + '%'); }
  $('c-sl').style.background = 'linear-gradient(90deg,' + c + ')';
  pas = (cB - cA) > 5e7 ? 108e5 : 72e5;
  for (t = heureRonde(cA + 18e5); t < cB - 18e5; t += pas) h += '<span style="left:' + ((t - cA) / (cB - cA) * 100).toFixed(1) + '%">' + hh(t) + '</span>';
  $('c-ax').innerHTML = h;
  if (T) cT = T;
}
function carteOuvre() {
  if (!cg) { cg = $('ciel').getContext('2d'); cg.scale(1200 / 440, 1200 / 440); }
  if (!cN) { var now = Date.now(); cLive = NU.jour || (pos('so', now).alt < -6 && now <= NU.b); cAuto = !cLive; carteNuit(NU, cLive ? now : refTemps()); }
  carteRend();
}
function carteRend() {
  var N = cN, c = nuages(cT), su = pos('so', cT), fin = cB, h = '';
  $('c-h').textContent = hm(cT);
  $('c-j').innerHTML = jour(cT) + ' <span>' + (cLive ? 'en direct' : cT > Date.now() ? 'à venir' : 'déjà passé') + '</span>';
  $('c-sl').value = Math.round((cT - cA) / 3e5); $('c-now').className = cLive ? 'p' : ''; $('c-now').textContent = cLive ? 'En direct' : 'Maintenant';
  var jb = $('c-bt').querySelectorAll('[data-j]'), enNuit = !NU.jour && Date.now() > NU.a && Date.now() < NU.b;
  jb[0].textContent = enNuit ? 'Cette nuit' : 'Ce soir'; jb[1].textContent = enNuit && hmp(Date.now())[0] < 12 ? 'Ce soir' : 'Demain';
  $('c-f').textContent = (N.jour ? 'Le Soleil ne se couche pas ici en ce moment.' : N.polaire ? 'Le Soleil ne se lève pas ici en ce moment.' : 'Soleil couché à ' + hm(N.ss) + (N.d1 ? ', nuit noire de ' + hm(N.d1) + ' à ' + hm(N.d2) + '.' : ', pas de nuit vraiment noire en ce moment.'))
    + (c == null ? '' : ' Nuages à cette heure : ' + pct(c) + '.');
  cPO = carte(cg, cT, cSel, c || 0);
  ASTRES.forEach(function (b) {
    var k = b[0], p = pos(k, cT), lim = k == 'lu' ? 90 : k == 've' || k == 'me' ? -4 : -6, v = p.alt > 0 && su.alt < lim, t, x, nm = b[1], l = Math.max((fin - cT) / 36e5, 1);
    if (k == 'lu') { x = rev(p.lon - su.lon); var il = (1 - C(x)) / 2, ph = ['nouvelle', 'croissant', 'premier quartier', 'gibbeuse', 'pleine', 'gibbeuse', 'dernier quartier', 'croissant'][Math.round(x / 45) % 8]; nm += ', ' + (ph == 'gibbeuse' && il >= .85 ? 'presque pleine' : ph) + ', ' + Math.round(il * 100) + ' %'; }
    if (v) { x = cross(k, cT, 0, -1, l); t = 'Visible ' + direction(p) + ', ' + Math.round(p.alt) + '° (' + (p.alt < 5 ? 'ras de l’horizon' : poings(p)) + ')' + (x ? ', se couche à ' + hm(x) : ''); }
    else if (p.alt > 0) t = 'Au-dessus de l’horizon, mais le ciel est trop clair';
    else { x = cross(k, cT, 0, 1, l); t = x ? 'Se lève à ' + hm(x) : 'Sous l’horizon jusqu’au matin'; }
    h += '<button type="button" class="c' + (v ? ' v' : '') + (cSel == k ? ' s' : '') + '" data-k="' + k + '"><i style="background:' + b[2] + '"></i><div><b>' + nm + '</b><span>' + t + '</span></div></button>';
  });
  $('c-ls').innerHTML = h;
  var p = prochainePluie(); $('c-pluie').textContent = p ? 'Voir la nuit des ' + p[3] : ''; $('c-pluie').hidden = !p;
}
function prochainePluie() { for (var i = 0; i < RDV.length; i++) if (RDV[i][3]) return RDV[i]; if (!RDV.length) rendezVousSilence(); return null; }
function rendezVousSilence() { var p = page; page = ''; rendezVous(); page = p; }
function carteStop() { cAuto = 0; clearInterval(cTimer); cTimer = 0; $('c-play').textContent = 'Lancer la nuit'; }
function allerCarte(T) { carteStop(); cLive = 0; if (!cg) { cg = $('ciel').getContext('2d'); cg.scale(1200 / 440, 1200 / 440); } carteNuit(nuit(midi(T)), T); montrer('carte'); }

/* ============ écran « À voir » ============ */
var og, oSel = 0, oChoisi = 0, oFlt = 0, oLive = 1, oT, oE, oJour, oTimer;
function difficulte(x, o) { return couvert ? 'caché' : o.k && o.mi ? 'à chercher' : x.p.alt < 10 ? 'très bas' : x.m > 1.6 ? 'facile' : x.m > .7 ? 'moyen' : 'difficile'; }
function ilFaut(i) { return 'Il faut ' + (i == 1 ? 'des jumelles' : 'un télescope'); }
function pourquoi(o, p) {
  if (E.ins < o.mi) return ilFaut(o.mi);
  if (mar(o, p, E.ins, oE, E.ciel, 0, 1) >= 0) return NU.jour ? 'Ciel trop clair : le Soleil ne se couche pas' : 'Ciel trop clair à cette heure';
  if (mar(o, p, E.ins, oE, E.ciel, 1, 1) >= 0) return 'Lune trop forte, éclairée à ' + pct(oE.il);
  for (var i = E.ins + 1; i < 3; i++) if (mar(o, p, i, oE, E.ciel) >= 0) return ilFaut(i);
  return 'Trop faible pour ce ciel';
}
/* premier moment de la nuit où l'objet, pas encore levé, sera assez haut et à la portée de l'instrument */
var envPlus = {};
function plusTard(o) { for (var t = oT + 6e5, p; t < NU.b; t += 6e5) { p = at(o, t); if (p.alt >= 8 && mar(o, p, E.ins, envPlus[t] || (envPlus[t] = env(t)), E.ciel) >= 0) return t; } return 0; }
function voirHorloge() {
  var now = Date.now(); oJour = pos('so', now).alt > -.8;
  if (oLive) oT = refTemps();       /* la même heure de référence que « Ce soir » et la carte */
  if (!NU.jour) oT = Math.max(NU.a, Math.min(NU.b, oT));
  oE = env(oT);
}
function ligne(n, a, b, x) {
  var o = OBJETS[n], p = at(o, oT), d = '', i;
  for (i = 0; i < 3; i++) d += '<u class="' + (i >= o.mi && p.alt >= 5 && mar(o, p, i, oE, E.ciel) >= 0 ? 'y' : '') + '"></u>';
  return '<button type="button" class="o' + (n == oSel ? ' s' : '') + (x ? ' x' : '') + '" data-n="' + n + '"><em style="background:' + o.c + '"></em><span><b>' + o.n + (E.vus[o.n] ? ' <s>vu</s>' : '') + '</b><small>' + a + '</small></span><i>' + b + '<tt>' + d + '</tt></i></button>';
}
function segment(id, j) { [].forEach.call($(id).children, function (b, n) { b.className = n == j ? 'p' : ''; }); }
function voir(anime) {
  if (!og) { og = $('oeil').getContext('2d'); og.scale(3, 3); }
  voirHorloge(); envPlus = {};
  var V = [0, 1, 2].map(function (i) { return visibles(i, oT, oE); }), cur = V[E.ins], h = '', tard = '', bas = '', vu = {}, c = 0, d = 0, e = 0, now = Date.now(), nu = nuages(oT), i, a, t, grad = [], plus = [];
  $('o-h').textContent = hm(oT);
  var direct = oLive && Math.abs(oT - now) < 6e4, etat = NU.jour ? 'Le Soleil ne se couche pas ici en ce moment' : oJour && oLive ? 'Il fait jour, voici la nuit qui vient' : oE.tw > 1 ? 'Ciel trop clair à cette heure' : oE.mo > 1 ? 'Lune gênante, ' + pct(oE.il) : 'Ciel bien noir';
  couvert = nu != null && nu > .8;
  $('o-w').innerHTML = '<b>' + (oLive ? direct ? 'En direct' : 'Ce soir' : oT < now ? 'Plus tôt' : 'À venir') + '</b> '
    + [nu > .7 && etat == 'Ciel bien noir' ? '' : etat, nu == null ? '' : nu > .7 ? '<strong>couvert à ' + pct(nu) + ', attends une éclaircie</strong>' : 'nuages ' + pct(nu)].filter(Boolean).join(' · ');
  $('o-in').innerHTML = INS.map(function (n, i) { return '<button type="button" data-i="' + i + '" class="' + (i == E.ins ? 'p' : '') + '"><svg viewBox="0 0 28 28" aria-hidden="true">' + ICONES[i] + '</svg><span>' + n + '<small>' + INS_S[i] + '</small></span><b>' + V[i].length + '</b></button>'; }).join('');
  segment('o-sk', E.ciel); segment('o-f', oFlt); $('o-now').className = oLive ? 'p' : ''; $('o-now').textContent = direct ? 'En direct' : refTemps() > now + 6e4 ? 'Début de nuit' : 'Maintenant';      /* de jour, ce bouton ramène au début de la nuit qui vient */ $('o-tr').value = Math.round((oT - NU.a) / (NU.b - NU.a) * 1000);
  function garde(o) { return !oFlt || o.g == oFlt; }
  cur.sort(function (a, b) { return interet(b) - interet(a); });
  if (!oChoisi && cur.length) oSel = cur[0].n;      /* tant qu'on n'a rien choisi, la fiche montre le plus beau du moment */
  cur.forEach(function (v) { vu[v.n] = 1; if (garde(OBJETS[v.n])) { c++; h += ligne(v.n, direction(v.p) + ', ' + Math.round(v.p.alt) + '°, ' + poings(v.p), difficulte(v, OBJETS[v.n])); } });
  OBJETS.forEach(function (o, n) {
    if (vu[n] || !garde(o)) return; var p = at(o, oT);
    if (p.alt < 5) { t = E.ins >= o.mi ? plusTard(o) : 0; if (t) { d++; plus.push([t, ligne(n, 'assez haut ' + direction(at(o, t)) + ' vers', hm(t), 1)]); } }
    else { e++; bas += ligne(n, pourquoi(o, p), '', 1); }
  });
  tard = plus.sort(function (p, q) { return p[0] - q[0]; }).map(function (x) { return x[1]; }).join('');      /* dans l'ordre où ils arrivent */
  function sec(t, n, x) { return n ? '<h2>' + t + '<span>' + n + '</span></h2>' + x : ''; }
  $('o-ls').innerHTML = (sec((couvert ? 'Derrière les nuages' : 'À voir') + (direct ? ' maintenant' : ' vers ' + hm(oT)), c, h) + sec('Plus tard cette nuit', d, tard) + sec('Hors de portée pour le moment', e, bas)) || '<p class="note">Rien dans cette famille ne passe au-dessus de l’horizon cette nuit, vu d’ici.</p>';
  $('o-pr').innerHTML = '<b>' + Object.keys(E.vus).length + '</b> / ' + OBJETS.length + '<small>observés</small>';
  for (i = 0; i <= 20; i++) { a = borne((pos('so', NU.a + (NU.b - NU.a) * i / 20).alt + 18) / 17); grad.push('rgb(' + (12 + 170 * a | 0) + ',' + (18 + 100 * a | 0) + ',' + (38 + 70 * a | 0) + ') ' + i * 5 + '%'); }
  $('o-tr').style.background = 'linear-gradient(90deg,' + grad + ')';
  for (h = '', t = heureRonde(NU.a + 36e5); t < NU.b - 36e5; t += (NU.b - NU.a) > 5e7 ? 108e5 : 72e5) h += '<span style="left:' + ((t - NU.a) / (NU.b - NU.a) * 100).toFixed(1) + '%">' + hh(t) + '</span>';
  $('o-tk').innerHTML = h;
  fiche(anime);
}
function fiche(anime) {
  var o = OBJETS[oSel], p = at(o, oT), m = mar(o, p, E.ins, oE, E.ciel), v = p.alt >= 5 && m >= 0, i, a, l = '', k = '', s, nu = nuages(oT);
  mag(o, p);
  $('o-n').textContent = o.n; $('o-q').innerHTML = GENRE[o.g] + '<b>' + (v ? difficulte({ p: p, m: m }, o) : p.alt < 5 ? 'sous l’horizon' : 'hors de portée') + '</b>';
  $('o-e').textContent = E.ins < o.mi || !o.d[E.ins] ? 'Invisible ' + (E.ins ? 'aux jumelles. ' : 'à l’œil nu. ') + ilFaut(Math.max(o.mi, E.ins + 1)) + '.' : (v || p.alt < 5 ? '' : pourquoi(o, p) + '. Sinon : ') + o.d[E.ins];
  for (i = 0; i <= 48; i++) { a = Math.max(0, at(o, NU.a + (NU.b - NU.a) * i / 48).alt); l += (i ? 'L' : 'M') + i * 5 + ' ' + (60 - a * .6).toFixed(1); }
  i = borne((oT - NU.a) / (NU.b - NU.a)) * 100; a = Math.max(0, p.alt);
  $('o-cu').innerHTML = '<svg viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true"><path class="ar" d="' + l + 'L240 60L0 60z"/><path class="li" d="' + l + '"/><path class="nl" d="M' + i * 2.4 + ' 0V60"/></svg><em style="left:' + i + '%;top:' + (60 - a * .6) / .64 + '%"></em><small>Sa hauteur au fil de la nuit</small>';
  for (i = 0; i < 36; i++) k += '<path d="M50 4v' + (i % 9 ? 3 : 7) + '" transform="rotate(' + i * 10 + ' 50 50)"/>';
  $('o-co').innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="gr">' + k + '</g><text x="50" y="23">N</text><text x="50" y="87">S</text><text x="83" y="55">E</text><text x="17" y="55">O</text><path class="ne" transform="rotate(' + p.az + ' 50 50)" d="M50 10 55 50 50 57 45 50z"/></svg><span>' + (p.alt > 0 ? direction(p).replace('-', '\u2011') : 'couché') + '<small>direction</small></span>';
  for (k = '', i = 0; i < 10; i++) { s = i % 3 ? 76 : 71; k += '<path d="M' + (10 + 80 * C(i * 10)) + ' ' + (90 - 80 * S(i * 10)) + 'L' + (10 + s * C(i * 10)) + ' ' + (90 - s * S(i * 10)) + '"/>'; }
  $('o-al').innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="gr">' + k + '<path d="M10 90H92"/></g><path class="nl" d="M10 90L' + (10 + 78 * C(a)) + ' ' + (90 - 78 * S(a)) + '"/><circle cx="' + (10 + 78 * C(a)) + '" cy="' + (90 - 78 * S(a)) + '" r="4.5"/></svg><span>' + Math.round(a) + '°<small>' + (p.alt > 0 ? poings(p) + ' de haut' : 'hauteur') + '</small></span>';
  s = E.vus[o.n]; $('o-sn').textContent = s ? 'Vu le ' + s : 'Je l’ai vu'; $('o-sn').className = s ? 'p' : '';
  $('o-vi').hidden = !capteur();
  $('o-no').textContent = 'Vue simulée' + (E.ins == 2 ? ' à l’endroit (un télescope la retourne)' : '') + (E.ins == 2 && o.k && o.k != 'lu' ? ', planètes à la même échelle entre elles' : '')
    + (nu == null ? '. Nuages non pris en compte.' : ', par ciel clair. Nuages à cette heure : ' + pct(nu) + '.');
  clearInterval(oTimer);
  if (!anime) return peindre(og, o, p, 1, E.ins, oT);
  var t = Date.now(); oTimer = setInterval(function () { var f = Math.min(1, (Date.now() - t) / 260); peindre(og, o, p, .8 + .2 * f, E.ins, oT); if (f == 1) clearInterval(oTimer); }, 30);
}
function ouvrirObjet(n) { oSel = n; oChoisi = 1; montrer('voir'); var s = document.querySelector('#o-ls .o.s'); if (s) s.scrollIntoView({ block: 'nearest' }); }

/* ============ viseur ============ */
var visOn = 0, visM = null, visRaf = 0;
function capteur() { return 'DeviceOrientationEvent' in window && window.matchMedia && matchMedia('(pointer:coarse)').matches; }
function orienter(e) {
  if (e.webkitCompassHeading != null) visM = { al: 360 - e.webkitCompassHeading, be: e.beta, ga: e.gamma, abs: 1 };
  else if (e.alpha != null) visM = { al: e.alpha, be: e.beta, ga: e.gamma, abs: e.absolute || e.type == 'deviceorientationabsolute' };
}
function viserOuvre() {
  function go() {
    visOn = 1; visM = null; $('vis').hidden = false;
    addEventListener('ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation', orienter);
    viserBoucle();
  }
  var D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission == 'function') D.requestPermission().then(function (r) { if (r == 'granted') go(); else bulle('Capteur de mouvement refusé.'); }).catch(function () { bulle('Capteur de mouvement indisponible.'); });
  else go();
}
function viserBoucle() {
  if (!visOn) return;
  var cv = $('vis-c'), w = cv.clientWidth, h = cv.clientHeight, k = Math.min(2, devicePixelRatio || 1), T = Date.now(), o = OBJETS[oSel];
  if (cv.width != w * k) { cv.width = w * k; cv.height = h * k; }
  var g = cv.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  if (!visM) { g.fillStyle = '#04121a'; g.fillRect(0, 0, w, h); $('vis-t').textContent = 'En attente de la boussole du téléphone… Lève-le vers le ciel.'; }
  else {
    var liste = [], cible = null;
    OBJETS.forEach(function (x, n) { var p = at(x, T); if (n == oSel) { cible = { n: x.n, c: x.c, p: p, gros: x.k == 'lu' }; liste.push(cible); } else if (p.alt > -5 && (x.g < 3 && (x.k ? !x.mi : x.m < 1.6))) liste.push({ n: x.n, c: x.c, p: p, gros: x.k == 'lu' }); });
    var r = viseur(g, w, h, visM, T, cible, liste);
    $('vis-t').textContent = (r.ok ? o.n + ' est dans le viseur.' : cible.p.alt < 0 ? o.n + ' est sous l’horizon en ce moment.' : 'Suis la flèche jusqu’à ' + o.n + '.') + ' Tu vises ' + direction(r.vis) + ', à ' + Math.round(r.vis.alt) + '°.' + (visM.abs ? '' : ' Boussole approximative sur ce téléphone.') + (window.screen && screen.orientation && screen.orientation.angle ? ' Tiens le téléphone droit, écran en hauteur.' : '');
  }
  visRaf = requestAnimationFrame(viserBoucle);
}
function viserFerme() { visOn = 0; cancelAnimationFrame(visRaf); removeEventListener('deviceorientationabsolute', orienter); removeEventListener('deviceorientation', orienter); $('vis').hidden = true; }

/* ============ écran « Jeux » ============ */
var PALIERS = [0, 50, 120, 220, 350, 520, 750, 1000], RANGS = ['Curieux', 'Guetteur', 'Veilleur', 'Chasseur d’étoiles', 'Éclaireur du ciel', 'Astronome amateur', 'Maître des nuits', 'Légende du ciel'];
/* défis : texte, points, condition (n nord, s sud, h Orion levé en soirée, e Altaïr levé en soirée, c ciel couvert, d ciel dégagé) */
var DEFIS = [
  ['Trouve la Grande Ourse, puis suis ses deux étoiles du bord jusqu’à la Polaire', 20, 'nd'], ['Repère Cassiopée, le grand W, à l’opposé de la Grande Ourse', 15, 'nd'],
  ['Trouve la Croix du Sud et ses deux étoiles pointeuses', 20, 'sd'], ['Loin des lumières, repère les deux Nuages de Magellan', 30, 'sdm'],
  ['Trouve la planète la plus brillante du ciel ce soir', 15, 'd'], ['Regarde la Lune deux minutes et repère une de ses mers sombres', 10, 'd'],
  ['Reste dix minutes dehors sans écran : compte les étoiles filantes', 25, 'd'], ['Montre une planète à quelqu’un qui ne l’avait jamais repérée', 30, 'd'],
  ['Photographie la Lune ou une planète avec ton téléphone', 20, 'd'], ['Repère un satellite : un point qui glisse sans clignoter', 25, 'd'],
  ['Trouve l’étoile la plus rouge du ciel', 20, 'd'], ['Tends le poing : mesure à combien de poings est la Lune ou une planète', 10, 'd'],
  ['Trouve Orion et sa ceinture de trois étoiles alignées', 15, 'hd'], ['Compte les étoiles des Pléiades : six ou sept ?', 20, 'hd'], ['Trouve Sirius, l’étoile la plus brillante, dans le prolongement de la ceinture d’Orion', 15, 'hd'],
  ['Trace le Triangle d’été : Véga, Deneb et Altaïr', 20, 'ned'], ['Loin des lampadaires, devine la Voie lactée au-dessus de toi', 30, 'edm'],
  ['Avec « Viser avec le téléphone », retrouve trois astres dans le ciel', 25, 'd'],
  ['Ciel couvert : fais un sans-faute au quiz éclair', 20, 'c'], ['Ciel couvert : pars en voyage express et trouve un ciel dégagé à plus de 80 %', 15, 'c'],
  ['Ciel couvert : sur la carte, lance la nuit et repère à quelle heure la Lune se lève', 10, 'c'], ['Ciel couvert : trouve dans les 30 prochaines nuits ta meilleure soirée, et note-la', 10, 'c']];
var QUIZ = [
  ['Quelle planète a les plus beaux anneaux ?', ['Mars', 'Saturne', 'Vénus'], 1, 'Saturne : ses anneaux se voient dans un petit télescope.'],
  ['Pourquoi les planètes ne scintillent-elles presque pas ?', ['Elles sont plus proches et montrent un petit disque', 'Elles sont plus chaudes', 'Elles tournent sur elles-mêmes'], 0, 'Une étoile est un point, que l’air fait trembler ; une planète est un disque minuscule, plus stable.'],
  ['Que voit-on de Jupiter avec de simples jumelles ?', ['Ses anneaux', 'Jusqu’à quatre lunes', 'La Grande Tache rouge'], 1, 'Io, Europe, Ganymède et Callisto, alignées de part et d’autre.'],
  ['L’étoile la plus brillante du ciel nocturne ?', ['La Polaire', 'Sirius', 'Véga'], 1, 'Sirius. La Polaire n’est que vers la cinquantième place.'],
  ['Combien de temps faut-il aux yeux pour bien s’habituer au noir ?', ['Deux minutes', 'Vingt à trente minutes', 'Deux heures'], 1, 'Et un seul coup d’œil à un écran blanc remet le compteur à zéro.'],
  ['Une étoile filante, c’est…', ['Une étoile qui tombe', 'Un grain de poussière qui brûle dans l’air', 'Un satellite'], 1, 'Souvent pas plus gros qu’un grain de sable, à plus de 100 000 km/h.'],
  ['La galaxie d’Andromède est à…', ['2,5 millions d’années-lumière', '2 500 années-lumière', '25 milliards d’années-lumière'], 0, 'C’est l’objet le plus lointain visible à l’œil nu.'],
  ['Quelle couleur de lampe préserve la vision de nuit ?', ['Bleue', 'Blanche', 'Rouge'], 2, 'Le rouge faible ne détruit pas l’adaptation des yeux.'],
  ['Quand la Lune gêne-t-elle le plus l’observation des galaxies ?', ['À la nouvelle lune', 'À la pleine lune', 'Jamais'], 1, 'Sa lumière noie tout ce qui est pâle.'],
  ['Dans l’hémisphère sud, que cherche-t-on pour trouver le sud ?', ['La Polaire', 'La Croix du Sud', 'Orion'], 1, 'Il n’existe pas d’étoile polaire brillante côté sud.'],
  ['Un poing tendu à bout de bras couvre environ…', ['1 degré', '10 degrés', '45 degrés'], 1, 'Et le petit doigt un degré, soit deux fois la Lune.'],
  ['Vénus se voit toujours…', ['En pleine nuit', 'Près du lever ou du coucher du Soleil', 'Seulement en été'], 1, 'Elle tourne plus près du Soleil que nous et ne s’en éloigne jamais beaucoup.'],
  ['Les Pléiades sont…', ['Une galaxie', 'Un amas de jeunes étoiles', 'Une nébuleuse planétaire'], 1, 'Un amas ouvert à environ 440 années-lumière.'],
  ['De quelle couleur est Bételgeuse ?', ['Bleue', 'Blanche', 'Orangée'], 2, 'C’est une supergéante rouge, en fin de vie.'],
  ['Que montre un télescope sur une étoile ?', ['Un disque', 'Toujours un point', 'Des anneaux'], 1, 'Même grossie 200 fois, une étoile reste un point.'],
  ['Quel type de nuages gêne le moins les étoiles brillantes ?', ['Les nuages bas', 'Les voiles hauts et fins', 'Le brouillard'], 1, 'Un voile d’altitude laisse passer les astres les plus brillants.'],
  ['La lumière de la Lune met combien de temps à nous parvenir ?', ['1,3 seconde', '8 minutes', '1 heure'], 0, 'Celle du Soleil met 8 minutes.'],
  ['Quelle planète est surnommée l’étoile du Berger ?', ['Jupiter', 'Vénus', 'Mercure'], 1, 'Vénus, l’astre le plus brillant après le Soleil et la Lune.']];
var VOYAGES = [['Désert d’Atacama', 'Chili', -24.63, -70.4, 'America/Santiago', 'dans le désert d’Atacama'], ['Mauna Kea', 'Hawaï', 19.82, -155.47, 'Pacific/Honolulu', 'au sommet du Mauna Kea'], ['Uluru', 'Australie', -25.34, 131.04, 'Australia/Darwin', 'à Uluru'],
  ['Tromsø', 'Norvège', 69.65, 18.96, 'Europe/Oslo', 'à Tromsø'], ['Pic du Midi', 'France', 42.94, .14, 'Europe/Paris', 'au pic du Midi'], ['Désert du Namib', 'Namibie', -24.75, 15.29, 'Africa/Windhoek', 'dans le désert du Namib'],
  ['Lac Tekapo', 'Nouvelle-Zélande', -44, 170.48, 'Pacific/Auckland', 'au lac Tekapo'], ['La Palma', 'Canaries', 28.76, -17.89, 'Atlantic/Canary', 'à La Palma']];
var VOEUX = ['Les Perséides filent à 59 kilomètres par seconde.', 'La plupart des étoiles filantes sont plus petites qu’un grain de riz.', 'Il tombe environ cent tonnes de poussière d’étoiles sur la Terre chaque jour.', 'Les Géminides viennent d’un astéroïde, pas d’une comète.', 'Une étoile filante s’allume vers 100 kilomètres d’altitude.', 'Par une nuit ordinaire, on en voit cinq à dix par heure sous un ciel bien noir.'];
var roule = 0, message = '', Q = null;
function niveau() { var i = 0; while (i < PALIERS.length - 1 && E.pts >= PALIERS[i + 1]) i++; return i; }
function gagner(n, quoi) {
  var l = niveau(), t = Date.now(); E.pts += n;
  if (E.dernier != cleJour(t)) E.serie = E.dernier == cleJour(t - 864e5) ? E.serie + 1 : 1; E.dernier = cleJour(t);
  sauver(); if (niveau() > l) { bulle('Niveau ' + (niveau() + 1) + ' : te voilà ' + RANGS[niveau()] + ' !'); feu(); } else if (quoi) bulle(quoi + ' : +' + n + ' points');
}
/* un point du ciel passe-t-il assez haut dans les sept premières heures de la nuit ? */
function leve(ra, de, mini) { for (var t = NU.a; t <= Math.min(NU.b, NU.a + 252e5); t += 18e5) if (pos('so', t).alt < -10 && hor(ra, de, t, hel('so', t / 864e5 - 10956)).alt > mini) return true; return false; }
function contexte() { var c = NUITS[0].c; return { n: L().lat >= 0, h: leve(88.8, 7.4, 15), e: leve(297.7, 8.9, 20), m: NUITS[0].il < .5, c: (c != null && c > .7) || !!NU.jour }; }
/* les défis réussis aujourd'hui : trois par jour au plus, jamais deux fois le même */
function faitJour() { var j = cleJour(Date.now()); if (E.fait.j != j) E.fait = { j: j, l: [] }; return E.fait.l; }
function defiTexte(d) { return NU.jour ? d[0].replace('Ciel couvert : ', 'Pas de nuit ici en ce moment : ') : d[0]; }
function defiOk(d, x) { var c = d[2]; return !(c.indexOf('n') >= 0 && !x.n) && !(c.indexOf('s') >= 0 && x.n) && !(c.indexOf('h') >= 0 && !x.h) && !(c.indexOf('e') >= 0 && !x.e) && !(c.indexOf('m') >= 0 && !x.m) && (c.indexOf('c') >= 0) == x.c; }
function insignes() {
  var v = Object.keys(E.vus), pl = 0, cp = 0; OBJETS.forEach(function (o) { if (E.vus[o.n]) { if (o.k && o.k != 'lu') pl++; if (o.g == 3) cp++; } });
  return [['Premier regard', 'Un astre observé', v.length >= 1], ['Chasseur de planètes', 'Cinq planètes observées', pl >= 5], ['Dix au compteur', 'Dix astres observés', v.length >= 10], ['Ciel profond', 'Cinq amas, nébuleuses ou galaxies', cp >= 5],
  ['Fidèle au poste', 'Trois soirs de suite', E.serie >= 3], ['Globe-trotter', 'Trois voyages express', Object.keys(E.voyages).length >= 3], ['Sans faute', 'Cinq sur cinq au quiz', E.sansFaute > 0], ['Cent points', 'Cent points gagnés', E.pts >= 100], ['Faiseur de vœux', 'Dix étoiles filantes', E.voeux >= 10]];
}
function jeux() {
  var l = niveau(), a = PALIERS[l], b = PALIERS[l + 1] || a, q = '', i, c = DEFIS[E.defi], fini = !c && faitJour().length >= 3, suite = fini ? 'Trois défis réussis aujourd’hui : la suite demain.' : '';
  $('g-lv').textContent = 'Niveau ' + (l + 1) + ', ' + RANGS[l];
  for (i = 0; i < 24; i++) q += '<i' + (b == a || (E.pts - a) / (b - a) * 24 > i ? ' class="y"' : '') + '></i>'; $('g-bar').innerHTML = q;
  $('g-xp').textContent = E.pts + ' point' + (E.pts > 1 ? 's' : '') + (b > a ? ' sur ' + b : '') + ', ' + E.nb + ' défi' + (E.nb > 1 ? 's' : '') + ' réussi' + (E.nb > 1 ? 's' : '');
  $('g-sr').textContent = E.serie > 1 ? 'Série : ' + E.serie + ' soirs' : '';
  if (!roule) { $('g-tx').textContent = message ? message + (suite ? ' ' + suite : '') : c ? defiTexte(c) : suite || (contexte().c ? (NU.jour ? 'Pas de nuit ici en ce moment' : 'Ciel couvert ' + ceSoir().toLowerCase()) + ' : il reste des missions à faire au chaud.' : 'Une petite mission à faire dehors, ' + ceSoir().toLowerCase() + '.'); $('g-pt').textContent = message ? '' : c ? '+' + c[1] + ' points' : ''; }
  $('g-ok').disabled = !c || !!roule; $('g-go').disabled = fini || !!roule;
  $('g-vl').innerHTML = VOYAGES.map(function (v, i) { return '<button type="button" data-i="' + i + '"' + (visite && visite.n == v[0] ? ' class="p"' : '') + '><b>' + v[0] + '</b><small>' + v[1] + (E.voyages[v[0]] ? ' · déjà vu' : '') + '</small></button>'; }).join('');
  $('g-bl').innerHTML = insignes().map(function (x) { return '<div class="' + (x[2] ? 'y' : '') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.100 4.700 1.400 6.800L12 17.200 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z"/></svg><span><b>' + x[0] + '</b><small>' + x[1] + '</small></span></div>'; }).join('');
  var n = Object.keys(E.vus).length; $('g-ac').textContent = n + ' sur ' + OBJETS.length + ' astres observés' + (n == OBJETS.length ? ' : album complet !' : '. Touche une vignette pour ouvrir sa fiche.');
  $('g-al').innerHTML = OBJETS.map(function (o, i) { var s = E.vus[o.n]; return '<button type="button" data-n="' + i + '" class="' + (s ? 'y' : '') + '"><em style="background:' + o.c + '"></em><b>' + o.n + '</b><small>' + (s ? 'vu le ' + s : ['œil nu', 'jumelles', 'télescope'][o.mi]) + '</small></button>'; }).join('');
  if (!Q) { $('q-q').textContent = 'Cinq questions sur le ciel. Cinq points par bonne réponse, quinze de plus pour un sans-faute. Chaque jour, seul ton meilleur score rapporte des points.'; $('q-r').innerHTML = ''; $('q-s').textContent = E.quiz ? 'Ton record : ' + E.quiz + ' sur 5' : ''; $('q-go').hidden = false; $('q-go').textContent = 'Lancer le quiz'; }
}
function quizSuite() {
  if (Q.i >= Q.l.length) {
    var n = Q.ok, j = cleJour(Date.now()), pts = n * 5 + (n == 5 ? 15 : 0), gain; E.quiz = Math.max(E.quiz, n); if (n == 5) E.sansFaute = 1;
    if (!E.quizJ || E.quizJ.j != j) E.quizJ = { j: j, p: 0 };
    gain = Math.max(0, pts - E.quizJ.p); E.quizJ.p = Math.max(E.quizJ.p, pts);       /* seul le meilleur score du jour rapporte */
    $('q-q').textContent = (n == 5 ? 'Sans-faute ! Cinq sur cinq.' : n + ' sur 5. ' + (n >= 3 ? 'Joli score.' : 'Le ciel garde encore des secrets.')) + (n && !gain ? ' Pas mieux que ton meilleur score du jour : pas de points en plus.' : ''); $('q-r').innerHTML = ''; $('q-s').textContent = '';
    Q = null; if (gain) gagner(gain, 'Quiz'); else sauver(); if (n == 5) feu();
    $('q-go').hidden = false; $('q-go').textContent = 'Rejouer'; var q = $('q-q').textContent; jeux(); $('q-q').textContent = q; $('q-go').textContent = 'Rejouer'; return;
  }
  var x = Q.l[Q.i]; Q.rep = -1;
  $('q-q').textContent = x[0]; $('q-s').textContent = 'Question ' + (Q.i + 1) + ' sur ' + Q.l.length; $('q-go').hidden = true;
  $('q-r').innerHTML = x[1].map(function (r, i) { return '<button type="button" data-i="' + i + '">' + r + '</button>'; }).join('');
}
/* plus grande hauteur d'un astre pendant la partie sombre de la nuit */
function sommet(k) { var m = -90, t, a; for (t = NU.a; t <= NU.b; t += 18e5) if (pos('so', t).alt < -6) { a = pos(k, t).alt; if (a > m) m = a; } return m; }
function quizQuestions() {
  var l = QUIZ.slice().sort(function () { return Math.random() - .5; }).slice(0, 4), now = Date.now(), a = lune(now), ph = Math.round(a.age / 90) % 4, haut = null, k, mx = {};
  for (k in PN) { mx[k] = sommet(k); if (mx[k] > 15 && (!haut || mx[k] > haut[1])) haut = [k, mx[k]]; }
  if (haut && Math.random() < .6) { var autres = Object.keys(PN).filter(function (x) { return x != haut[0] && mx[x] < haut[1] - 8; }).slice(0, 2); if (autres.length == 2) { var r = [haut[0]].concat(autres).sort(function () { return Math.random() - .5; }); l.push(['Laquelle de ces planètes monte le plus haut cette nuit, là où tu observes ?', r.map(function (x) { return PN[x]; }), r.indexOf(haut[0]), PN[haut[0]] + ' grimpe jusqu’à ' + Math.round(haut[1]) + '° pendant la nuit.']); } }
  if (l.length < 5) l.push(['En ce moment, la Lune est plutôt…', ['Nouvelle', a.age < 180 ? 'En premier quartier' : 'En dernier quartier', 'Pleine'], ph == 0 ? 0 : ph == 2 ? 2 : 1, 'Elle est éclairée à ' + pct(a.il) + ' ce soir.']);
  return l;
}

/* ============ effets ============ */
var fx, fxG, fxN = 0;
function toile() { fx = $('fx'); var k = Math.min(2, devicePixelRatio || 1); fx.width = innerWidth * k; fx.height = innerHeight * k; fxG = fx.getContext('2d'); fxG.setTransform(k, 0, 0, k, 0, 0); }
function calme() { return window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches; }
function feu() {
  if (calme()) return; toile(); var w = innerWidth, h = innerHeight, P = [], i, t = 0, moi = ++fxN;
  for (i = 0; i < 90; i++) { var a = Math.random() * 6.28, v = 2 + Math.random() * 7; P.push([w / 2, h * .45, Math.cos(a) * v, Math.sin(a) * v - 2, 1 + Math.random() * 3, i % 3]); }
  i = setInterval(function () { if (moi != fxN) return clearInterval(i); fxG.clearRect(0, 0, w, h); P.forEach(function (p) { p[0] += p[2]; p[1] += p[3]; p[3] += .15; fxG.fillStyle = 'rgba(' + ['255,143,90', '238,246,246', '142,195,200'][p[5]] + ',' + (1 - t / 50) + ')'; fxG.beginPath(); fxG.arc(p[0], p[1], p[4], 0, 7); fxG.fill(); }); if (++t > 50) { clearInterval(i); fxG.clearRect(0, 0, w, h); } }, 30);
}
function filante() {
  if (calme()) return; toile(); var w = innerWidth, h = innerHeight, x = w * (.15 + Math.random() * .4), y = h * (.08 + Math.random() * .2), dx = 9 + Math.random() * 6, dy = 4 + Math.random() * 4, t = 0, moi = ++fxN, i;
  i = setInterval(function () {
    if (moi != fxN) return clearInterval(i); fxG.clearRect(0, 0, w, h); var px = x + dx * t, py = y + dy * t, a = Math.min(1, (46 - t) / 12), gr = fxG.createLinearGradient(px, py, px - dx * 14, py - dy * 14);
    gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,200,150,0)'); fxG.strokeStyle = gr; fxG.lineWidth = 2.5; fxG.lineCap = 'round'; fxG.beginPath(); fxG.moveTo(px, py); fxG.lineTo(px - dx * 14, py - dy * 14); fxG.stroke();
    fxG.fillStyle = 'rgba(255,255,255,' + a + ')'; fxG.beginPath(); fxG.arc(px, py, 2.6, 0, 7); fxG.fill(); if (++t > 46) { clearInterval(i); fxG.clearRect(0, 0, w, h); }
  }, 22);
}
var bulleT;
function bulle(s) { var b = $('bulle'); b.textContent = s; b.hidden = false; clearTimeout(bulleT); bulleT = setTimeout(function () { b.hidden = true; }, 3200); }

/* ============ lieu ============ */
var veille = null;
function distance(a, b) { var x = (b.lon - a.lon) * C((a.lat + b.lat) / 2), y = b.lat - a.lat; return Math.hypot(x, y) * 111.2; }
function changerLieu() { fuseau(); cN = null; selN = 0; selH = 0; hChoisie = 0; oLive = 1; oChoisi = 0; RDV = []; recalcul(); tout(); meteo(); }
function memoriser(l) { E.lieux = [l].concat(E.lieux.filter(function (x) { return x.n != l.n; })).slice(0, 6); }
function choisir(l) { visite = null; E.lieu = l; if (!l.gps) { memoriser(l); E.suivi = 0; } E.accueil = 1; sauver(); suivre(); changerLieu(); feuille(0); bulle('Ciel réglé sur ' + l.n + '.'); }
function gpsRecu(p, silencieux) {
  var l = { n: 'Ma position', lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4), tz: '', gps: 1 };
  if (silencieux) { if (!E.lieu.gps || visite || distance(l, E.lieu) < 1) return; E.lieu = l; sauver(); changerLieu(); bulle('Position mise à jour.'); }
  else choisir(l);
}
function localiser() {
  if (!navigator.geolocation) { $('f-msg').textContent = 'Ce navigateur ne donne pas la position. Cherche ta ville juste en dessous.'; return; }
  $('f-msg').textContent = 'Recherche de ta position…';
  navigator.geolocation.getCurrentPosition(function (p) { $('f-msg').textContent = ''; gpsRecu(p); suivre(); }, function (e) {
    $('f-msg').textContent = e.code == 1 ? 'Position refusée. Autorise-la dans les réglages du site, ou cherche ta ville juste en dessous.' : 'Position introuvable pour le moment. Cherche ta ville juste en dessous.';
    if (E.suivi && !E.lieu.gps) { E.suivi = 0; sauver(); $('f-suivi').checked = false; }       /* rien n'est suivi : la case ne doit pas dire le contraire */
  }, { timeout: 20000, maximumAge: 3e5 });
}
function suivre() {
  if (veille != null) { navigator.geolocation.clearWatch(veille); veille = null; }
  if (E.suivi && E.lieu.gps && navigator.geolocation) veille = navigator.geolocation.watchPosition(function (p) { gpsRecu(p, 1); }, function () { }, { maximumAge: 6e4 });
}
function feuille(ouvre) {
  $('feuille').hidden = !ouvre; if (!ouvre) return;
  $('f-suivi').checked = !!E.suivi; $('f-msg').textContent = ''; $('f-res').innerHTML = '';
  $('f-ft').hidden = !E.lieux.length;
  $('f-fav').innerHTML = ''; E.lieux.forEach(function (l, i) { var b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.innerHTML = '<b></b><small></small>'; b.firstChild.textContent = l.n; b.lastChild.textContent = l.s || coord(l); $('f-fav').appendChild(b); });
}
function chercher(q) {
  $('f-msg').textContent = ''; $('f-res').innerHTML = '<p class="note">Recherche…</p>';
  fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=fr&format=json&name=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (j) {
    var R0 = j.results || []; $('f-res').innerHTML = R0.length ? '' : '<p class="note">Aucune ville trouvée sous ce nom.</p>';
    R0.forEach(function (v) {
      var b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<b></b><small></small>'; b.firstChild.textContent = v.name; b.lastChild.textContent = [v.admin1, v.country].filter(Boolean).join(', ');
      b.onclick = function () { choisir({ n: v.name, s: [v.admin1, v.country].filter(Boolean).join(', '), lat: +v.latitude.toFixed(4), lon: +v.longitude.toFixed(4), tz: v.timezone || '' }); };
      $('f-res').appendChild(b);
    });
  }).catch(function () { $('f-res').innerHTML = '<p class="note">Recherche impossible : pas de connexion.</p>'; });
}

/* ============ navigation et rafraîchissement ============ */
function montrer(p) {
  page = p; ['soir', 'carte', 'voir', 'jeux'].forEach(function (x) { $('p-' + x).hidden = x != p; });
  [].forEach.call($('onglets').children, function (b) { b.className = b.dataset.p == p ? 'p' : ''; });
  if (p != 'carte') carteStop();
  try { history.replaceState(null, '', p == 'soir' ? location.pathname + location.search : '#' + p); } catch (e) { }
  scrollTo(0, 0); tout();
}
function tout() { entete(); if (page == 'soir') soir(); else if (page == 'carte') carteOuvre(); else if (page == 'voir') voir(); else jeux(); }

/* ---------- gestes ---------- */
$('onglets').onclick = function (e) { var b = e.target.closest('button'); if (b) montrer(b.dataset.p); };
$('lieu-b').onclick = function () { feuille(1); };
$('f-x').onclick = function () { var premier = !E.accueil; E.accueil = 1; sauver(); feuille(0); if (premier) bulle('Lieu de départ : ' + E.lieu.n + '. Touche son nom, en haut, pour mettre le tien.'); };
$('feuille').onclick = function (e) { if (e.target == this) $('f-x').onclick(); };
$('f-gps').onclick = localiser;
$('f-suivi').onchange = function () { E.suivi = this.checked ? 1 : 0; sauver(); if (E.suivi && !E.lieu.gps) localiser(); else suivre(); entete(); };
$('f-form').onsubmit = function (e) { e.preventDefault(); var q = $('f-q').value.trim(); if (q.length > 1) chercher(q); else { $('f-msg').textContent = ''; $('f-res').innerHTML = '<p class="note">Tape au moins deux lettres du nom de ta ville.</p>'; } };
$('f-fav').onclick = function (e) { var b = e.target.closest('button'); if (b) choisir(E.lieux[+b.dataset.i]); };
$('visite-b').onclick = function () { visite = null; changerLieu(); bulle('De retour : ' + E.lieu.n + '.'); };
addEventListener('keydown', function (e) { if (e.key == 'Escape') { if (!$('vis').hidden) viserFerme(); else if (!$('feuille').hidden) $('f-x').onclick(); } });

$('heures').onclick = function (e) { var b = e.target.closest('.h'); if (b) { selH = +b.dataset.t; hChoisie = 1; heures(NUITS[selN].N); } };
$('v-carte').onclick = function () { var n = Date.now(); if (!selN && (NU.jour || (selH <= n && n < selH + 36e5))) { montrer('carte'); $('c-now').onclick(); } else allerCarte(selH); };
$('v-retour').onclick = function () { nuitSel(0); };
$('v-maj').onclick = function () { meteoEtat = 'attente'; soir(); meteo(1).then(function () { bulle(meteoEtat == 'ok' ? 'Météo à jour.' : 'Météo injoignable pour le moment.'); }); };
$('top').onclick = function (e) { var b = e.target.closest('.o'); if (b) ouvrirObjet(+b.dataset.n); };
$('top-plus').onclick = function () { montrer('voir'); };
function nuitSel(i) { selN = Math.max(0, Math.min(29, i)); selH = 0; hChoisie = 0; soir(); }
$('bars').onclick = function (e) { var b = e.target.closest('button'); if (b) nuitSel(+b.dataset.i); };
/* barres fines : on peut aussi glisser le doigt dessus, la sélection suit */
function glisse(el, cle) {
  var vu = null;
  el.addEventListener('pointermove', function (e) {
    if (e.pointerType == 'mouse' && !e.buttons) return; var b = document.elementFromPoint(e.clientX, e.clientY); b = b && b.closest('button');
    if (b && el.contains(b) && b.dataset[cle] != vu) { vu = b.dataset[cle]; b.click(); }
  });
  el.addEventListener('pointerdown', function () { vu = null; });
}
glisse($('heures'), 't'); glisse($('bars'), 'i');
$('b0').onclick = function () { nuitSel(0); }; $('bb').onclick = function () { nuitSel(meilleure); }; $('bp').onclick = function () { nuitSel(selN - 1); }; $('bn').onclick = function () { nuitSel(selN + 1); };

$('c-sl').oninput = function () { carteStop(); cLive = 0; cT = cA + this.value * 3e5; carteRend(); };
$('c-now').onclick = function () { carteStop(); cLive = 1; carteNuit(nuitDe(Date.now()), Date.now()); carteRend(); };
$('c-ls').onclick = function (e) { var c = e.target.closest('.c'); if (c) { cSel = cSel == c.dataset.k ? '' : c.dataset.k; carteRend(); } };
$('ciel').onclick = function (e) {
  var r = this.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 440, y = (e.clientY - r.top) / r.height * 440, m = 26, k, d, s = '';
  for (k in cPO) { d = Math.hypot(cPO[k][0] - x, cPO[k][1] - y); if (d < m) { m = d; s = k; } }
  cSel = s; carteRend();
};
$('c-play').onclick = function () {
  if (cTimer) return carteStop(); cLive = cAuto = 0; if (cT > cB - 6e5 || cT < cA) cT = cA; this.textContent = 'Pause';
  cTimer = setInterval(function () { cT += 3e5; if (cT > cB) { cT = cB; carteStop(); } carteRend(); }, 45);
};
$('c-bt').onclick = function (e) {
  var j = e.target.dataset.j, N, now = Date.now(); if (j == null) return;
  if (j == 0 && !NU.jour && now > NU.a && now < NU.b && pos('so', now).alt < -6) return $('c-now').onclick();      /* la nuit est en cours : on y est */
  carteStop(); cLive = 0; N = nuit(nuitDe(now).m + j * 864e5);
  carteNuit(N, N.d1 || (N.jour ? N.m + 432e5 : N.ss + 54e5)); carteRend();
};
$('c-pluie').onclick = function () { var p = prochainePluie(); if (!p) return; carteStop(); cLive = 0; carteNuit(nuit(midi(p[0])), p[0]); carteRend(); bulle(p[3] + '. ' + p[2]); };

$('o-in').onclick = function (e) { var b = e.target.closest('button'); if (b) { E.ins = +b.dataset.i; sauver(); voir(1); } };
function rang(e, b) { return [].indexOf.call(b.children, e.target); }
$('o-sk').onclick = function (e) { var i = rang(e, this); if (i >= 0) { E.ciel = i; sauver(); voir(); } };
$('o-f').onclick = function (e) { var i = rang(e, this); if (i >= 0) { oFlt = i; $('o-ls').scrollTop = 0; voir(); } };
$('o-tr').oninput = function () { oLive = 0; oT = NU.a + (NU.b - NU.a) * this.value / 1000; voir(); };
$('o-now').onclick = function () { oLive = 1; voir(); };
$('o-ls').onclick = function (e) { var b = e.target.closest('.o'); if (b) { oSel = +b.dataset.n; oChoisi = 1; voir(1); if (innerWidth < 700) $('o-fiche').scrollIntoView({ behavior: calme() ? 'auto' : 'smooth', block: 'start' }); } };
$('o-su').onclick = function () {
  var v = visibles(E.ins, oT, oE).filter(function (x) { return x.n != oSel && (!oFlt || OBJETS[x.n].g == oFlt); });
  if (!v.length) return bulle('Rien d’autre à portée à cette heure.');
  oSel = v[Math.floor(Math.random() * v.length)].n; oChoisi = 1; voir(1); var s = document.querySelector('#o-ls .o.s'); if (s && innerWidth >= 900) s.scrollIntoView({ block: 'nearest' });
};
$('o-sn').onclick = function () {
  var n = OBJETS[oSel].n;
  if (E.vus[n]) { delete E.vus[n]; sauver(); }
  else { E.vus[n] = new Date().toLocaleDateString('fr-FR'); filante(); if (E.acquis[n]) { sauver(); bulle(n + ' de retour dans l’album.'); } else { E.acquis[n] = 1; gagner(10, n + ' dans l’album'); } }      /* les points d'un astre ne se gagnent qu'une fois */
  voir();
};
$('o-vi').onclick = viserOuvre; $('vis-x').onclick = viserFerme;

$('g-go').onclick = function () {
  if (roule) return; var x = contexte(), ok = [], i, n = 0, fait = faitJour();
  if (fait.length >= 3 && !DEFIS[E.defi]) return;
  DEFIS.forEach(function (d, i) { if (i != E.defi && fait.indexOf(i) < 0 && defiOk(d, x)) ok.push(i); });
  if (!ok.length) return bulle('Pas d’autre défi possible ce soir.');
  roule = 1; message = ''; jeux(); $('g-pt').textContent = '';
  i = setInterval(function () { var p = ok[Math.floor(Math.random() * ok.length)]; $('g-tx').textContent = defiTexte(DEFIS[p]); if (++n > 13 || calme()) { clearInterval(i); roule = 0; E.defi = p; sauver(); jeux(); } }, 70);
};
$('g-ok').onclick = function () { var c = DEFIS[E.defi]; if (!c) return; faitJour().push(E.defi); E.nb++; E.defi = -1; message = 'Bien joué, +' + c[1] + ' points !'; gagner(c[1]); feu(); jeux(); };
$('q-go').onclick = function () { Q = { l: quizQuestions(), i: 0, ok: 0 }; quizSuite(); };
$('q-r').onclick = function (e) {
  var b = e.target.closest('button'); if (!b || !Q) return;
  if (b.dataset.suite) { Q.i++; return quizSuite(); }
  if (Q.rep >= 0) return; var x = Q.l[Q.i], i = +b.dataset.i; Q.rep = i; if (i == x[2]) Q.ok++;
  [].forEach.call(this.children, function (k, n) { k.disabled = true; k.className = n == x[2] ? 'bon' : n == i ? 'faux' : ''; });
  this.insertAdjacentHTML('beforeend', '<p>' + (i == x[2] ? 'Exact. ' : 'Raté. ') + x[3] + '</p><button type="button" class="p" data-suite="1">' + (Q.i == Q.l.length - 1 ? 'Voir mon score' : 'Question suivante') + '</button>');
};
$('g-vl').onclick = function (e) {
  var b = e.target.closest('button'); if (!b) return; var v = VOYAGES[+b.dataset.i];
  visite = { n: v[0], s: v[1], lat: v[2], lon: v[3], tz: v[4], ou: v[5] }; if (!E.voyages[v[0]]) { E.voyages[v[0]] = 1; gagner(5, 'Nouveau voyage'); }
  changerLieu(); montrer('soir');
};
$('g-vb').onclick = function () { filante(); E.voeux++; sauver(); $('g-vt').textContent = VOEUX[E.voeux % VOEUX.length]; if (E.voeux == 10) { bulle('Insigne gagné : Faiseur de vœux'); jeux(); } };
$('g-al').onclick = function (e) { var b = e.target.closest('button'); if (b) ouvrirObjet(+b.dataset.n); };

/* ---------- horloges ---------- */
setInterval(rebours, 1e3);
setInterval(function () {
  var now = Date.now(), n = nuitDe(now);
  if (n.m != NU.m) { recalcul(); if (page == 'soir') soir(); }            /* une nouvelle nuit commence : tout se recalcule */
  else if (Math.floor(now / 36e5) != heureVue) { recalcul(); if (!hChoisie) selH = 0; if (page == 'soir') soir(); }      /* l'heure a tourné : meilleur moment et heure en cours suivent */
  entete();
  if (page == 'carte') { if (cAuto && pos('so', now).alt < -6) { cAuto = 0; cLive = 1; } if (cLive) { if (now > cB) carteNuit(nuitDe(now)); cT = now; carteRend(); } }
  if (page == 'voir' && oLive) voir();
  if (page == 'soir') haut3();
}, 3e4);
setInterval(function () { if (document.visibilityState != 'hidden') meteo(); }, 18e5);
document.addEventListener('visibilitychange', function () { if (document.visibilityState == 'visible') { meteo(); tout(); } });
addEventListener('resize', function () { if (fx) toile(); });

/* ---------- typographie française : espace insécable avant : ; ! ? % et dans les guillemets, pour qu'aucun signe ne passe seul à la ligne ---------- */
var AVANT = new RegExp(' ([:;!?%»])', 'g'), APRES = new RegExp('« ', 'g');
function typo(racine) {
  var w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT), n, t, u;
  while ((n = w.nextNode())) { t = n.nodeValue; if (t.length < 2 || n.parentNode.nodeName == 'SCRIPT') continue; u = t.replace(AVANT, NB + '$1').replace(APRES, '«' + NB); if (u != t) n.nodeValue = u; }
}
if (window.MutationObserver) { var guet = new MutationObserver(function () { guet.disconnect(); typo(document.body); guet.observe(document.body, { childList: true, subtree: true, characterData: true }); }); guet.observe(document.body, { childList: true, subtree: true, characterData: true }); typo(document.body); }

/* ---------- démarrage ---------- */
fuseau(); recalcul();
(function () { var h = '', i; for (i = 0; i < 50; i++) h += '<path d="M75 6v' + (i % 5 ? 4 : 7) + '" class="' + (i % 5 ? '' : 'fort') + '" transform="rotate(' + i * 7.2 + ' 75 75)"/>'; $('j-grad').innerHTML = h; })();
var depart = (location.hash || '').slice(1);
montrer(['carte', 'voir', 'jeux'].indexOf(depart) >= 0 ? depart : 'soir');
meteo(); suivre();
window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (['carte', 'voir', 'jeux'].indexOf(h) < 0) h = 'soir'; if (h != page) montrer(h); });
if (!E.accueil) feuille(1);
if ('serviceWorker' in navigator && (location.protocol == 'https:' || location.hostname == 'localhost' || location.hostname == '127.0.0.1')) navigator.serviceWorker.register('sw.js').catch(function () { });
})();
