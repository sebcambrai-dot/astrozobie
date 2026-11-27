/* Calculs du ciel, pour n'importe quel endroit de la Terre.
   Mêmes formules que l'observatoire de Noël (contrôlées auprès de JPL Horizons les 25 et 27/11/2026) ;
   seul le lieu n'est plus fixe : lieu(latitude, longitude). Temps en millisecondes Unix, angles en degrés.
   Planètes : éléments moyens et perturbations principales de la méthode de Paul Schlyter (« How to compute planetary positions »). */
var R = Math.PI / 180, LAT = 50.176, LON = 3.235;
function lieu(lat, lon) { LAT = lat; LON = lon; }
function S(x) { return Math.sin(x * R); }
function C(x) { return Math.cos(x * R); }
function rev(x) { return x - Math.floor(x / 360) * 360; }

/* éléments des orbites : N, dN, i, w, dw, a, e, M, dM */
var EL = {
  so: [0, 0, 0, 282.9404, 4.70935e-5, 1, .016709, 356.047, .9856002585],
  lu: [125.1228, -.0529538083, 5.1454, 318.0634, .1643573223, 60.2666, .0549, 115.3654, 13.0649929509],
  me: [48.3313, 3.24587e-5, 7.0047, 29.1241, 1.01444e-5, .387098, .205635, 168.6562, 4.0923344368],
  ve: [76.6799, 2.4659e-5, 3.3946, 54.891, 1.38374e-5, .72333, .006773, 48.0052, 1.6021302244],
  ma: [49.5574, 2.11081e-5, 1.8497, 286.5016, 2.92961e-5, 1.523688, .093405, 18.6021, .5240207766],
  ju: [100.4542, 2.76854e-5, 1.303, 273.8777, 1.64505e-5, 5.20256, .048498, 19.895, .0830853001],
  sa: [113.6634, 2.3898e-5, 2.4886, 339.3939, 2.97661e-5, 9.55475, .055546, 316.967, .0334442282],
  ur: [74.0005, 1.3978e-5, .7733, 96.6612, 3.0565e-5, 19.18171, .047318, 142.5905, .011725806],
  ne: [131.7806, 3.0173e-5, 1.77, 272.8461, -6.027e-6, 30.05826, .008606, 260.2471, .005995147]
};

function hel(k, d) {
  var p = EL[k], N = p[0] + p[1] * d, i = p[2], w = p[3] + p[4] * d, e = p[6], M = rev(p[7] + p[8] * d), E = M, j, x, y, r, l;
  for (j = 0; j < 8; j++) E -= (E - e / R * S(E) - M) / (1 - e * C(E));
  x = p[5] * (C(E) - e); y = p[5] * Math.sqrt(1 - e * e) * S(E); r = Math.hypot(x, y); l = Math.atan2(y, x) / R + w;
  x = C(N) * C(l) - S(N) * S(l) * C(i); y = S(N) * C(l) + C(N) * S(l) * C(i);
  return { lon: rev(Math.atan2(y, x) / R), lat: Math.asin(S(l) * S(i)) / R, r: r, M: M, L: rev(M + w + N) };
}

/* hauteur et azimut (0 = nord, 90 = est) d'un point du ciel ; mo : correction de parallaxe de la Lune */
function hor(ra, dec, t, s, mo) {
  var d = t / 864e5 - 10956, ha = rev(s.L + 180 + (d - Math.floor(d)) * 360 + LON) - ra,
    alt = Math.asin(S(LAT) * S(dec) + C(LAT) * C(dec) * C(ha)) / R,
    az = rev(Math.atan2(S(ha), C(ha) * S(LAT) - Math.tan(dec * R) * C(LAT)) / R + 180);
  if (mo) alt -= .95 * C(alt);
  return { alt: alt, az: az };
}

