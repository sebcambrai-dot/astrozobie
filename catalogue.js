/* Ce qu'il y a à voir : nom | type | ascension droite (h) | déclinaison (°) | éclat | pénalité de surface | taille (') | instrument minimum | couleur | œil nu | jumelles | télescope
   Types : planète (code de l'astre), et étoile, db double, ao amas ouvert, ag amas globulaire, ga galaxie, ne nébuleuse, an nébuleuse planétaire.
   Hémisphère nord : repris de l'observatoire de Noël (d3-celestial, OpenNGC). Hémisphère sud : ajouté le 26/11/2026, coordonnées de mémoire à 0,1° près. */
var CATALOGUE = [
'Lune|lu||||||0|#f4f1e4|Les mers sombres et la phase.|Les plus grands cratères, le long de l’ombre.|Des centaines de cratères et des montagnes.',
'Mercure|me|||||.1|0|#c9c9d6|Un point discret, bas sur l’horizon.|Un point plus facile à isoler.|Un disque minuscule, avec une phase.',
'Vénus|ve|||||.5|0|#fff6c9|Le point le plus éclatant du ciel.|Très vive ; son croissant quand elle est proche.|Sa phase, comme une petite Lune.',
'Mars|ma|||||.1|0|#ff8a5c|Un point orangé.|Un point orange bien net.|Un petit disque orange.',
'Jupiter|ju|||||.7|0|#f3c98b|Un point très brillant, qui ne scintille pas.|Jusqu’à quatre lunes, alignées de chaque côté.|Les bandes de nuages et les quatre lunes.',
'Saturne|sa|||||.3|0|#e6d59a|Un point jaune et calme.|Un point jaune un peu allongé.|Les anneaux, détachés ou en fine ligne.',
'Uranus|ur|||||.06|1|#a8e6e6||Un faible point, parmi les étoiles.|Un minuscule disque bleu-vert.',
'Neptune|ne2|||||.04|1|#7fa6ff||Un très faible point, carte en main.|Un point bleuté.',
'Sirius|et|6.752|-16.72|-1.44|0|0|0|#dfe9ff',
'Canopus|et|6.399|-52.7|-.74|0|0|0|#fff6e0|La deuxième étoile la plus brillante du ciel, invisible depuis l’Europe.|Un éclat blanc-jaune très pur.|Toujours un point : aucune étoile ne montre de disque.',
'Alpha du Centaure|et|14.66|-60.83|-.27|0|0|0|#fff0c2|Notre voisine : la plus proche étoile visible à l’œil nu.|Un point doré éclatant.|Deux soleils dorés, serrés l’un contre l’autre.',
'Arcturus|et|14.261|19.18|-.05|0|0|0|#ffc78a',
'Véga|et|18.616|38.78|.03|0|0|0|#dfe9ff',
'Capella|et|5.278|46|.08|0|0|0|#fff0c2',
'Rigel|et|5.242|-8.2|.13|0|0|0|#cfe0ff',
'Procyon|et|7.655|5.22|.34|0|0|0|#fff6e0',
'Bételgeuse|et|5.92|7.41|.45|0|0|0|#ff9d6b',
'Achernar|et|1.629|-57.24|.46|0|0|0|#cfe0ff',
'Altaïr|et|19.846|8.87|.76|0|0|0|#fff',
'Aldébaran|et|4.599|16.51|.87|0|0|0|#ffb07a',
'Antarès|et|16.49|-26.43|1.06|0|0|0|#ff8a5c|Le cœur rouge du Scorpion.|Sa couleur orangée saute aux yeux.|Toujours un point : aucune étoile ne montre de disque.',
'La Polaire|et|2.53|89.26|1.97|0|0|0|#fff6e0',
'La Croix du Sud|ao|12.45|-60|.8|0|360|0|#dfe9ff|Quatre étoiles en losange : la boussole du ciel austral.|La Croix remplit le champ, avec une étoile orangée en haut.|Trop large : on n’en voit qu’une étoile à la fois.',
'Mizar et Alcor|db|13.399|54.93|2.23|0|11.8|0|#fff|Deux étoiles côte à côte : un vieux test de vue.|Deux étoiles bien séparées.|Mizar se dédouble à son tour.',
'Albiréo|db|19.512|27.96|3.05|0|.58|1|#8fb4ff||Deux points serrés, jumelles bien calées.|Une étoile dorée et une bleue.',
'Almach|db|2.065|42.33|2.1|0|.16|2|#8fb4ff|||Une étoile orange et une bleue.',
'Castor|db|7.577|31.89|1.58|0|.08|2|#fff|||Deux étoiles blanches très serrées.',
'Les Pléiades|ao|3.791|24.11|1.2|.3|110|0|#cfe0ff|Six ou sept étoiles groupées.|Le plus beau choix : des dizaines d’étoiles bleues.|Trop large : on n’en voit qu’une partie.',
'La Crèche (M44)|ao|8.673|19.67|3.1|.9|95|0|#fff',
'Double amas de Persée|ao|2.345|57.13|3.7|.7|50|0|#fff',
'Amas de Ptolémée (M7)|ao|17.897|-34.79|3.3|.8|80|0|#fff',
'Pléiades du Sud|ao|10.716|-64.4|1.9|1|50|0|#cfe0ff',
'La Boîte à bijoux|ao|12.895|-60.37|4.2|.3|10|0|#ffd9a8|Une étoile un peu floue près de la Croix du Sud.|Un petit triangle d’étoiles serrées.|Des étoiles bleues et une rouge : un écrin de pierres.',
'Amas M35|ao|6.151|24.34|5.1|.5|26|1|#fff',
'Amas M37|ao|5.872|32.55|5.6|.5|16|1|#fff',
'Amas M11|ao|18.852|-6.27|5.8|.4|12|1|#fff',
'Oméga du Centaure|ag|13.447|-47.48|3.7|.6|36|0|#fff|Une étoile floue : le plus gros amas du ciel.|Une boule pâle, grande comme la Lune.|Des milliers d’étoiles en une boule serrée.',
'47 du Toucan|ag|.402|-72.08|4.1|.5|30|0|#fff|Une étoile floue à côté du Petit Nuage de Magellan.|Une boule brillante au cœur dense.|Un cœur éclatant entouré d’une poussière d’étoiles.',
'Grand amas d’Hercule (M13)|ag|16.695|36.46|5.8|.4|16|1|#fff',
'Amas M3|ag|13.703|28.38|6.39|.4|16|1|#fff',
'Amas M5|ag|15.309|2.08|5.95|.4|15|1|#fff',
'Amas M15|ag|21.5|12.17|6.3|.4|11|1|#fff',
'Grand Nuage de Magellan|ga|5.393|-69.76|.9|3.7|600|0|#dfe6f5|Un morceau de Voie lactée détaché : une galaxie voisine.|Des amas et des nébuleuses partout dans le champ.|Trop vaste : on s’y promène d’un amas à l’autre.',
'Petit Nuage de Magellan|ga|.877|-72.8|2.7|2.2|300|0|#dfe6f5|Une tache pâle, plus petite que sa grande sœur.|Un nuage allongé, piqué d’étoiles.|Trop vaste : on n’en voit qu’un morceau.',
'Galaxie d’Andromède|ga|.712|41.27|3.44|1.5|150|0|#fff',
'Galaxie du Triangle|ga|1.564|30.66|5.79|2.5|60|1|#fff',
'Galaxie de Bode (M81)|ga|9.926|69.07|6.92|1.3|20|1|#fff',
'Galaxie du Tourbillon (M51)|ga|13.498|47.2|8.36|1.7|12|2|#fff',
'Nébuleuse d’Orion|ne|5.588|-5.39|4|.2|50|0|#cfd8ee|Une étoile floue sous la ceinture d’Orion.|Un petit nuage autour de quelques étoiles.|Un éventail de gaz et quatre étoiles serrées au centre.',
'Nébuleuse de la Carène|ne|10.752|-59.87|1|3|120|0|#e8cfd0|Une tache claire dans la Voie lactée australe.|Un grand nuage coupé de bandes sombres.|Des draperies de gaz autour d’une étoile orangée.',
'Nébuleuse de la Lagune (M8)|ne|18.06|-24.38|5.8|.5|60|1|#cfd8ee',
'Nébuleuse de l’Haltère|ne|19.993|22.72|7.4|1.3|7|1|#cfe0dd',
'Nébuleuse de l’Anneau|an|18.893|33.03|8.8|1.5|1.3|2|#cfe0dd|||Un petit rond de fumée grise.',
'Nébuleuse du Crabe|ne|5.575|22.01|8.4|1.7|7|2|#d8d8e0'
];

