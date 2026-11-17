// ===== Dictionnaire intégré pour la version gratuite (sans IA) =====
// 1. LEXIQUE : mots scolaires difficiles et leur explication simple (affichés dans « 💡 Mots expliqués »).
// 2. MOTS_SIMPLES : mots ou tournures compliqués remplacés par des équivalents simples.
// Tu peux ajouter tes propres mots ici, ou directement dans chaque leçon.

const LEXIQUE = {
  // Mots expliqués dans toutes les matières
  general: {
  // --- Sciences ---
  "évaporation": "l'eau chauffée devient de la vapeur",
  "condensation": "la vapeur refroidit et redevient de petites gouttes d'eau",
  "précipitation": "l'eau qui tombe du ciel : pluie, neige ou grêle",
  "vapeur": "de l'eau devenue un gaz invisible",
  "photosynthèse": "la plante fabrique sa nourriture avec la lumière du soleil",
  "oxygène": "le gaz de l'air dont nous avons besoin pour vivre",
  "dioxyde de carbone": "le gaz que nous rejetons en respirant",
  "respiration": "faire entrer l'air dans le corps puis le faire sortir",
  "inspiration": "faire entrer l'air dans les poumons",
  "expiration": "faire sortir l'air des poumons",
  "organe": "une partie du corps qui a un travail précis (cœur, poumons…)",
  "cellule": "la plus petite partie d'un être vivant",
  "digestion": "transformer les aliments pour que le corps puisse les utiliser",
  "nutriment": "ce que le corps garde des aliments pour vivre",
  "vertébré": "un animal qui a une colonne vertébrale",
  "invertébré": "un animal sans colonne vertébrale",
  "mammifère": "un animal dont la femelle allaite ses petits",
  "herbivore": "un animal qui mange des plantes",
  "carnivore": "un animal qui mange de la viande",
  "omnivore": "qui mange de tout : plantes et viande",
  "écosystème": "un milieu naturel et tous les êtres vivants qui y vivent",
  "espèce": "un groupe d'êtres vivants qui se ressemblent et peuvent avoir des petits ensemble",
  "germination": "le moment où la graine commence à pousser",
  "pollinisation": "le transport du pollen d'une fleur à une autre",
  "solide": "un état de la matière qui garde sa forme",
  "liquide": "un état de la matière qui coule et prend la forme du récipient",
  "gaz": "un état de la matière qui s'étale partout et souvent invisible",
  "fusion": "passer de l'état solide à l'état liquide (la glace fond)",
  "solidification": "passer de l'état liquide à l'état solide (l'eau gèle)",
  "molécule": "un tout petit assemblage d'atomes",
  "atome": "la plus petite brique qui compose la matière",
  "mélange": "plusieurs matières mises ensemble",
  "dissoudre": "faire disparaître un solide dans un liquide (le sucre dans l'eau)",
  "énergie": "ce qui permet de bouger, chauffer, éclairer ou faire fonctionner",
  "circuit": "un chemin fermé où passe le courant électrique",
  "conducteur": "une matière qui laisse passer le courant électrique",
  "isolant": "une matière qui ne laisse pas passer le courant électrique",
  "gravité": "la force qui attire les objets vers le sol",
  "hypothèse": "une idée qu'on propose et qu'on va vérifier",
  "température": "la mesure du chaud ou du froid",
  "climat": "le temps qu'il fait d'habitude dans une région",
  "nappe souterraine": "de l'eau cachée sous la terre",

  // --- Histoire / Géographie / Éducation civique ---
  "continent": "une très grande étendue de terre (l'Afrique, l'Europe…)",
  "océan": "une très grande étendue d'eau salée",
  "frontière": "la limite entre deux pays",
  "capitale": "la ville la plus importante d'un pays, où siège le gouvernement",
  "population": "l'ensemble des habitants d'un lieu",
  "altitude": "la hauteur d'un lieu par rapport à la mer",
  "relief": "la forme du sol : montagnes, plaines, vallées",
  "agriculture": "le travail de la terre et l'élevage des animaux",
  "industrie": "les usines qui fabriquent des produits",
  "commerce": "acheter et vendre des marchandises",
  "exportation": "vendre des produits à un autre pays",
  "importation": "acheter des produits à un autre pays",
  "colonie": "un territoire dirigé par un pays étranger",
  "colonisation": "quand un pays prend le contrôle d'un autre territoire",
  "indépendance": "quand un pays se dirige lui-même",
  "protectorat": "un pays dirigé en partie par un pays étranger",
  "révolution": "un grand changement, souvent brutal, dans un pays",
  "monarchie": "un pays dirigé par un roi ou une reine",
  "république": "un pays dirigé par des personnes élues",
  "démocratie": "un système où le peuple choisit ses dirigeants",
  "constitution": "le texte qui fixe les règles les plus importantes d'un pays",
  "citoyen": "une personne qui fait partie d'un pays, avec des droits et des devoirs",
  "parlement": "le groupe de personnes élues qui votent les lois",
  "empire": "un ensemble de territoires dirigés par un empereur ou un sultan",
  "dynastie": "une suite de rois de la même famille",
  "siècle": "une période de 100 ans",
  "millénaire": "une période de 1000 ans",
  "préhistoire": "la période avant l'invention de l'écriture",
  "antiquité": "la période qui commence avec l'invention de l'écriture",
  "député": "une personne élue pour voter les lois",
  "abolir": "supprimer",
  "aboli": "supprimé"
  },

  // Mots expliqués seulement en sciences (ils ont un autre sens ailleurs)
  sciences: {
  "matière": "tout ce qui a une masse et prend de la place",
  "expérience": "un test pour vérifier une idée"
  },

  // --- Français (grammaire) ---
  langue: {
  "verbe": "le mot qui dit l'action (courir, manger…)",
  "sujet": "qui fait l'action du verbe",
  "complément": "un groupe de mots qui donne une précision",
  "adjectif": "un mot qui décrit le nom (grand, rouge…)",
  "adverbe": "un mot invariable qui précise le verbe (vite, souvent…)",
  "synonyme": "un mot qui a le même sens qu'un autre",
  "antonyme": "un mot de sens contraire",
  "préfixe": "un morceau ajouté au début d'un mot (re-, in-…)",
  "suffixe": "un morceau ajouté à la fin d'un mot (-ment, -eur…)",
  "infinitif": "le verbe non conjugué (manger, finir…)",
  "participe passé": "la forme du verbe utilisée après « avoir » ou « être » (mangé, fini…)",
  "pronom": "un mot qui remplace un nom (il, elle, ils…)",
  "déterminant": "le petit mot devant le nom (le, une, mon…)",
  "conjugaison": "les différentes formes d'un verbe selon la personne et le temps"
  },

  // --- Mathématiques ---
  maths: {
  "périmètre": "la longueur du tour d'une figure",
  "aire": "la surface à l'intérieur d'une figure",
  "diamètre": "la ligne qui traverse le cercle en passant par le centre",
  "rayon": "la distance entre le centre et le bord du cercle",
  "fraction": "une partie d'un tout (1/2 = une moitié)",
  "numérateur": "le nombre du haut d'une fraction",
  "dénominateur": "le nombre du bas d'une fraction",
  "multiple": "le résultat d'une table de multiplication (12 est un multiple de 3)",
  "diviseur": "un nombre qui divise un autre sans reste",
  "quotient": "le résultat d'une division",
  "produit": "le résultat d'une multiplication",
  "somme": "le résultat d'une addition",
  "différence": "le résultat d'une soustraction",
  "parallèle": "des droites qui ne se croisent jamais",
  "perpendiculaire": "des droites qui se croisent en formant un angle droit",
  "angle droit": "un angle comme le coin d'une feuille",
  "symétrie": "quand une figure a deux moitiés pareilles, comme dans un miroir",
  "volume": "la place occupée par un objet",
  "masse": "ce que pèse un objet"
  }
};

