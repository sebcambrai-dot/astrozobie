/* Dessins : la vue simulée dans l'instrument, la carte du ciel, le viseur. Repris de l'observatoire de Noël, rendus indépendants du lieu. */
var POLICE = '"Segoe UI Variable Display","Segoe UI",Roboto,system-ui,sans-serif';
var CHAMP = [12, 6.5, 1.2];   /* largeur de la vue en degrés : œil nu, jumelles, télescope */
var ASTRES = [['lu', 'Lune', '#f4f1e4'], ['ve', 'Vénus', '#fff6c9'], ['ju', 'Jupiter', '#f3c98b'], ['sa', 'Saturne', '#e6d59a'], ['ma', 'Mars', '#ff8a5c'], ['me', 'Mercure', '#c9c9d6']];

/* ---------- vue dans l'instrument : toile de 340 unités de côté ---------- */
/* diamètre apparent des planètes, en secondes d'arc à une unité astronomique : au télescope, elles gardent leurs tailles relatives */
var DIA = { me: 6.74, ve: 16.92, ma: 9.36, ju: 196.9, sa: 165.6, ur: 70.5, ne: 68.3 };
function rayonTel(k, p) { return Math.max(2.6, Math.min(60, DIA[k] / (p.D || 1) * .8)); }
function peindre(g, o, p, z, ins, T) {
  var sd = o.n.length * 977 + o.n.charCodeAt(1) * 31, i, a, b, r, h, f, u = 340 / (CHAMP[ins] * 60), P2 = Math.PI * 2, W = '255,255,255', tel = ins == 2;
  function rnd() { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }
  function dot(x, y, q, c) { g.fillStyle = c || '#fff'; g.beginPath(); g.arc(x, y, q, 0, 7); g.fill(); }
  function grad(q, l) { var G = g.createRadialGradient(0, 0, 0, 0, 0, q); l.forEach(function (x) { G.addColorStop(x[0], 'rgba(' + x[1] + ')'); }); return G; }
  function blob(rx, ry, c, al, ro) { g.save(); g.rotate(ro || 0); g.scale(1, ry / rx); dot(0, 0, rx, grad(rx, [[0, c + ',' + al], [.35, c + ',' + al * .4], [1, c + ',0']])); g.restore(); }
  function limb(q) { dot(0, 0, q, grad(q, [[0, W + ',.12'], [.55, '0,0,0,.02'], [1, '0,0,0,.72']])); }
  function half(q, c, il, left) { g.save(); if (left) g.scale(-1, 1); g.fillStyle = c; g.beginPath(); g.arc(0, 0, q, -P2 / 4, P2 / 4); var k = 2 * il - 1; g.ellipse(0, 0, q * Math.abs(k), q, 0, P2 / 4, k > 0 ? P2 * .75 : -P2 / 4, k < 0); g.fill(); g.restore(); }
  function shade(q, il, left) { g.save(); g.beginPath(); g.arc(0, 0, q + .5, 0, 7); g.clip(); g.filter = 'blur(' + q / 7 + 'px)'; half(q + q / 30, 'rgba(3,8,14,.97)', 1 - il, !left); g.restore(); }
  function star(q, c) { g.shadowColor = c; g.shadowBlur = tel ? 26 : 14; dot(0, 0, q, c); dot(0, 0, q * .6); g.shadowBlur = 0; if (tel) for (i = 0; i < 4; i++) { g.save(); g.rotate(i * P2 / 4); g.fillStyle = grad(34, [[0, W + ',.5'], [1, W + ',0']]); g.fillRect(0, -.5, 34, 1); g.restore(); } }
  function spread(n, q, x, s, c) { for (; n--;) { a = rnd() * P2; b = q * Math.sqrt(rnd()) * (.35 + .65 * rnd()); dot(x + Math.cos(a) * b, Math.sin(a) * b, .5 + Math.pow(rnd(), 3) * s, c); } }
  g.clearRect(0, 0, 340, 340); g.save(); g.beginPath(); g.arc(170, 170, 168, 0, 7); g.clip(); g.fillStyle = ins ? '#02070b' : '#081c26'; g.fillRect(0, 0, 340, 340);
  g.translate(170, 170); g.scale(z, z);
  for (i = 0; i < [60, 150, 90][ins]; i++) dot(rnd() * 380 - 190, rnd() * 380 - 190, .25 + Math.pow(rnd(), 4) * 1.1, 'rgba(' + ['255,255,255', '205,222,255', '255,232,205'][i % 3] + ',' + (.2 + rnd() * .5) + ')');
  if (o.k && LAT < 0) g.rotate(Math.PI);   /* au sud de l'équateur, la Lune et les planètes se voient retournées */
  if (ins >= o.mi || o.ty == 'db') {
    if (o.k == 'lu') {
      r = [9, 16, 146][ins]; a = rev(p.lon - pos('so', T).lon); if (!tel) blob(r * 2.6, r * 2.6, W, .3); dot(0, 0, r, '#e9e5d8');
      g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.scale(r / 146, r / 146); g.filter = 'blur(' + r / 6 + 'px)'; g.beginPath();
      MER.forEach(function (q) { g.moveTo(q[0] + q[2], q[1]); g.ellipse(q[0], q[1], q[2], q[2] * .86, q[2], 0, 7); }); g.fillStyle = 'rgba(88,94,106,.6)'; g.fill(); g.filter = 'none';
      if (tel) {
        for (i = 0; i < 420; i++) { h = .5 + Math.pow(rnd(), 6) * 5.5; f = rnd() * P2; b = 146 * Math.sqrt(rnd()); g.save(); g.translate(Math.cos(f) * b, Math.sin(f) * b); g.scale(1 - .55 * Math.abs(Math.cos(f)) * b / 146, 1); dot(0, 0, h, 'rgba(110,110,112,.26)'); g.lineWidth = h / 3; g.strokeStyle = 'rgba(255,253,244,.4)'; g.beginPath(); g.arc(0, 0, h, P2 * .3, P2 * .75); g.stroke(); g.restore(); }
        g.save(); g.translate(-16, 108); g.filter = 'blur(4px)'; for (i = 0; i < 16; i++) { g.rotate(.4 + rnd() * .2); g.fillStyle = 'rgba(255,255,248,.22)'; g.fillRect(0, -1, 30 + rnd() * 80, 2); } dot(0, 0, 5, 'rgba(255,255,250,.75)'); g.restore();
      }
      g.restore(); shade(r, (1 - C(a)) / 2, a > 180);
    }
    else if (o.k == 'ju') {
      r = tel ? rayonTel('ju', p) : [2.8, 3.4][ins]; if (!tel) blob(14, 14, '243,203,139', .35); dot(0, 0, r, '#ecd3a6');
      if (tel) { g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.scale(r / 16, r / 16); JU.forEach(function (q) { g.fillStyle = q[2]; g.globalAlpha = .75; g.fillRect(-16, q[0], 32, q[1]); }); g.restore(); limb(r); }
      /* vue à l'endroit, nord en haut : l'ouest est à droite */
      if (ins) moons(T).forEach(function (q) { f = Math.abs(q); if (f > 1) dot((q > 0 ? 1 : -1) * (tel ? r + (f - 1) * 5 : f * 2.1), 0, tel ? 1.7 : 1, '#f4efe4'); });
    }
    else if (o.k == 'sa') {
      if (tel) {
        g.save(); r = rayonTel('sa', p) / 26; g.scale(r, r);
        f = Math.abs(S(ring(p))); h = function (a, b) { AN.forEach(function (q) { g.strokeStyle = q[1]; g.lineWidth = Math.max(.7, q[2] * Math.min(1, f * 3.2)); g.beginPath(); g.ellipse(0, 0, q[0], Math.max(.5, q[0] * f), 0, a, b); g.stroke(); }); }; h(Math.PI, P2);
        g.save(); g.scale(1, .92); g.beginPath(); g.arc(0, 0, 26, 0, 7); g.clip(); dot(0, 0, 26, '#e6d3a0'); SA.forEach(function (q) { g.fillStyle = q[2]; g.globalAlpha = .6; g.fillRect(-26, q[0], 52, q[1]); }); g.globalAlpha = 1; limb(26); g.restore(); h(0, Math.PI);
        g.restore();
      }
      else { blob(12, 12, '230,213,154', .35); g.fillStyle = o.c; g.beginPath(); g.ellipse(0, 0, ins ? 4 : 2.4, 2.4, 0, 0, 7); g.fill(); }
    }
    else if (o.k) {
      r = tel ? rayonTel(o.k, p) : o.mi ? 1.1 : o.k == 've' ? 3.4 : 2.1; if (!tel && !o.mi) blob(r * 5, r * 5, W, .28); dot(0, 0, r, o.c);
      if (tel) {
        if (o.k == 'ma') { g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip(); g.filter = 'blur(' + Math.max(1, r / 2.2) + 'px)'; g.scale(r / 15, r / 15); [[-5, 3, 5], [3, 5, 4], [6, -2, 3]].forEach(function (q) { dot(q[0], q[1], q[2], 'rgba(96,44,30,.6)'); }); g.restore(); }
        if (o.k == 'me' || o.k == 've') shade(r, p.il, rev(p.lon - pos('so', T).lon) > 180); else limb(r);
      }
    }
    else if (o.n == 'La Croix du Sud') {
      r = [16, 30, 150][ins]; g.shadowColor = '#cfe0ff'; g.shadowBlur = 10;
      [[.1, 1, 3.2, '#dfe9ff'], [-.1, -1, 2.6, '#ffb07a'], [-.75, -.15, 2.9, '#dfe9ff'], [.6, -.35, 2.2, '#dfe9ff'], [.25, .25, 1.3, '#fff']].forEach(function (q) { dot(q[0] * r, q[1] * r, q[2] * (ins ? 1.2 : 1), q[3]); }); g.shadowBlur = 0;
    }
    else if (o.ty == 'et') {
      star([2.6, 3.4, 4][ins] - Math.max(0, o.m) * .5, o.c);
      if (tel && o.n == 'Alpha du Centaure') { g.shadowBlur = 12; g.shadowColor = o.c; dot(11, -3, 2.6, '#ffe3a8'); g.shadowBlur = 0; }
    }
    else if (o.ty == 'db') { g.shadowBlur = 12; g.shadowColor = h = o.sp && o.n != 'Castor' ? '#ffc982' : '#fff'; dot(0, 0, tel ? 3.4 : 2.6, h); if (ins >= o.sp) dot(ins ? tel ? o.s > 5 ? 56 : o.s > .3 ? 26 : o.s > .1 ? 16 : 10 : o.s > 5 ? 11 : 5 : 3, tel ? -7 : -1, tel ? 2.4 : 1.7, o.c); if (tel && o.s > 5) dot(4, 6, 2, '#fff'); g.shadowBlur = 0; }
    else if (o.ty == 'ao') { r = Math.min(Math.max(o.s * u / 2, [6, 10, 46][ins]), 215); if (!ins && o.s < 100) blob(10, 10, '200,215,255', .6); else { g.shadowColor = o.c; g.shadowBlur = 5; if (o.n[0] == 'D' && ins) { h = tel ? 58 : 15; spread(tel ? 55 : 24, h * .8, -h, 1.9, o.c); spread(tel ? 48 : 20, h * .8, h, 1.7, o.c); } else spread([7, 38, 70][ins], r, 0, [1.3, 1.8, 2][ins], o.c); g.shadowBlur = 0; } }
    else if (o.ty == 'ag') { r = tel ? Math.max(o.s * u * .7, 36) : ins ? 9 : 5; blob(r, r, '220,226,245', .9); if (tel) for (i = 0; i < 190; i++) { a = rnd() * P2; b = r * Math.pow(rnd(), 1.5); dot(Math.cos(a) * b, Math.sin(a) * b, .35 + rnd() * .5, 'rgba(255,250,236,.75)'); } }
    else if (o.ty == 'ga') {
      r = Math.min(Math.max(o.s * u / 2, [10, 14, 30][ins]), 190); h = o.s == 150 ? .32 : .62;
      if (o.s >= 300) { blob(r, r * .7, '196,208,230', .45, .4); blob(r * .55, r * .2, '226,226,220', .5, .4); if (ins) spread(ins * 26, r * .9, 0, 1.2, '#fff'); }
      else { blob(r, r * h, '186,202,226', tel ? .42 : .5, -.6); blob(r * .3, r * .3 * Math.max(h, .6), '236,232,220', .75, -.6); if (o.s == 12 && tel) blob(7, 7, '200,210,226', .7); }
    }
    else if (o.ty == 'an') { g.filter = 'blur(5px)'; g.strokeStyle = 'rgba(176,214,208,.75)'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 16, 12.5, .5, 0, 7); g.stroke(); g.filter = 'none'; blob(13, 11, '150,190,190', .3); }
    else {
      r = Math.min(Math.max(o.s * u / 2, [7, 13, 30][ins]), 125); f = o.n.indexOf('Carène') > 0 ? '226,190,196' : '176,206,214';
      if (o.s == 7 && o.mi == 1) { blob(r, r * .6, f, .6, .6); blob(r * .6, r, f, .5, .6); }
      else { blob(r, r * .72, f, .6, .3); if (o.s >= 50 && ins) { g.save(); g.translate(r * .22, r * .3); blob(r * 1.15, r * .75, f, .4, .35); g.translate(-r * .5, -r * .05); blob(r * .8, r * .3, f, .35, -.9); g.restore(); [[-3, -2], [3, -3], [0, 3], [5, 3]].forEach(function (q) { dot(q[0] * (tel ? 1 : .5), q[1] * (tel ? 1 : .5), tel ? 1.5 : .8); }); } }
    }
  }
  g.restore(); dot(170, 170, 168, (h = g.createRadialGradient(170, 170, 132, 170, 170, 168), h.addColorStop(0, 'rgba(0,0,0,0)'), h.addColorStop(1, 'rgba(0,0,0,.8)'), h));
  g.strokeStyle = '#3d6a75'; for (i = 0; i < 120; i++) { a = i * P2 / 120; r = i % 10 ? i % 5 ? 165 : 163 : 159.5; g.lineWidth = i % 10 ? .6 : 1.1; g.beginPath(); g.moveTo(170 + 168 * Math.cos(a), 170 + 168 * Math.sin(a)); g.lineTo(170 + r * Math.cos(a), 170 + r * Math.sin(a)); g.stroke(); } g.lineWidth = 1.4; g.beginPath(); g.arc(170, 170, 168.5, 0, 7); g.stroke();
}