/* position d'un astre du système solaire : so, lu, me, ve, ma, ju, sa, ur, ne */
function pos(k, t) {
  var d = t / 864e5 - 10956, s = hel('so', d), b = k == 'so' ? s : hel(k, d), lon = b.lon, lat = b.lat, r = b.r, x, y, z, e, D, m, o;
  if (k == 'lu') {
    D = b.L - s.L;
    lon += -1.274 * S(b.M - 2 * D) + .658 * S(2 * D) - .186 * S(s.M) - .059 * S(2 * b.M - 2 * D) - .057 * S(b.M - 2 * D + s.M)
      + .053 * S(b.M + 2 * D) + .046 * S(2 * D - s.M) + .041 * S(b.M - s.M) - .035 * S(D) - .031 * S(b.M + s.M);
    lat -= .173 * S(b.L - EL.lu[0] - EL.lu[1] * d - 2 * D);
  }
  if (k == 'ju' || k == 'sa') {      /* la grande inégalité Jupiter-Saturne ; pour Saturne, les autres termes de Schlyter (écart à Horizons ramené de 0,12° à 0,05°) */
    var Mj = hel('ju', d).M, Ms = hel('sa', d).M; m = 2 * Mj - 5 * Ms - 67.6;
    if (k == 'ju') lon += -.332 * S(m);
    else { lon += .812 * S(m) - .229 * C(2 * Mj - 4 * Ms - 2) + .119 * S(Mj - 2 * Ms - 3) + .046 * S(2 * Mj - 6 * Ms - 69) + .014 * S(Mj - 3 * Ms + 32); lat += -.02 * C(2 * Mj - 4 * Ms - 2) + .018 * S(2 * Mj - 6 * Ms - 49); }
  }
  x = r * C(lon) * C(lat); y = r * S(lon) * C(lat); z = r * S(lat);
  if (k != 'so' && k != 'lu') { x += s.r * C(s.lon); y += s.r * S(s.lon); }
  e = 23.4393 - 3.563e-7 * d;
  var dd = Math.sqrt(x * x + y * y + z * z), be = Math.asin(z / dd) / R;
  m = y * C(e) - z * S(e);
  o = hor(Math.atan2(m, x) / R, Math.atan2(y * S(e) + z * C(e), Math.hypot(x, m)) / R, t, s, k == 'lu');
  o.lon = rev(Math.atan2(y, x) / R); o.be = be; o.D = dd; o.r = r; o.rs = s.r;
  return o;
}

/* hauteur du lever et du coucher : centre de l'astre à 0,57° sous l'horizon (réfraction), 0,83° pour le Soleil et la Lune (réfraction et demi-diamètre) */
function horizon(k) { return k == 'so' || k == 'lu' ? -.833 : -.57; }

/* précession : coordonnées J2000 (degrés) ramenées à l'équinoxe de l'instant t (méthode rigoureuse de Meeus, Astronomical Algorithms, chap. 21) */
function precesse(ra, de, t) {
  var T = (t / 864e5 - 10957.5) / 36525, z1 = (2306.2181 + (.30188 + .017998 * T) * T) * T / 3600, z = (2306.2181 + (1.09468 + .018203 * T) * T) * T / 3600, th = (2004.3109 - (.42665 + .041833 * T) * T) * T / 3600,
    A = C(de) * S(ra + z1), B = C(th) * C(de) * C(ra + z1) - S(th) * S(de), D = S(th) * C(de) * C(ra + z1) + C(th) * S(de);
  return [rev(Math.atan2(A, B) / R + z), Math.asin(Math.max(-1, Math.min(1, D))) / R];
}

/* premier instant après « from » où l'astre franchit la hauteur h (dir 1 en montant, -1 en descendant) */
function cross(k, from, h, dir, hrs) {
  var a = pos(k, from).alt - h, b, i, n = hrs * 12;
  for (i = 1; i <= n; i++) { b = pos(k, from + i * 3e5).alt - h; if (a * dir < 0 && b * dir >= 0) return from + (i - 1 + a / (a - b)) * 3e5; a = b; }
  return 0;
}

/* fraction éclairée de la Lune, de 0 à 1, et son âge en degrés (0 nouvelle, 180 pleine) */
function lune(t) { var a = rev(pos('lu', t).lon - pos('so', t).lon); return { age: a, il: (1 - C(a)) / 2 }; }