/* textes par défaut, selon le type, pour œil nu, jumelles, télescope */
var TEXTES = {
  et: ['Un point brillant, facile à repérer.', 'Sa couleur ressort mieux.', 'Toujours un point : aucune étoile ne montre de disque.'],
  ao: ['Une petite tache floue.', 'Une poignée d’étoiles serrées.', 'Des dizaines d’étoiles, à faible grossissement.'],
  ag: ['', 'Une petite boule floue.', 'Une boule laiteuse, un peu granuleuse au bord.'],
  ga: ['Une tache pâle et allongée.', 'Un ovale gris et flou.', 'Un cœur plus clair dans un halo gris.'],
  ne: ['Une lueur floue.', 'Une petite tache grise.', 'Un voile gris dont la forme se devine.']
};

var OBJETS = CATALOGUE.map(function (s) {
  var p = s.split('|'), k = p[1], o = { n: p[0], ty: k, ra: +p[2] * 15, de: +p[3], m: +p[4], p: +p[5], s: +p[6], mi: +p[7], c: p[8] };
  if (!p[2]) o.k = k == 'ne2' ? 'ne' : k;
  o.d = p.length > 10 ? p.slice(9) : TEXTES[k];
  o.g = o.k ? 1 : k == 'et' || k == 'db' ? 2 : 3;   /* 1 système solaire, 2 étoiles, 3 ciel profond */
  /* une étoile double se voit à l'œil nu comme une seule étoile : « sp » est l'instrument qui la dédouble */
  if (k == 'db') { o.sp = o.mi; o.mi = 0; o.d = o.d.map(function (t, i) { return t || (i ? 'Aux jumelles' : 'À l’œil nu') + ', une seule étoile. Pour la voir double, il faut ' + (o.sp == 1 ? 'des jumelles' : 'un télescope') + '.'; }); }
  return o;
});