// Quelles parties du dictionnaire utiliser pour chaque matière
const LEXIQUE_PAR_MATIERE = {
  "Sciences": ["sciences"], "SVT": ["sciences"], "Physique-Chimie": ["sciences", "maths"],
  "Français": ["langue"], "Arabe": ["langue"], "Anglais": ["langue"],
  "Mathématiques": ["maths"]
};

// Remplacements de mots compliqués par des mots simples (primaire et collège).
// [mot ou expression à remplacer, remplacement]
const MOTS_SIMPLES = [
  ["cependant", "mais"], ["toutefois", "mais"], ["néanmoins", "mais"], ["pourtant", "mais"],
  ["par conséquent", "donc"], ["c'est pourquoi", "donc"], ["en conséquence", "donc"],
  ["afin de", "pour"], ["afin que", "pour que"], ["en vue de", "pour"],
  ["lorsqu'", "quand "], ["lorsque", "quand"], ["dès que", "quand"],
  ["puisque", "comme"], ["étant donné que", "comme"], ["en raison de", "à cause de"],
  ["auparavant", "avant"], ["désormais", "maintenant"], ["actuellement", "aujourd'hui"],
  ["notamment", "surtout"], ["davantage", "plus"], ["également", "aussi"], ["par ailleurs", "aussi"],
  ["en outre", "aussi"], ["de surcroît", "en plus"], ["environ", "à peu près"],
  ["fréquemment", "souvent"], ["rapidement", "vite"], ["immédiatement", "tout de suite"],
  ["afin", "pour"], ["parvenir à", "réussir à"], ["parviennent à", "réussissent à"], ["parvient à", "réussit à"],
  ["effectuer", "faire"], ["effectue", "fait"], ["effectuent", "font"],
  ["posséder", "avoir"], ["possède", "a"], ["possèdent", "ont"],
  ["permettre de", "servir à"], ["permet de", "sert à"], ["permettent de", "servent à"],
  ["se situe", "se trouve"], ["se situent", "se trouvent"], ["est situé", "se trouve"], ["est située", "se trouve"],
  ["constituer", "former"], ["constitue", "forme"], ["constituent", "forment"],
  ["s'avère", "est"], ["s'avèrent", "sont"], ["demeure", "reste"], ["demeurent", "restent"],
  ["en effet, ", ""], ["ainsi, ", "donc, "]
];