/* midi solaire du lieu : début de la « journée de nuit » qui contient t */
function midi(t) { var dec = LON / 15 * 36e5; return Math.floor((t + dec - 432e5) / 864e5) * 864e5 + 432e5 - dec; }

/* la nuit qui va d'un midi solaire au suivant.
   ss, sr : coucher et lever du Soleil ; d1, d2 : début et fin de la nuit noire (Soleil sous -18°), 0 s'il n'y en a pas ;
   jour : le Soleil ne se couche pas ; polaire : il ne se lève pas. */
function nuit(m) {
  var N = { m: m, ss: 0, sr: 0, d1: 0, d2: 0, jour: 0, polaire: 0 }, i, a, b, t, pas = 3e5;
  function seuil(h) {
    var deb = 0, fin = 0, a0 = pos('so', m).alt - h;
    a = a0;
    for (i = 1; i <= 288; i++) {
      t = m + i * pas; b = pos('so', t).alt - h;
      if (!deb && a >= 0 && b < 0) deb = t - pas + a / (a - b) * pas;
      else if (deb && !fin && a < 0 && b >= 0) fin = t - pas + a / (a - b) * pas;
      a = b;
    }
    if (!deb && a0 < 0) { deb = m; fin = m + 864e5; return [deb, fin, 1]; }
    if (deb && !fin) fin = m + 864e5;
    return [deb, fin, 0];
  }
  a = seuil(-.833); N.ss = a[0]; N.sr = a[1]; N.polaire = a[2]; N.jour = a[0] ? 0 : 1;
  if (!N.jour) { a = seuil(-18); N.d1 = a[0]; N.d2 = a[1]; }
  /* bornes pratiques pour les curseurs : toute la journée quand le Soleil ne se couche pas */
  N.a = N.jour ? m : N.ss; N.b = N.jour ? m + 864e5 : N.sr;
  return N;
}

/* la nuit « de ce soir » : celle en cours, ou la prochaine si le Soleil est déjà relevé */
function nuitDe(t) { var m = midi(t), N = nuit(m); if (!N.jour && t > N.sr) N = nuit(m + 864e5); return N; }

/* lunes de Jupiter, en rayons de Jupiter, positif vers l'ouest (Meeus) */
function moons(t) {
  var d = t / 864e5 + 2440587.5 - 2451545, V = 172.74 + .00111588 * d, M = 357.529 + .9856003 * d, N = 20.02 + .0830853 * d + .329 * S(V),
    J = 66.115 + .9025179 * d - .329 * S(V), A = 1.915 * S(M) + .02 * S(2 * M), B = 5.555 * S(N) + .168 * S(2 * N), K = J + A - B,
    Rs = 1.00014 - .01671 * C(M), r = 5.20872 - .25208 * C(N) - .00611 * C(2 * N), D = Math.sqrt(r * r + Rs * Rs - 2 * r * Rs * C(K)),
    ps = Math.asin(Rs / D * S(K)) / R, q = d - D / 173,
    u = [163.8069 + 203.4058646 * q, 358.414 + 101.2916335 * q, 5.7176 + 50.234518 * q, 224.8092 + 21.48798 * q].map(function (x) { return x + ps - B; }),
    G = 331.18 + 50.310482 * q, H = 87.45 + 21.569231 * q, a = 2 * (u[0] - u[1]), b = 2 * (u[1] - u[2]);
  u[0] += .473 * S(a); u[1] += 1.065 * S(b); u[2] += .165 * S(G); u[3] += .843 * S(H);
  return [(5.9057 - .0244 * C(a)) * S(u[0]), (9.3966 - .0882 * C(b)) * S(u[1]), (14.9883 - .0216 * C(G)) * S(u[2]), (26.3627 - .1939 * C(H)) * S(u[3])];
}

/* inclinaison des anneaux de Saturne vus de la Terre */
function ring(p) { return Math.asin(S(p.be) * C(28.06) - C(p.be) * S(28.06) * S(p.lon - 169.51)) / R; }