/* ---------- carte du ciel entier : toile de 440 unités, zénith au centre, nord en haut, est à gauche ---------- */
var FOND = (function () { var v = [], sd = 7, i; function rnd() { sd = (sd * 16807) % 2147483647; return sd / 2147483647; } for (i = 0; i < 420; i++) v.push([rnd() * 360, Math.asin(rnd() * 2 - 1) / R, rnd()]); return v; })();
function borne(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function versCarte(p) { var r = (90 - p.alt) / 90 * 200; return [220 - r * S(p.az), 220 - r * C(p.az)]; }

/* dessine la carte ; rend la position à l'écran des astres levés, pour les clics */
function carte(g, T, sel, nuages) {
  var bx = [], PO = {}, su = pos('so', T), s = hel('so', T / 864e5 - 10956), f = borne((su.alt + 12) / 18), a = borne((-su.alt - 4) / 8), q, p, x, i, gr, m;
  g.clearRect(0, 0, 440, 440);
  g.fillStyle = '#eef6f6'; g.font = '600 12px ' + POLICE; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', 220, 9); g.fillText('S', 220, 432); g.fillText('E', 9, 220); g.fillText('O', 431, 220);
  g.save(); g.beginPath(); g.arc(220, 220, 200, 0, 7); g.clip();
  gr = g.createRadialGradient(220, 220, 20, 220, 220, 200);
  gr.addColorStop(0, 'rgb(' + (3 + 50 * f | 0) + ',' + (12 + 110 * f | 0) + ',' + (20 + 165 * f | 0) + ')');
  gr.addColorStop(1, 'rgb(' + (13 + 110 * f | 0) + ',' + (48 + 130 * f | 0) + ',' + (62 + 160 * f | 0) + ')');
  g.fillStyle = gr; g.fillRect(0, 0, 440, 440);
  x = borne(1 - Math.abs(su.alt + 4) / 12);
  if (x) { q = versCarte({ alt: 0, az: su.az }); gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], 230); gr.addColorStop(0, 'rgba(255,150,70,' + .85 * x + ')'); gr.addColorStop(.5, 'rgba(200,80,120,' + .3 * x + ')'); gr.addColorStop(1, 'rgba(200,80,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 440, 440); }
  g.strokeStyle = 'rgba(255,255,255,.07)'; [67, 133].forEach(function (r) { g.beginPath(); g.arc(220, 220, r, 0, 7); g.stroke(); });
  function nom(n, q, r) {
    var m = g.measureText(n).width, x = q[0], y = q[1], z = [[x + r, y], [x - r - m, y], [x - m / 2, y - r - 5], [x - m / 2, y + r + 5]].filter(function (v) {
      return Math.hypot(v[0] - 220, v[1] - 220) < 193 && Math.hypot(v[0] + m - 220, v[1] - 220) < 193 && !bx.some(function (w) { return v[0] < w[0] + w[2] && w[0] < v[0] + m && Math.abs(v[1] - w[1]) < w[3]; });
    })[0];
    if (z) bx.push([z[0], z[1], m, 12]); return z;
  }
  x = a ? ETOILES.map(function (b) { p = hor(b[1] * 15, +b[2], T, s); return p.alt > 0 ? versCarte(p) : 0; }) : [];
  var PB = ASTRES.filter(function (b) { p = pos(b[0], T); if (p.alt <= 0) return 0; q = PO[b[0]] = versCarte(p); m = b[0] == 'lu' ? 13 : 6; bx.push([q[0] - m, q[1], 2 * m, m + 5]); return 1; });
  g.textAlign = 'left'; g.font = '600 12.5px ' + POLICE;
  PB.forEach(function (b) { q = PO[b[0]]; m = b[0] == 'lu' ? 16 : 9; q.v = nom(b[1], q, m) || (q[0] < 220 ? [q[0] + m, q[1]] : [q[0] - m - g.measureText(b[1]).width, q[1]]); });
  x.forEach(function (q) { if (q) bx.push([q[0] - 3, q[1], 6, 7]); });
  if (a) {
    g.fillStyle = 'rgba(255,255,255,' + .55 * a + ')'; FOND.forEach(function (b) { p = hor(b[0], b[1], T, s); if (p.alt > 0) { q = versCarte(p); g.fillRect(q[0], q[1], .6 + b[2], .6 + b[2]); } });
    g.strokeStyle = 'rgba(160,205,215,' + .38 * a + ')'; g.beginPath(); for (i = 0; i < TRAITS.length; i += 2) if (x[TRAITS[i]] && x[TRAITS[i + 1]]) { g.moveTo(x[TRAITS[i]][0], x[TRAITS[i]][1]); g.lineTo(x[TRAITS[i + 1]][0], x[TRAITS[i + 1]][1]); } g.stroke();
    g.font = '10.5px ' + POLICE; g.textAlign = 'left';
    x.forEach(function (q, i) { if (q) { g.fillStyle = 'rgba(255,255,255,' + a + ')'; g.beginPath(); g.arc(q[0], q[1], ETOILES[i][0] ? 1.9 : 1.4, 0, 7); g.fill(); if (ETOILES[i][0]) { g.fillStyle = 'rgba(165,195,202,' + .9 * a + ')'; m = nom(ETOILES[i][0], q, 6); if (m) g.fillText(ETOILES[i][0], m[0], m[1]); } } });
  }
  if (su.alt > 0) { q = versCarte(su); gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], 40); gr.addColorStop(0, '#fff'); gr.addColorStop(.2, '#ffe9a0'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(q[0] - 40, q[1] - 40, 80, 80); }
  g.font = '600 12.5px ' + POLICE; g.textAlign = 'left';
  ASTRES.forEach(function (b) {
    if (!PO[b[0]]) return; p = pos(b[0], T); q = PO[b[0]];
    if (sel == b[0]) { g.strokeStyle = '#ff8f5a'; g.lineWidth = 1.6; g.beginPath(); g.arc(q[0], q[1], 20, 0, 7); g.stroke(); g.lineWidth = 1; }
    if (b[0] == 'lu') {
      m = versCarte(su); x = C(p.lon - su.lon); g.save(); g.translate(q[0], q[1]); g.rotate(Math.atan2(m[1] - q[1], m[0] - q[0]));
      g.shadowColor = '#fff'; g.shadowBlur = 14; g.fillStyle = '#1c3640'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.shadowBlur = 0;
      g.fillStyle = b[2]; g.beginPath(); g.arc(0, 0, 11, -Math.PI / 2, Math.PI / 2); g.ellipse(0, 0, 11 * Math.abs(x), 11, 0, Math.PI / 2, x > 0 ? -Math.PI / 2 : Math.PI * 1.5, x > 0); g.fill(); g.restore();
    }
    else { g.shadowColor = b[2]; g.shadowBlur = 12; g.fillStyle = b[2]; g.beginPath(); g.arc(q[0], q[1], b[0] == 've' || b[0] == 'ju' ? 4.5 : 3.2, 0, 7); g.fill(); g.shadowBlur = 0; }
    g.fillStyle = f > .6 ? '#10203a' : '#fff'; m = q.v; g.fillText(b[1], m[0], m[1]);
  });
  /* voile de nuages, d'après la météo de cette heure-là */
  if (nuages > .05) {
    var sd = 11; g.fillStyle = 'rgba(150,165,172,' + .5 * nuages + ')'; g.fillRect(0, 0, 440, 440);
    g.filter = 'blur(14px)'; g.fillStyle = 'rgba(190,202,208,' + (.12 + .3 * nuages) + ')';
    for (i = 0; i < Math.round(nuages * 16); i++) { sd = (sd * 16807) % 2147483647; x = sd % 400 + 20; sd = (sd * 16807) % 2147483647; g.beginPath(); g.ellipse(x, sd % 400 + 20, 60 + sd % 50, 26 + sd % 20, 0, 0, 7); g.fill(); }
    g.filter = 'none';
  }
  g.restore(); g.strokeStyle = '#3d6a75';
  for (i = 0; i < 72; i++) { m = i * Math.PI / 36; x = i % 18 ? i % 6 ? 197 : 194 : 191; g.lineWidth = i % 6 ? .7 : 1.2; g.beginPath(); g.moveTo(220 + 200 * Math.cos(m), 220 + 200 * Math.sin(m)); g.lineTo(220 + x * Math.cos(m), 220 + x * Math.sin(m)); g.stroke(); }
  g.lineWidth = 1.5; g.beginPath(); g.arc(220, 220, 200.5, 0, 7); g.stroke(); g.lineWidth = 1;
  return PO;
}

