/* Données de physicien pour les fiches et l'onglet Télescope : nature des objets, planètes, étoiles brillantes,
   formules (masse d'air, éclat de surface). Distances et faits sourcés, objet par objet : distances.js. */

/* nature physique, par type d'objet ; distances.js la remplace quand un objet sort du cas général (M1, M78, M24…) */
var NATURE = {
  ag: 'Amas globulaire : des centaines de milliers d’étoiles parmi les plus vieilles de la Galaxie (plus de dix milliards d’années), liées par leur gravité, en orbite dans le halo de la Voie lactée.',
  ao: 'Amas ouvert : des dizaines à quelques milliers d’étoiles nées du même nuage, dans le disque de la Voie lactée ; les marées galactiques finissent par le disperser.',
  ga: 'Galaxie : des milliards d’étoiles, du gaz, de la poussière et de la matière noire, bien au-delà de la Voie lactée.',
  ne: 'Nébuleuse en émission : gaz ionisé par des étoiles jeunes et chaudes. L’œil, peu sensible au rouge de Hα (656 nm), voit surtout Hβ (486 nm) et [O III] (496 et 501 nm), d’où le gris ou le vert pâle à l’oculaire.',
  an: 'Nébuleuse planétaire : enveloppe éjectée par une étoile de type solaire en fin de vie, ionisée par le cœur restant, une future naine blanche très chaude. Elle rayonne surtout dans la raie interdite [O III] à 500,7 nm : un filtre O III la fait ressortir.',
  db: 'Étoile double : deux étoiles proches sur le ciel, liées par la gravité (binaire) ou simplement alignées (double optique).'
};

/* planètes et Lune : diamètre équatorial (km) et un trait physique. Valeurs : fiches planétaires de la NASA (nssdc.gsfc.nasa.gov/planetary/factsheet). */
var PLANETES = {
  lu: [3475, 'Rotation synchrone : elle nous montre toujours la même face, mais ses librations en dévoilent 59 %.'],
  me: [4879, 'Rotation (58,6 jours) et révolution (88 jours) en résonance 3:2.'],
  ve: [12104, 'Rotation rétrograde en 243 jours ; atmosphère à 96 % de CO₂, 92 bars et 464 °C au sol.'],
  ma: [6792, 'Olympus Mons culmine à environ 22 km au-dessus du niveau moyen martien.'],
  ju: [142984, 'Rotation en 9 h 56 min : son aplatissement (6,5 %) se voit à l’oculaire.'],
  sa: [120536, 'Masse volumique moyenne de 0,69 g/cm³, la plus faible du Système solaire ; aplatissement de 9,8 %.'],
  ur: [51118, 'Axe de rotation incliné de 98° : elle roule sur son orbite.'],
  ne: [49528, 'Trouvée en 1846 par le calcul (Le Verrier, à partir des écarts d’Uranus), puis vue au télescope par Galle.']
};

/* masse d'air : épaisseur d'atmosphère traversée, 1 au zénith (Kasten et Young, 1989) ; h : hauteur géométrique en degrés */
function masseAir(h) { return 1 / (Math.sin(h * Math.PI / 180) + .50572 * Math.pow(h + 6.07995, -1.6364)); }
/* éclat de surface moyen, en magnitudes par seconde d'arc carrée, pour une ellipse de a × b minutes d'arc */
function eclatSurface(m, a, b) { return m + 2.5 * Math.log(Math.PI / 4 * a * b * 3600) / Math.LN10; }

/* écriture des nombres et des angles, à la française */
function fr(x, n) { return x.toLocaleString('fr-FR', { minimumFractionDigits: n || 0, maximumFractionDigits: n || 0 }).replace(/^-/, '−'); }
function sexa(x, signe) {      /* x en heures (« 16 h 41 min 42 s ») ou en degrés (« +36° 27′ 41″ ») */
  var v = Math.round(Math.abs(x) * 3600), a = Math.floor(v / 3600), b = Math.floor(v / 60) % 60, c = v % 60;
  function z(n) { return ('0' + n).slice(-2); }
  return signe ? (x < 0 ? '−' : '+') + a + '° ' + z(b) + '′ ' + z(c) + '″' : a + ' h ' + z(b) + ' min ' + z(c) + ' s';
}
function dureeLumiere(s) { if (s < 90) return fr(s, 2) + ' s'; if (s >= 5400) return fr(s / 3600, 1) + ' h'; s = Math.round(s); return Math.floor(s / 60) + ' min ' + ('0' + s % 60).slice(-2) + ' s'; }
function arrondi(x) { var p = Math.pow(10, Math.floor(Math.log(x) / Math.LN10) - 1); return Math.round(x / p) * p; }      /* deux chiffres significatifs */
function anneesLumiere(al) { return al >= 1e6 ? fr(arrondi(al) / 1e6, al < 1e7 ? 1 : 0) + ' millions d’années-lumière' : al < 100 ? fr(al, 1) + (al < 2 ? ' année-lumière' : ' années-lumière') : fr(arrondi(al)) + ' années-lumière'; }
function ilYa(al) { return al >= 1e6 ? fr(arrondi(al) / 1e6, al < 1e7 ? 1 : 0) + ' millions d’années' : al < 100 ? fr(al, 1) + ' ans' : fr(arrondi(al)) + ' ans'; }

if (typeof module != 'undefined') module.exports = { masseAir: masseAir, eclatSurface: eclatSurface, sexa: sexa, fr: fr, dureeLumiere: dureeLumiere, anneesLumiere: anneesLumiere, ilYa: ilYa, NATURE: NATURE, PLANETES: PLANETES };