/* éclat (magnitude) d'un objet du catalogue ; p : sa position */
function mag(o, p) {
  if (!o.k) return o.m;
  if (o.k == 'lu') return -12;
  var i = Math.acos(Math.max(-1, Math.min(1, (p.r * p.r + p.D * p.D - p.rs * p.rs) / (2 * p.r * p.D)))) / R, l = 5 * Math.log(p.r * p.D) / Math.LN10;
  p.il = (1 + C(i)) / 2;
  return l + {
    /* Schlyter ; Vénus et Jupiter : Mallama et Hilton (2018), plus proches des éphémérides */
    me: -.36 + .027 * i + 2.2e-13 * Math.pow(i, 6), ve: -4.384 + i * (-1.044e-3 + i * (3.687e-4 + i * (-2.814e-6 + i * 8.938e-9))), ma: -1.51 + .016 * i, ju: -9.395 + i * (-3.7e-4 + i * 6.16e-4),
    sa: -9 + .044 * i - 2.6 * Math.abs(S(ring(p))) + 1.2 * Math.pow(S(ring(p)), 2), ur: -7.15, ne: -6.95
  }[o.k];
}

/* position d'un objet du catalogue (planète ou point fixe) */
function at(o, t) { return o.k ? pos(o.k, t) : hor(o.ra, o.de, t, hel('so', t / 864e5 - 10956)); }

/* état du ciel à l'instant t : hauteur du Soleil, Lune, gêne de la Lune et du crépuscule (en magnitudes) */
function env(t) {
  var s = pos('so', t), l = pos('lu', t), il = (1 - C(l.lon - s.lon)) / 2;
  return { su: s.alt, il: il, lu: l.alt, mo: l.alt > 0 ? 2.2 * Math.pow(il, 1.5) * Math.min(1, l.alt / 25 + .3) : 0, tw: Math.max(0, s.alt + 18) * .35 };
}

var GA = [0, 3.5, 5.5], BA = [4.3, 5.3, 6.2], LUNE_CIEL = [.4, .7, 1];      /* la Lune gêne moins un ciel de ville, déjà clair (estimation de l'appli) */
/* gain du télescope sur l'œil nu, en magnitudes : 5,5 pour 114 mm, puis 5 × log du rapport des diamètres (la lumière captée croît comme la surface).
   Estimation de l'appli : l'œil, le ciel et l'expérience comptent autant que le diamètre. */
function gainTel(D) { return 5.5 + 5 * Math.log(D / 114) / Math.LN10; }
/* marge : positive si l'objet est à la portée de l'instrument i (0 œil nu, 1 jumelles, 2 télescope) sous un ciel de qualité q (0 ville, 1 village, 2 campagne) */
function mar(o, p, i, e, q, nomo, notw) {
  if (i < o.mi) return -9;
  if (!notw && o.g == 3 && e.su > -11) return -9;       /* amas, nébuleuses et galaxies : rien tant que le crépuscule n'est pas bien avancé */
  var a = Math.max(p.alt, 3), f = o.ty == 'ga' || o.ty == 'ne' || o.ty == 'an' ? 1.4 : 1,
    pe = (o.p || 0) * (o.sb > 22 ? [1.6, 1.25, 1][q] : 1);      /* un objet de très faible éclat de surface (au-delà de 22 mag par seconde d'arc carrée) se noie davantage dans un ciel clair */
  return BA[q] + GA[i] - (nomo ? 0 : e.mo * f * LUNE_CIEL[q]) - (notw ? 0 : e.tw * f) - .2 * (1 / S(a) - 1) - mag(o, p) - pe;
}

if (typeof module != 'undefined') module.exports = { lieu: lieu, pos: pos, hor: hor, hel: hel, cross: cross, lune: lune, midi: midi, nuit: nuit, nuitDe: nuitDe, moons: moons, mag: mag, at: at, env: env, mar: mar, gainTel: gainTel, GA: GA, BA: BA, ring: ring, rev: rev, S: S, C: C, precesse: precesse, horizon: horizon };