/* étoiles de la carte : nom, ascension droite (h), déclinaison (°) ; sans nom = simple point d'une figure */
var ETOILES = ('Sirius,6.75,-16.7;Arcturus,14.26,19.2;Véga,18.62,38.8;Capella,5.28,46;Rigel,5.24,-8.2;Procyon,7.65,5.2;Bételgeuse,5.92,7.4;Altaïr,19.85,8.9;Aldébaran,4.6,16.5;Spica,13.42,-11.2;Antarès,16.49,-26.4;Pollux,7.76,28;Fomalhaut,22.96,-29.6;Deneb,20.69,45.3;Régulus,10.14,12;Castor,7.58,31.9;Polaire,2.53,89.3;'
  + ',5.53,-.3;,5.6,-1.2;,5.68,-1.9;,5.42,6.3;,5.8,-9.7;'                                   /* 17-21 Orion */
  + ',11.06,61.8;,11.03,56.4;,11.9,53.7;,12.26,57;,12.9,56;,13.4,54.9;,13.79,49.3;'       /* 22-28 Grande Ourse */
  + ',.15,59.1;,.68,56.5;,.95,60.7;,1.43,60.2;,1.91,63.7;Pléiades,3.79,24.1;'              /* 29-33 Cassiopée, 34 */
  + 'Croix du Sud,12.44,-63.1;,12.52,-57.1;,12.8,-59.7;,12.25,-58.75;'                    /* 35-38 */
  + 'Alpha du Centaure,14.66,-60.8;,14.06,-60.4;Canopus,6.4,-52.7;Achernar,1.63,-57.2;'   /* 39-42 */
  + ',16.0,-22.6;,16.09,-19.8;,16.84,-34.3;,17.56,-37.1;,17.62,-43').split(';').map(function (s) { return s.split(','); }); /* 43-47 Scorpion */
/* traits des figures : paires d'indices dans ETOILES */
var TRAITS = [28, 27, 27, 26, 26, 25, 25, 24, 24, 23, 23, 22, 22, 25, 29, 30, 30, 31, 31, 32, 32, 33, 6, 20, 6, 19, 20, 17, 17, 18, 18, 19, 19, 21, 17, 4, 21, 4,
  35, 36, 37, 38, 43, 10, 44, 10, 10, 45, 45, 46, 46, 47];

/* dessins du télescope : mers de la Lune, bandes de Jupiter et de Saturne, anneaux */
var MER = [[-52, -48, 40], [-18, -62, 24], [26, -44, 29], [50, -10, 27], [84, -40, 15], [-80, 4, 42], [-60, 40, 30], [-28, 52, 24], [72, 18, 20]];
var JU = [[-16, 5, '#b99c78'], [-7.5, 3.6, '#9c6642'], [-2, 4, '#f6e6c6'], [4, 3.8, '#a8704a'], [10, 2, '#c9a67c'], [13, 4, '#b3977a']];
var SA = [[-20, 8, '#b79f70'], [-8, 5, '#cdb683'], [8, 5, '#c3aa78'], [16, 12, '#ab9467']];
var AN = [[58, '#8d7f62', 3], [52, '#dcc796', 6], [44, '#b9a578', 4]];

/* pluies d'étoiles filantes : mois, jour du maximum, nom, visible surtout dans quel hémisphère (0 partout, 1 nord, -1 sud).
   Les Quadrantides tombent le 3 ou le 4 janvier selon les sources. */
var PLUIES = [[1, 4, 'Quadrantides', 1], [4, 22, 'Lyrides', 0], [5, 6, 'Êta Aquarides', -1], [8, 13, 'Perséides', 1], [10, 22, 'Orionides', 0], [11, 17, 'Léonides', 0], [12, 14, 'Géminides', 0]];

if (typeof module != 'undefined') module.exports = { OBJETS: OBJETS };