/* ---------- viseur : le morceau de ciel vers lequel pointe le dos du téléphone ----------
   M : orientation du téléphone (alpha, beta, gamma, en degrés, alpha compté depuis le nord) ; rend la direction visée. */
function axes(al, be, ga) {
  var cA = C(al), sA = S(al), cB = C(be), sB = S(be), cG = C(ga), sG = S(ga);
  /* axes du téléphone dans le repère est / nord / haut */
  return { d: [cA * cG - sA * sB * sG, cG * sA + cA * sB * sG, -cB * sG], h: [-cB * sA, cA * cB, sB], v: [-(cG * sA * sB + cA * sG), -(sA * sG - cA * cG * sB), -cB * cG] };
}
function vecteur(p) { return [C(p.alt) * S(p.az), C(p.alt) * C(p.az), S(p.alt)]; }
function scal(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function viseur(g, w, h, M, T, cible, liste) {
  var A = axes(M.al, M.be, M.ga), F = Math.max(w, h) / (2 * Math.tan(30 * R)), vis = { alt: Math.asin(A.v[2]) / R, az: rev(Math.atan2(A.v[0], A.v[1]) / R) }, i, q, ok = 0;
  g.clearRect(0, 0, w, h); g.fillStyle = '#04121a'; g.fillRect(0, 0, w, h);
  function ecran(p) { var u = vecteur(p), z = scal(u, A.v); return z > .05 ? [w / 2 + scal(u, A.d) / z * F, h / 2 - scal(u, A.h) / z * F, z] : null; }
  /* horizon et points cardinaux */
  g.strokeStyle = '#3d6a75'; g.lineWidth = 1.5; g.beginPath(); var prem = 1;
  for (i = 0; i <= 360; i += 4) { q = ecran({ alt: 0, az: i }); if (q) { prem ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]); prem = 0; } else prem = 1; } g.stroke();
  g.font = '600 15px ' + POLICE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#8fabb0';
  ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'].forEach(function (n, k) { q = ecran({ alt: 2, az: k * 45 }); if (q) g.fillText(n, q[0], q[1]); });
  liste.forEach(function (o) {
    q = ecran(o.p); if (!q) return; var c = o === cible;
    g.fillStyle = o.c; g.shadowColor = o.c; g.shadowBlur = 10; g.beginPath(); g.arc(q[0], q[1], o.gros ? 9 : c ? 6 : 4, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = c ? '#ff8f5a' : '#eef6f6'; g.font = (c ? '700 ' : '600 ') + '14px ' + POLICE; g.fillText(o.n, q[0], q[1] - 18);
    if (c) { g.strokeStyle = '#ff8f5a'; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 26, 0, 7); g.stroke(); ok = Math.hypot(q[0] - w / 2, q[1] - h / 2) < 40; }
  });
  /* réticule */
  g.strokeStyle = ok ? '#ff8f5a' : 'rgba(238,246,246,.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7);
  g.moveTo(w / 2 - 56, h / 2); g.lineTo(w / 2 - 24, h / 2); g.moveTo(w / 2 + 24, h / 2); g.lineTo(w / 2 + 56, h / 2); g.moveTo(w / 2, h / 2 - 56); g.lineTo(w / 2, h / 2 - 24); g.moveTo(w / 2, h / 2 + 24); g.lineTo(w / 2, h / 2 + 56); g.stroke();
  /* flèche vers la cible quand elle est hors de l'écran */
  if (cible && !ok) {
    var u = vecteur(cible.p), dx = scal(u, A.d), dy = -scal(u, A.h), n = Math.hypot(dx, dy) || 1; q = ecran(cible.p);
    if (!q || q[0] < 30 || q[0] > w - 30 || q[1] < 30 || q[1] > h - 30) {
      g.save(); g.translate(w / 2, h / 2); g.rotate(Math.atan2(dy / n, dx / n)); g.fillStyle = '#ff8f5a'; g.beginPath(); g.moveTo(96, 0); g.lineTo(66, -15); g.lineTo(66, 15); g.closePath(); g.fill(); g.restore();
    }
  }
  return { vis: vis, ok: ok };
}

if (typeof module != 'undefined') module.exports = { axes: axes };
