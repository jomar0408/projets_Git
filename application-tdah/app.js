// ===== Leçons Faciles — application d'aide aux leçons pour élèves TDAH =====
// 1. On ajoute une leçon (texte collé ou photo).
// 2. La leçon est reformulée et découpée en petits morceaux adaptés au niveau.
// 3. Des schémas résument la leçon.
// 4. Un petit quiz fait gagner des étoiles.
// L'IA (Claude) est facultative : sans clé, tout fonctionne avec une version automatique plus simple.
// Les données restent dans le navigateur (localStorage).

// ---------- Réglages par niveau ----------
const NIVEAUX = {
  primaire: { nom: "Primaire", max: 160, minutes: 5, quiz: 3, motsParPhrase: 10, motsSimples: true, listes: true,
    info: "Morceaux d'une ou deux phrases, pause toutes les 5 minutes, quiz de 3 questions." },
  college: { nom: "Collège", max: 300, minutes: 10, quiz: 4, motsParPhrase: 14, motsSimples: true, listes: true,
    info: "Morceaux courts, pause toutes les 10 minutes, quiz de 4 questions." },
  lycee: { nom: "Lycée", max: 500, minutes: 15, quiz: 5, motsParPhrase: 18, motsSimples: false, listes: true,
    info: "Morceaux moyens, pause toutes les 15 minutes, quiz de 5 questions." },
  adulte: { nom: "Adulte", max: 700, minutes: 20, quiz: 6, motsParPhrase: 22, motsSimples: false, listes: false,
    info: "Morceaux plus longs, pause toutes les 20 minutes, quiz de 6 questions." }
};
const DUREE_PAUSE = 2 * 60;
const URL_TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

const MOTS_VIDES = new Set(("alors aussi autre autres avant avec avoir beaucoup cette ceux chaque comme comment " +
  "dans depuis donc elle elles entre encore être fait faire leur leurs mais même moins notre nous parce pendant " +
  "peut plus pour pourquoi quand quelque quelques sans selon sont sous suivant très tous tout toute toutes " +
  "trouve votre vous ainsi après enfin ensuite lorsque puisque contre certains certaines plusieurs souvent " +
  "toujours jamais peuvent devient deviennent permet grâce celui celle appelle commence recommencer alors")
  .split(" "));

// ---------- Stockage ----------
function charger(cle, defaut) {
  try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; }
  catch (e) { return defaut; }
}
function sauver(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) {}
}

let niveau = charger("lf_niveau", "primaire");
let reglages = Object.assign(
  { lisible: false, grand: false, sombre: false, son: true, vitesse: 0.9, cle: "", modele: "claude-haiku-5-5", cleOcr: "", typeEcriture: "imprime" },
  charger("lf_reglages", {}));
let lecons = charger("lf_lecons", null);

if (!lecons) {
  lecons = [{
    id: 1,
    titre: "Le cycle de l'eau",
    matiere: "Sciences",
    texte: "L'eau de la Terre se déplace sans arrêt. On appelle ce voyage le cycle de l'eau.\n\n" +
      "Le soleil chauffe l'eau des mers, des lacs et des rivières. Cette eau se transforme en vapeur et monte dans le ciel : c'est l'évaporation.\n\n" +
      "En montant, la vapeur se refroidit. Elle forme de minuscules gouttes qui se regroupent en nuages : c'est la condensation.\n\n" +
      "Quand les gouttes deviennent trop lourdes, elles tombent sous forme de pluie, de neige ou de grêle : ce sont les précipitations.\n\n" +
      "L'eau tombée rejoint les rivières, les nappes souterraines puis la mer. Le cycle peut alors recommencer.",
    mots: ["cycle de l'eau", "évaporation", "vapeur", "condensation", "nuages", "précipitations"],
    questions: [
      { q: "Qu'est-ce qui chauffe l'eau des mers ?", r: "Le soleil" },
      { q: "Comment appelle-t-on la pluie, la neige et la grêle ?", r: "Les précipitations" }
    ],
    etoiles: 0,
    ia: {}
  }];
  sauver("lf_lecons", lecons);
}

// ---------- Utilitaires ----------
const $ = id => document.getElementById(id);

function el(tag, props = {}, enfants = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  enfants.forEach(c => e.append(c));
  return e;
}

function echapper(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function melanger(tab) {
  const a = [...tab];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normaliser(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function regexMot(mot) {
  const m = mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}])(${m})(?![\\p{L}])`, "giu");
}

const estArabe = t => /[؀-ۿ]/.test(t);

function raccourcir(t, max) {
  t = t.trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  return coupe.slice(0, coupe.lastIndexOf(" ") > 20 ? coupe.lastIndexOf(" ") : max).replace(/[,;:\s]+$/, "") + "…";
}

function majuscule(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

function toast(message, duree = 3200) {
  const t = el("div", { className: "toast", textContent: message });
  document.body.append(t);
  setTimeout(() => t.remove(), duree);
}

function son(bon) {
  if (!reglages.son) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    (bon ? [660, 880] : [300]).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.25);
    });
  } catch (e) {}
}

// ---------- Lecture à voix haute ----------
function parler(texte) {
  texte = texteParle(texte);
  if (!("speechSynthesis" in window)) { toast("La lecture à voix haute n'est pas disponible sur ce navigateur."); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  const langue = estArabe(texte) ? "ar" : "fr";
  u.lang = langue === "ar" ? "ar-SA" : "fr-FR";
  u.rate = reglages.vitesse;
  const voix = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith(langue));
  if (voix) u.voice = voix;
  speechSynthesis.speak(u);
}
function silence() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }

// ========== IA (Claude) ==========
const iaActive = () => !!(reglages.cle && reglages.cle.trim());

async function appelerClaude(contenu, maxTokens = 4000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": reglages.cle.trim(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: reglages.modele, max_tokens: maxTokens, messages: [{ role: "user", content: contenu }] })
  });
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).error.message; } catch (e) {}
    if (r.status === 401) throw new Error("Clé API refusée. Vérifie-la dans les réglages.");
    throw new Error(`Erreur IA (${r.status}) ${detail}`);
  }
  const d = await r.json();
  return d.content.map(c => c.text || "").join("");
}

function extraireJSON(texte) {
  const debut = texte.indexOf("{"), fin = texte.lastIndexOf("}");
  if (debut < 0 || fin < 0) throw new Error("Réponse de l'IA illisible.");
  return JSON.parse(texte.slice(debut, fin + 1));
}

async function preparerAvecIA(lecon) {
  const n = NIVEAUX[niveau];
  const consigne = `Tu aides un élève qui a un TDAH. Son niveau : ${n.nom}.
Voici une leçon (matière : ${lecon.matiere}, titre : « ${lecon.titre} »).

<lecon>
${lecon.texte}
</lecon>

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, de cette forme :
{
  "morceaux": [ { "original": "extrait de la leçon", "simple": "reformulation" } ],
  "mots": ["mot important", "..."],
  "questions": [ { "q": "question courte", "r": "réponse courte" } ],
  "schemas": [ ... ]
}

Règles :
- Découpe la leçon dans l'ordre en morceaux d'environ ${n.max} caractères. "original" = le passage exact de la leçon. Tout le texte doit être couvert.
- "simple" = le même contenu reformulé pour le niveau ${n.nom} : phrases courtes (${n.motsParPhrase} mots maximum), une idée par phrase, mots simples, explique les mots difficiles entre parenthèses. Ne retire aucune information importante et n'invente rien. Garde la langue de la leçon.
- "mots" : 5 à 8 mots ou expressions clés, écrits exactement comme dans tes reformulations.
- "questions" : ${n.quiz} questions pour vérifier la compréhension, réponses en quelques mots.
- "schemas" : 1 ou 2 schémas qui expliquent le mieux la leçon, avec un emoji parlant par élément. Formats possibles :
  { "type": "etapes", "titre": "...", "elements": [ { "emoji": "☀️", "texte": "..." } ] }   (une suite d'étapes dans l'ordre)
  { "type": "cycle", "titre": "...", "elements": [ { "emoji": "...", "texte": "..." } ] }    (étapes qui recommencent)
  { "type": "carte", "titre": "...", "centre": "idée principale", "branches": [ { "emoji": "...", "titre": "...", "texte": "..." } ] }   (carte mentale)
  { "type": "comparaison", "titre": "...", "colonnes": ["", "A", "B"], "lignes": [ ["critère", "...", "..."] ] }
  Textes des schémas : très courts (12 mots maximum par élément).`;

  const json = extraireJSON(await appelerClaude(consigne, 6000));
  if (!Array.isArray(json.morceaux) || json.morceaux.length === 0) throw new Error("L'IA n'a pas renvoyé de morceaux.");
  return {
    morceaux: json.morceaux.filter(m => m && (m.simple || m.original))
      .map(m => ({ original: String(m.original || ""), simple: String(m.simple || m.original) })),
    mots: (json.mots || []).map(String).filter(Boolean),
    questions: (json.questions || []).filter(q => q && q.q && q.r).map(q => ({ q: String(q.q), r: String(q.r) })),
    schemas: Array.isArray(json.schemas) ? json.schemas : [],
    source: "ia"
  };
}

async function lireImageAvecIA(dataURL, langue) {
  const data = dataURL.split(",")[1];
  const texte = await appelerClaude([
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
    { type: "text", text: `Recopie exactement le texte de cette leçon (langue attendue : ${langue}). ` +
      "Garde les paragraphes et les titres. Ignore les numéros de page et les éléments décoratifs. " +
      "Si l'image contient un schéma, décris-le en une phrase entre crochets. Réponds seulement avec le texte." }
  ], 4000);
  return texte.trim();
}

// ========== VERSION AUTOMATIQUE (sans IA) ==========
function decouperPhrases(texte) {
  const res = texte.match(/[^.!?…؟]+(?:[.!?…؟]+["»)]*|$)/g) || [];
  return res.map(p => p.trim()).filter(p => p.length > 0);
}

function decouperLecon(texte, max) {
  const paragraphes = texte.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);
  const morceaux = [];
  let courant = [], taille = 0;
  const fermer = () => { if (courant.length) { morceaux.push(courant); courant = []; taille = 0; } };

  paragraphes.forEach(par => {
    if (taille > max / 3) fermer();
    decouperPhrases(par).forEach(ph => {
      if (taille > 0 && taille + ph.length > max) fermer();
      courant.push(ph);
      taille += ph.length;
    });
  });
  fermer();
  return morceaux;
}

// ---------- Simplification automatique (sans IA) ----------
const echapperRegex = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Remplace les mots compliqués par des mots simples (dictionnaire MOTS_SIMPLES de lexique.js)
function remplacerMotsSimples(t) {
  MOTS_SIMPLES.forEach(([dur, simple]) => {
    const finLettre = /\p{L}$/u.test(dur);
    const r = new RegExp(`(?<![\\p{L}])${echapperRegex(dur)}${finLettre ? "(?![\\p{L}])" : ""}`, "giu");
    t = t.replace(r, trouve => (/^\p{Lu}/u.test(trouve) ? majuscule(simple) : simple));
  });
  return t.replace(/\s{2,}/g, " ");
}

// « Le soleil chauffe l'eau des mers, des lacs et des rivières »
//   → « Le soleil chauffe l'eau : • des mers • des lacs • des rivières »
const PETITS_MOTS = new Set(["des", "de", "du", "la", "le", "les", "un", "une", "à", "au", "aux", "en",
  "sa", "son", "ses", "leur", "leurs", "ces", "cette", "ce", "par", "pour", "avec", "dans", "sur"]);

function enumerationEnListe(p) {
  const idx = Math.max(p.lastIndexOf(" et "), p.lastIndexOf(" ou "));
  if (idx < 0) return null;
  const parties = p.slice(0, idx).split(/,\s+/);
  const dernier = p.slice(idx + 4).trim();
  const petitMot = t => {
    const m = t.toLowerCase().match(/^([ld]')|^(\S+)/);
    return m ? (m[1] || m[2]) : "";
  };
  const det = petitMot(dernier);
  if (!PETITS_MOTS.has(det) && !/^[ld]'$/.test(det)) return null;

  // On remonte depuis la fin : les éléments qui commencent par le même petit mot font partie de la liste
  const elements = [dernier];
  let i = parties.length - 1;
  while (i > 0 && petitMot(parties[i]) === det) elements.unshift(parties[i--]);
  // La partie restante contient le début de la phrase + le premier élément
  const debut = parties.slice(0, i + 1).join(", ");
  const bas = debut.toLowerCase();
  const pos = det.endsWith("'") ? bas.lastIndexOf(" " + det) : bas.lastIndexOf(" " + det + " ");
  if (pos < 0) return null;
  elements.unshift(debut.slice(pos + 1).trim());
  const tete = debut.slice(0, pos).trim();
  if (elements.length < 3 || tete.split(" ").length < 2 || elements.some(e => !e || e.split(" ").length > 5)) return null;
  return tete + " :\n• " + elements.join("\n• ");
}

function simplifierPhrase(phrase, n) {
  let p = phrase.trim();
  const fin = (p.match(/[.!?…]+$/) || ["."])[0];
  p = p.replace(/[.!?…]+$/, "");
  if (n.motsSimples) p = remplacerMotsSimples(p);

  const morceaux = [];
  // 1. Point-virgule
  p.split(/\s*;\s*/).forEach(partie => {
    // 2. « … : c'est la X » → deux phrases
    const def = partie.match(/^(.*\S)\s*:\s*((?:c'est|ce sont|on l'appelle|on appelle).*)$/i);
    if (def) { morceaux.push(def[1], def[2]); return; }
    morceaux.push(partie);
  });

  const resultat = [];
  morceaux.forEach(m => {
    // 3. Connecteurs : on coupe seulement si la phrase est longue
    if (m.split(/\s+/).length > n.motsParPhrase) {
      m.replace(/,\s*(mais|donc|puis|ensuite|alors)\s+/gi, (x, c) => `|${majuscule(c.toLowerCase())} `)
        .replace(/\s+car\s+/gi, "|C'est parce que ")
        .split("|").forEach(c => resultat.push(c));
    } else {
      resultat.push(m);
    }
  });

  return resultat
    .map(r => r.trim().replace(/^[,:\s]+/, "").replace(/^(mais|donc|aussi|puis),\s+/i, "$1 "))
    .filter(r => r.length > 1)
    .map(r => (n.listes && enumerationEnListe(r)) || r)            // 4. énumérations → liste à puces
    .map(r => majuscule(r) + (/[.!?…]$/.test(r) ? "" : fin === "?" ? "?" : "."))
    .join(" ");
}

// Mots difficiles du morceau, avec leur explication (dictionnaire de la leçon d'abord)
function explicationsPour(texte, lecon) {
  const sources = (lecon.lexique || []).map(e => [e.mot, e.def]);
  ["general", ...(LEXIQUE_PAR_MATIERE[lecon.matiere] || [])].forEach(c =>
    Object.entries(LEXIQUE[c] || {}).forEach(e => sources.push(e)));
  const res = [], vus = new Set();
  for (const [mot, def] of sources) {
    if (res.length >= 4) break;
    if (vus.has(normaliser(mot))) continue;
    if (new RegExp(`(?<![\\p{L}])${echapperRegex(mot)}(?:s|x|e|es)?(?![\\p{L}])`, "iu").test(texte)) {
      res.push({ mot, def });
      vus.add(normaliser(mot));
    }
  }
  return res;
}

const texteParle = t => t.replace(/ :\n• /g, " : ").replace(/\n• /g, ", ");

function motsAutomatiques(texte, nb) {
  const compte = {};
  (texte.match(/[\p{L}'-]+/gu) || []).forEach(m => {
    const mot = m.replace(/^[a-zà-ÿ]'/i, "");
    const n = mot.toLowerCase();
    if (n.length < 6 || MOTS_VIDES.has(n)) return;
    compte[n] = compte[n] || { mot, n: 0 };
    compte[n].n++;
  });
  return Object.values(compte)
    .sort((a, b) => (b.n * b.mot.length) - (a.n * a.mot.length))
    .slice(0, nb)
    .map(x => x.mot);
}

// Schémas automatiques : le fil de la leçon + une carte mentale des mots importants
function schemasAutomatiques(lecon, mots) {
  const schemas = [];
  const paragraphes = lecon.texte.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);
  const NUM = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  if (paragraphes.length >= 3) {
    const elements = paragraphes.slice(0, 8).map((par, i) => {
      // Si le paragraphe donne une définition (« c'est la X »), on garde X
      const def = par.match(/(?:c'est|ce sont)\s+(?:l'|la |le |les |un |une |des )?([^.;,]+)/i);
      const motCle = mots.find(m => regexMot(m).test(par));
      const premiere = decouperPhrases(par)[0] || par;
      const texte = def ? majuscule(def[1].trim()) + " : " + raccourcir(premiere, 55) : raccourcir(premiere, 70);
      return { emoji: NUM[i], texte, cle: motCle };
    });
    const cyclique = /cycle|recommence|de nouveau|à nouveau/i.test(lecon.texte);
    schemas.push({ type: cyclique ? "cycle" : "etapes", titre: "Le fil de la leçon", elements });
  }

  const phrases = decouperPhrases(lecon.texte.replace(/\n+/g, " "));
  const branches = mots.slice(0, 6).map(m => {
    const ph = phrases.filter(p => regexMot(m).test(p)).sort((a, b) => a.length - b.length)[0];
    return ph ? { emoji: "🔑", titre: majuscule(m), texte: raccourcir(ph, 90) } : null;
  }).filter(Boolean);
  if (branches.length >= 2) schemas.push({ type: "carte", titre: "Les mots à retenir", centre: lecon.titre, branches });

  return schemas;
}

function preparerAutomatiquement(lecon) {
  const n = NIVEAUX[niveau];
  const mots = lecon.mots && lecon.mots.length ? lecon.mots : motsAutomatiques(lecon.texte, 8);
  const morceaux = decouperLecon(lecon.texte, n.max).map(phrases => ({
    original: phrases.join(" "),
    simple: phrases.map(p => simplifierPhrase(p, n)).join(" ")
  }));
  return { morceaux, mots, questions: [], schemas: schemasAutomatiques(lecon, mots), source: "auto" };
}

// Surligne les mots importants (le texte est échappé avant)
function surligner(phrase, mots) {
  let html = echapper(phrase);
  [...mots].sort((a, b) => b.length - a.length).forEach(m => {
    html = html.replace(regexMot(echapper(m)), '<span class="mot-cle">$1</span>');
  });
  return html.replace(/\n• /g, '<br><span class="puce">•</span> ');
}

// ========== NAVIGATION ==========
function afficherEcran(nom) {
  document.querySelectorAll(".ecran").forEach(e => e.classList.remove("actif"));
  $("ecran-" + nom).classList.add("actif");
  if (nom !== "etude") { arreterMinuteur(); silence(); }
  window.scrollTo(0, 0);
}

$("btn-accueil").addEventListener("click", () => afficherAccueil());
$("btn-fin-accueil").addEventListener("click", () => afficherAccueil());

// ========== ACCUEIL ==========
function afficherAccueil() {
  document.querySelectorAll("#choix-niveau button").forEach(b =>
    b.classList.toggle("actif", b.dataset.niveau === niveau));
  $("info-niveau").textContent = NIVEAUX[niveau].info;

  const ul = $("liste-lecons");
  ul.innerHTML = "";
  if (lecons.length === 0) {
    ul.append(el("li", { className: "vide", textContent: "Aucune leçon. Clique sur « Nouvelle leçon » pour commencer." }));
  }
  lecons.forEach(l => {
    const infos = el("div", { className: "infos", title: "Commencer la leçon" }, [
      el("strong", { textContent: l.titre }),
      el("small", { textContent: l.matiere + " · " + "⭐".repeat(l.etoiles || 0) + "☆".repeat(3 - (l.etoiles || 0)) })
    ]);
    infos.addEventListener("click", () => commencerEtude(l.id));

    const btnJouer = el("button", { className: "btn principal", textContent: "▶ Étudier" });
    btnJouer.addEventListener("click", () => commencerEtude(l.id));

    const btnModif = el("button", { className: "icone", textContent: "✏️", title: "Modifier" });
    btnModif.addEventListener("click", () => ouvrirEditeur(l.id));

    const btnSuppr = el("button", { className: "icone", textContent: "🗑", title: "Supprimer" });
    btnSuppr.addEventListener("click", () => {
      if (!confirm(`Supprimer la leçon « ${l.titre} » ?`)) return;
      lecons = lecons.filter(x => x.id !== l.id);
      sauver("lf_lecons", lecons);
      afficherAccueil();
    });

    ul.append(el("li", {}, [el("span", { className: "badge", textContent: icone(l.matiere) }), infos, btnJouer, btnModif, btnSuppr]));
  });

  majEtoiles();
  $("badge-ia").hidden = !iaActive();
  afficherEcran("accueil");
}

function icone(matiere) {
  return ({ "Français": "📖", "Mathématiques": "➗", "Sciences": "🔬", "Histoire-Géographie": "🌍",
    "Anglais": "🇬🇧", "Arabe": "📜", "Éducation islamique": "🕌", "Physique-Chimie": "⚗️",
    "SVT": "🌱", "Philosophie": "💭" })[matiere] || "📝";
}

function majEtoiles() {
  $("total-etoiles").textContent = lecons.reduce((s, l) => s + (l.etoiles || 0), 0);
}

document.querySelectorAll("#choix-niveau button").forEach(b => {
  b.addEventListener("click", () => {
    niveau = b.dataset.niveau;
    sauver("lf_niveau", niveau);
    afficherAccueil();
  });
});

// ========== ÉDITEUR ==========
let leconEnEdition = null;

$("btn-nouvelle").addEventListener("click", () => ouvrirEditeur(null));
$("btn-annuler").addEventListener("click", () => afficherAccueil());

function ouvrirEditeur(id) {
  leconEnEdition = id;
  const l = lecons.find(x => x.id === id);
  $("titre-editeur").textContent = l ? "Modifier la leçon" : "Nouvelle leçon";
  $("ed-titre").value = l ? l.titre : "";
  $("ed-matiere").value = l ? l.matiere : "Français";
  $("ed-texte").value = l ? l.texte : "";
  $("ed-mots").value = l ? (l.mots || []).join(", ") : "";
  $("ed-lexique").value = l ? (l.lexique || []).map(e => `${e.mot} = ${e.def}`).join("\n") : "";
  $("ed-questions").value = l ? (l.questions || []).map(q => `${q.q} | ${q.r}`).join("\n") : "";
  $("photo-etat").hidden = true;
  $("photo-verif").hidden = true;
  afficherEcran("editeur");
}

$("btn-enregistrer").addEventListener("click", () => {
  const titre = $("ed-titre").value.trim();
  const texte = $("ed-texte").value.trim();
  if (!titre || !texte) { toast("Il faut au moins un titre et le texte de la leçon."); return; }

  const mots = $("ed-mots").value.split(",").map(m => m.trim()).filter(Boolean);
  const questions = $("ed-questions").value.split("\n")
    .map(ligne => ligne.split("|"))
    .filter(p => p.length >= 2 && p[0].trim() && p[1].trim())
    .map(p => ({ q: p[0].trim(), r: p.slice(1).join("|").trim() }));

  const lexique = $("ed-lexique").value.split("\n")
    .map(ligne => ligne.split("="))
    .filter(p => p.length >= 2 && p[0].trim() && p[1].trim())
    .map(p => ({ mot: p[0].trim(), def: p.slice(1).join("=").trim() }));

  const donnees = { titre, matiere: $("ed-matiere").value, texte, mots, questions, lexique };
  const existante = lecons.find(x => x.id === leconEnEdition);
  if (existante) {
    // Le texte a changé : la préparation IA doit être refaite
    if (existante.texte !== texte || existante.titre !== titre) donnees.ia = {};
    Object.assign(existante, donnees);
  } else {
    lecons.push({ id: Date.now(), etoiles: 0, ia: {}, ...donnees });
  }

  sauver("lf_lecons", lecons);
  toast("Leçon enregistrée ✔");
  afficherAccueil();
});

// ---------- Photo du texte → texte lisible ----------
// Étapes : 1) on redresse la luminosité de la photo (ombres, contraste),
// 2) on lit le texte, 3) on nettoie le résultat, 4) l'utilisateur vérifie avant d'ajouter.

let photoCourante = null;   // image d'origine (dataURL) en cours de lecture
let workerOCR = null;       // outil de lecture gardé en mémoire entre deux photos
let langueWorker = null;

// Charge une image (dataURL) dans un élément <img>
function chargerImage(src) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error("Cette image n'a pas pu être ouverte."));
    img.src = src;
  });
}

// Redimensionne une image / vidéo vers un canvas (taille max donnée)
function versCanvas(source, max, min = 0, rotation = 0) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  let ratio = Math.min(1, max / Math.max(w, h));
  if (min && Math.max(w, h) * ratio < min) ratio = min / Math.max(w, h);   // agrandit les petites images
  const cw = Math.round(w * ratio), ch = Math.round(h * ratio);
  const tourne = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = tourne ? ch : cw;
  canvas.height = tourne ? cw : ch;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.drawImage(source, -cw / 2, -ch / 2, cw, ch);
  return canvas;
}

function preparerImage(source) {
  return versCanvas(source, 1800).toDataURL("image/jpeg", 0.88);
}

// Rend la photo plus lisible : niveaux de gris + seuil adaptatif (supprime les ombres)
function ameliorerPourLecture(img) {
  const canvas = versCanvas(img, 2400, 1600);
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  // 1. Niveaux de gris
  const gris = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gris[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];

  // 2. Image intégrale pour calculer vite la moyenne locale
  const integ = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let ligne = 0;
    for (let x = 1; x <= w; x++) {
      ligne += gris[(y - 1) * w + (x - 1)];
      integ[y * (w + 1) + x] = integ[(y - 1) * (w + 1) + x] + ligne;
    }
  }

  // 3. Seuil adaptatif (méthode de Bradley) : un pixel est noir s'il est plus sombre que son voisinage
  const s = Math.max(15, Math.round(w / 10)), demi = Math.floor(s / 2), t = 0.15;
  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - demi), y2 = Math.min(h - 1, y + demi);
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - demi), x2 = Math.min(w - 1, x + demi);
      const n = (x2 - x1 + 1) * (y2 - y1 + 1);
      const somme = integ[(y2 + 1) * (w + 1) + x2 + 1] - integ[y1 * (w + 1) + x2 + 1]
                  - integ[(y2 + 1) * (w + 1) + x1] + integ[y1 * (w + 1) + x1];
      const v = gris[y * w + x] * n < somme * (1 - t) ? 0 : 255;
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function chargerScript(url) {
  return new Promise((ok, ko) => {
    if (window.Tesseract) return ok();
    const s = document.createElement("script");
    s.src = url;
    s.onload = ok;
    s.onerror = () => ko(new Error("Impossible de charger l'outil de lecture. Vérifie ta connexion Internet (nécessaire la première fois)."));
    document.head.append(s);
  });
}

async function obtenirWorker(langue) {
  await chargerScript(URL_TESSERACT);
  if (workerOCR && langueWorker === langue) return workerOCR;
  if (workerOCR) await workerOCR.terminate();
  workerOCR = await Tesseract.createWorker(langue, 1, {
    logger: m => {
      if (m.status === "recognizing text") etatPhoto("Lecture du texte… " + Math.round(m.progress * 100) + " %", 30 + m.progress * 60);
      else if (m.status && /load|init/.test(m.status)) etatPhoto("Préparation de la lecture (une seule fois)…", 15);
    }
  });
  await workerOCR.setParameters({ preserve_interword_spaces: "1" });
  langueWorker = langue;
  return workerOCR;
}

const proportionLettres = t => (t.match(/[\p{L}]/gu) || []).length / Math.max(1, t.replace(/\s/g, "").length);

// Transforme le résultat brut de l'outil en texte propre, avec de vrais paragraphes
let doutes = new Set();   // mots lus avec peu de certitude, à faire vérifier

function texteDepuisResultat(data) {
  doutes = new Set();
  const lignes = [];
  (data.lines || []).forEach(l => {
    const hauteur = l.bbox.y1 - l.bbox.y0;
    // Mots gardés : lisibles, et pas des débris isolés loin à droite
    const mots = [];
    for (const w of (l.words || [])) {
      const prec = mots[mots.length - 1];
      const ecart = prec ? Math.max(w.bbox.x0 - prec.bbox.x1, prec.bbox.x0 - w.bbox.x1) : 0;
      if (prec && ecart > hauteur * 2.5 && w.confidence < 75) break;       // débris après un grand vide
      if (w.confidence < 30 && proportionLettres(w.text) < 0.8) continue;  // symboles illisibles
      mots.push(w);
    }
    // Retire les débris en fin de ligne (ponctuation isolée peu sûre)
    while (mots.length && mots[mots.length - 1].confidence < 60 && proportionLettres(mots[mots.length - 1].text) < 0.5) mots.pop();
    const texte = mots.map(w => w.text).join(" ").trim();
    if (texte.length < 2 || proportionLettres(texte) < 0.5) return;
    const conf = mots.reduce((s, w) => s + w.confidence, 0) / mots.length;
    if (conf < 35 || !mots.some(w => w.confidence >= 60)) return;         // ligne de bruit
    if (mots.length === 1 && texte.length <= 4 && conf < 90) return;       // débris isolé
    mots.filter(w => w.confidence < 60 && proportionLettres(w.text) > 0.5)
      .forEach(w => doutes.add(w.text.replace(/[.,;:!?()]+$/, "")));
    lignes.push({ texte, x0: Math.min(...mots.map(w => w.bbox.x0)), x1: Math.max(...mots.map(w => w.bbox.x1)), y0: l.bbox.y0, y1: l.bbox.y1 });
  });
  if (!lignes.length) return nettoyerTexteOCR(data.text || "");

  const hauteurs = lignes.map(l => l.y1 - l.y0).sort((a, b) => a - b);
  const hMed = hauteurs[Math.floor(hauteurs.length / 2)];
  const droite = Math.max(...lignes.map(l => l.x1));
  const gauche = Math.min(...lignes.map(l => l.x0));
  const largeur = droite - gauche;

  const rtl = estArabe(lignes.map(l => l.texte).join(" "));
  let res = "";
  lignes.forEach((l, i) => {
    if (i === 0) { res = l.texte; return; }
    const p = lignes[i - 1];
    const finPhrase = /[.!?:»"؟]$/.test(p.texte);
    const ligneCourte = rtl ? p.x0 > gauche + largeur * 0.12 : p.x1 < droite - largeur * 0.12;
    const titre = !/[.,;!?]$/.test(p.texte) && (p.x1 - p.x0) < largeur * 0.6;
    const grandVide = l.y0 - p.y1 > hMed * 0.9;
    const retrait = (rtl ? droite - l.x1 : l.x0 - gauche) > hMed * 1.2 && finPhrase;
    if (/-$/.test(res) && /^\p{Ll}/u.test(l.texte)) res = res.slice(0, -1) + l.texte;   // mot coupé
    else if ((finPhrase && ligneCourte) || titre || grandVide || retrait) res += "\n\n" + l.texte;
    else res += " " + l.texte;
  });
  return nettoyerTexteOCR(res);
}

function nettoyerTexteOCR(t) {
  return t
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl")
    .replace(/[|¦_~^•©®™<>{}[\]\\]/g, " ")
    .split(/\n\s*\n/)
    .map(p => p
      .replace(/-\s*\n\s*(?=\p{Ll})/gu, "")         // mots coupés en fin de ligne
      .replace(/\s*\n\s*/g, " ")                    // lignes du même paragraphe
      .replace(/\s+([.,])/g, "$1")
      .replace(/\s*([;:!?])(?=\s|$)/g, " $1")       // typographie française
      .replace(/\s{2,}/g, " ")
      .trim())
    .filter(p => p.length >= 3 && proportionLettres(p) >= 0.5 && /\p{L}{2}/u.test(p))
    .join("\n\n");
}

async function lireAvecTesseract(img, langue) {
  const worker = await obtenirWorker(langue);
  etatPhoto("Amélioration de la photo…", 25);
  const amelioree = ameliorerPourLecture(img);
  const options = [{ rotateAuto: true }, { text: true, blocks: true }];   // redresse les photos penchées
  let { data } = await worker.recognize(amelioree, ...options);
  let meilleur = { texte: texteDepuisResultat(data), confiance: data.confidence, doutes: [...doutes] };

  // Si la lecture est mauvaise, on réessaie avec la photo d'origine et on garde la meilleure
  if (meilleur.confiance < 70) {
    etatPhoto("Deuxième essai de lecture…", 70);
    ({ data } = await worker.recognize(versCanvas(img, 2400, 1600), ...options));
    if (data.confidence > meilleur.confiance) meilleur = { texte: texteDepuisResultat(data), confiance: data.confidence, doutes: [...doutes] };
  }
  return meilleur;
}

function etatPhoto(message, pourcent) {
  $("photo-message").textContent = message;
  $("photo-barre").style.width = (pourcent || 0) + "%";
}

// ---------- Écriture à la main : service gratuit OCR.space (moteur 3) ----------
const URL_OCR_SPACE = "https://api.ocr.space/parse/image";
const CLE_OCR_DEMO = "helloworld";   // clé de démonstration publique, très limitée

// Le service gratuit accepte des images de 1 Mo maximum : on réduit jusqu'à passer
function imageMoinsDe1Mo(img) {
  for (const taille of [2000, 1600, 1300, 1000]) {
    const canvas = versCanvas(img, taille);
    for (const qualite of [0.85, 0.7, 0.55]) {
      const url = canvas.toDataURL("image/jpeg", qualite);
      if (url.length * 0.75 < 950 * 1024) return url;
    }
  }
  return versCanvas(img, 900).toDataURL("image/jpeg", 0.5);
}

// Garde les retours à la ligne utiles (listes, titres) et recolle les phrases coupées
function nettoyerManuscrit(t) {
  const lignes = t.replace(/\r/g, "").split("\n").map(l => l.trim()).filter(l => l.length >= 2 && proportionLettres(l) >= 0.4);
  let res = "";
  lignes.forEach((l, i) => {
    if (i === 0) { res = l; return; }
    const prec = lignes[i - 1];
    const nouvelleLigne = /[.!?:؟]$/.test(prec) || /^[-•*–\d]/.test(l) || (prec.length < 30 && /^\p{Lu}/u.test(l));
    if (/-$/.test(res) && /^\p{Ll}/u.test(l)) res = res.slice(0, -1) + l;
    else res += (nouvelleLigne ? "\n" : " ") + l;
  });
  return res
    .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
    .replace(/[|¦_~^©®™<>{}[\]\\]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function lireManuscrit(img, langue) {
  etatPhoto("Préparation de la photo…", 20);
  const image = imageMoinsDe1Mo(img);
  const codes = { fra: "fre", ara: "ara", eng: "eng", "fra+ara": "auto" };
  const donnees = new FormData();
  donnees.append("apikey", (reglages.cleOcr || "").trim() || CLE_OCR_DEMO);
  donnees.append("base64Image", image);
  donnees.append("filetype", "JPG");
  donnees.append("language", codes[langue] || "auto");
  donnees.append("OCREngine", "3");          // moteur 3 = lit l'écriture à la main
  donnees.append("scale", "true");
  donnees.append("detectOrientation", "true");

  etatPhoto("✍️ Lecture de l'écriture à la main (Internet)…", 55);
  let r;
  try {
    r = await fetch(URL_OCR_SPACE, { method: "POST", body: donnees });
  } catch (e) {
    throw new Error("Pas de connexion Internet : la lecture de l'écriture à la main en a besoin.");
  }
  if (r.status === 403 || r.status === 429) {
    throw new Error("Limite du service atteinte. Crée ta clé gratuite OCR.space dans les réglages ⚙️ (sans carte bancaire).");
  }
  const json = await r.json().catch(() => ({}));
  if (json.IsErroredOnProcessing || !json.ParsedResults) {
    const msg = [].concat(json.ErrorMessage || json.ErrorDetails || "Erreur inconnue").join(" ");
    if (/api ?key|apikey|invalid/i.test(msg)) throw new Error("Clé OCR.space refusée. Vérifie-la dans les réglages ⚙️.");
    throw new Error("Le service n'a pas pu lire la photo : " + msg);
  }
  const brut = json.ParsedResults.map(p => p.ParsedText || "").join("\n");
  return { texte: nettoyerManuscrit(brut), confiance: null, manuscrit: true };
}

async function lireTexteImage(dataURL, rotation = 0) {
  photoCourante = { dataURL, rotation };
  $("photo-etat").hidden = false;
  $("photo-verif").hidden = true;
  const langue = $("langue-photo").value;
  const nomsLangues = { fra: "français", ara: "arabe", eng: "anglais", "fra+ara": "français et arabe" };

  try {
    let img = await chargerImage(dataURL);
    if (rotation) img = await chargerImage(versCanvas(img, 2400, 0, rotation).toDataURL("image/jpeg", 0.9));
    $("photo-apercu").src = img.src;

    let resultat;
    const manuscrit = $("type-ecriture").value === "manuscrit";
    if (iaActive()) {
      etatPhoto("✨ L'IA lit le texte de la photo…", 50);
      resultat = { texte: await lireImageAvecIA(preparerImage(img), nomsLangues[langue]), confiance: null };
    } else if (manuscrit) {
      resultat = await lireManuscrit(img, langue);
    } else {
      etatPhoto("Chargement de l'outil de lecture…", 5);
      resultat = await lireAvecTesseract(img, langue);
    }
    etatPhoto("Lecture terminée.", 100);
    montrerVerification(resultat, img.src, langue);
  } catch (e) {
    etatPhoto("⚠ " + e.message, 0);
  }
}

// Écran de vérification : photo à gauche, texte lu à droite (modifiable)
function montrerVerification({ texte, confiance, doutes = [], manuscrit = false }, image, langue) {
  $("photo-etat").hidden = true;
  $("photo-verif").hidden = false;
  $("verif-image").src = image;
  const zone = $("verif-texte");
  zone.value = texte;
  zone.dir = langue === "ara" ? "rtl" : "auto";

  const q = $("verif-qualite");
  if (manuscrit) {
    q.className = texte.trim() ? "qualite moyenne" : "qualite mauvaise";
    q.textContent = texte.trim()
      ? "✍️ Écriture à la main lue. Elle donne plus d'erreurs que le texte imprimé : compare bien avec la photo."
      : "Aucun texte trouvé. Reprends la photo : feuille à plat, bonne lumière, écriture bien visible.";
  } else if (confiance === null) {
    q.className = "qualite bonne";
    q.textContent = "✨ Texte lu par l'IA. Vérifie-le rapidement puis ajoute-le.";
  } else if (!texte.trim()) {
    q.className = "qualite mauvaise";
    q.textContent = "Aucun texte trouvé. Reprends la photo : feuille à plat, bien éclairée, sans flou, le texte doit remplir la photo.";
  } else if (confiance >= 80) {
    q.className = "qualite bonne";
    q.textContent = `✔ Bonne lecture (${Math.round(confiance)} %). Vérifie quand même les mots importants.`;
  } else if (confiance >= 60) {
    q.className = "qualite moyenne";
    q.textContent = `⚠ Lecture moyenne (${Math.round(confiance)} %). Relis et corrige les mots mal lus.`;
  } else {
    q.className = "qualite mauvaise";
    q.textContent = `✗ Photo difficile à lire (${Math.round(confiance)} %). Reprends-la plus nette et bien éclairée` +
      ". Si c'est écrit à la main, choisis « ✍️ Écrit à la main ».";
  }
  const liste = $("verif-doutes");
  liste.innerHTML = "";
  liste.hidden = doutes.length === 0;
  if (doutes.length) {
    liste.append(el("span", { textContent: "🔍 Mots à vérifier : " }));
    doutes.slice(0, 15).forEach(m => {
      const b = el("button", { className: "mot-doute", textContent: m, title: "Trouver ce mot dans le texte" });
      b.addEventListener("click", () => {
        const zone = $("verif-texte"), i = zone.value.indexOf(m);
        if (i >= 0) { zone.focus(); zone.setSelectionRange(i, i + m.length); }
      });
      liste.append(b);
    });
  }
  zone.focus();
}

$("btn-verif-ajouter").addEventListener("click", () => {
  const texte = $("verif-texte").value.trim();
  if (!texte) { toast("Le texte est vide."); return; }
  const zone = $("ed-texte");
  zone.value = zone.value.trim() ? zone.value.trim() + "\n\n" + texte : texte;
  if (!$("ed-titre").value.trim()) {
    const premiere = texte.split("\n")[0].trim();
    if (premiere.length < 60) $("ed-titre").value = premiere.replace(/[.:]$/, "");
  }
  $("photo-verif").hidden = true;
  toast("✔ Texte ajouté à la leçon. Tu peux prendre une autre page.");
});

$("btn-verif-tourner").addEventListener("click", () => {
  if (photoCourante) lireTexteImage(photoCourante.dataURL, (photoCourante.rotation + 90) % 360);
});
$("btn-verif-annuler").addEventListener("click", () => { $("photo-verif").hidden = true; });
$("verif-image").addEventListener("click", () => window.open($("verif-image").src, "_blank"));

// Toutes les façons d'apporter une image : fichier, glisser-déposer, Ctrl+V
async function traiterFichierImage(fichier) {
  if (!fichier || !fichier.type.startsWith("image/")) { toast("Ce fichier n'est pas une image."); return; }
  try {
    const url = URL.createObjectURL(fichier);
    const img = await chargerImage(url);
    URL.revokeObjectURL(url);
    lireTexteImage(preparerImage(img));
  } catch (e) { toast(e.message); }
}

$("input-photo").addEventListener("change", e => {
  const fichier = e.target.files[0];
  e.target.value = "";
  if (fichier) traiterFichierImage(fichier);
});

const zonePhoto = document.querySelector(".zone-photo");
zonePhoto.addEventListener("dragover", e => { e.preventDefault(); zonePhoto.classList.add("survol"); });
zonePhoto.addEventListener("dragleave", () => zonePhoto.classList.remove("survol"));
zonePhoto.addEventListener("drop", e => {
  e.preventDefault();
  zonePhoto.classList.remove("survol");
  traiterFichierImage(e.dataTransfer.files[0]);
});

document.addEventListener("paste", e => {
  if (!$("ecran-editeur").classList.contains("actif")) return;
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/"));
  if (!item) return;           // texte collé normalement
  e.preventDefault();
  traiterFichierImage(item.getAsFile());
});

// Webcam du PC
let fluxWebcam = null;

$("btn-webcam").addEventListener("click", async () => {
  try {
    fluxWebcam = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    $("webcam-video").srcObject = fluxWebcam;
    $("webcam").hidden = false;
  } catch (e) {
    toast("Impossible d'ouvrir la caméra. Autorise l'accès à la caméra dans le navigateur.");
  }
});

function fermerWebcam() {
  if (fluxWebcam) fluxWebcam.getTracks().forEach(t => t.stop());
  fluxWebcam = null;
  $("webcam").hidden = true;
}

$("btn-capturer").addEventListener("click", () => {
  const image = preparerImage($("webcam-video"));
  fermerWebcam();
  lireTexteImage(image);
});
$("btn-webcam-annuler").addEventListener("click", fermerWebcam);

// ========== ÉTUDE ==========
let lecon = null;
let prep = null;          // { morceaux, mots, questions, schemas, source }
let indexMorceau = 0;
let modeRegle = false;
let indexPhrase = 0;
let voirOriginal = false;

async function commencerEtude(id) {
  lecon = lecons.find(x => x.id === id);
  if (!lecon) return;
  lecon.ia = lecon.ia || {};

  if (iaActive() && !lecon.ia[niveau]) {
    afficherEcran("chargement");
    try {
      lecon.ia[niveau] = await preparerAvecIA(lecon);
      sauver("lf_lecons", lecons);
    } catch (e) {
      toast("⚠ " + e.message + " — version automatique utilisée.", 5000);
    }
  }
  prep = lecon.ia[niveau] || preparerAutomatiquement(lecon);
  if (!prep.mots || prep.mots.length === 0) prep.mots = lecon.mots && lecon.mots.length ? lecon.mots : motsAutomatiques(lecon.texte, 8);

  indexMorceau = 0;
  voirOriginal = false;
  $("btn-original").classList.remove("actif");
  $("etude-titre").textContent = icone(lecon.matiere) + " " + lecon.titre;
  $("btn-voir-schema").hidden = prep.schemas.length === 0;
  $("etude-source").textContent = prep.source === "ia"
    ? "✨ Texte reformulé par l'IA pour le niveau " + NIVEAUX[niveau].nom + "."
    : "Texte simplifié automatiquement pour le niveau " + NIVEAUX[niveau].nom + ".";
  afficherEcran("etude");
  demarrerMinuteur();
  afficherMorceau();
}

function phrasesDuMorceau() {
  return decouperPhrases(prep.morceaux[indexMorceau].simple);
}

function afficherMorceau() {
  silence();
  indexPhrase = 0;
  const m = prep.morceaux[indexMorceau];
  const zone = $("etude-morceau");
  zone.innerHTML = "";
  zone.classList.toggle("regle", modeRegle);
  zone.classList.toggle("rtl", estArabe(m.simple));
  zone.style.animation = "none"; void zone.offsetWidth; zone.style.animation = "";

  phrasesDuMorceau().forEach((ph, i) => {
    const span = el("span", { className: "phrase" + (i === 0 ? " lue" : "") });
    span.innerHTML = surligner(ph, prep.mots) + (ph.includes("\n• ") ? "<br>" : " ");   // à la ligne après une liste
    span.addEventListener("click", () => { indexPhrase = i; majPhrases(); parler(ph); });
    zone.append(span);
  });

  const orig = $("etude-original");
  orig.textContent = m.original;
  orig.classList.toggle("rtl", estArabe(m.original));
  orig.hidden = !voirOriginal || !m.original || m.original === m.simple;

  const boite = $("etude-lexique");
  const explications = explicationsPour(m.simple + " " + m.original, lecon);
  boite.innerHTML = "";
  boite.hidden = explications.length === 0;
  if (explications.length) {
    boite.append(el("p", { className: "lexique-titre", textContent: "💡 Mots expliqués" }));
    explications.forEach(e => {
      const ligne = el("p");
      ligne.append(el("strong", { textContent: majuscule(e.mot) }), " : " + e.def);
      const ecouter = el("button", { className: "icone petit", textContent: "🔊", title: "Écouter" });
      ecouter.addEventListener("click", () => parler(`${e.mot} : ${e.def}`));
      ligne.append(" ", ecouter);
      boite.append(ligne);
    });
  }

  const total = prep.morceaux.length;
  $("etude-barre").style.width = (indexMorceau / total * 100) + "%";
  $("etude-compteur").textContent = `Morceau ${indexMorceau + 1} sur ${total}`;
  $("btn-precedent").disabled = indexMorceau === 0;
  majBoutonSuivant();
}

function majPhrases() {
  document.querySelectorAll("#etude-morceau .phrase").forEach((s, i) => s.classList.toggle("lue", i <= indexPhrase));
  majBoutonSuivant();
}

function majBoutonSuivant() {
  const reste = modeRegle && indexPhrase < phrasesDuMorceau().length - 1;
  const dernier = indexMorceau === prep.morceaux.length - 1;
  const apres = prep.schemas.length ? "📊 Voir le schéma" : "🧠 Passer au quiz";
  $("btn-suivant").textContent = reste ? "➜ Phrase suivante" : (dernier ? apres : "✔ J'ai compris");
}

function suivant() {
  if (modeRegle && indexPhrase < phrasesDuMorceau().length - 1) {
    indexPhrase++;
    majPhrases();
    return;
  }
  if (indexMorceau < prep.morceaux.length - 1) {
    indexMorceau++;
    afficherMorceau();
  } else {
    $("etude-barre").style.width = "100%";
    if (prep.schemas.length) afficherSchemas(); else commencerQuiz();
  }
}

function precedent() {
  if (indexMorceau > 0) { indexMorceau--; afficherMorceau(); }
}

$("btn-suivant").addEventListener("click", suivant);
$("btn-precedent").addEventListener("click", precedent);

$("btn-ecouter").addEventListener("click", () => {
  const phrases = phrasesDuMorceau();
  parler(modeRegle ? phrases[indexPhrase] : phrases.join(" "));
});

$("btn-regle").addEventListener("click", () => {
  modeRegle = !modeRegle;
  $("btn-regle").classList.toggle("actif", modeRegle);
  afficherMorceau();
});

$("btn-original").addEventListener("click", () => {
  voirOriginal = !voirOriginal;
  $("btn-original").classList.toggle("actif", voirOriginal);
  const m = prep.morceaux[indexMorceau];
  if (voirOriginal && (!m.original || m.original === m.simple)) toast("Ce morceau est déjà identique au texte original.");
  $("etude-original").hidden = !voirOriginal || !m.original || m.original === m.simple;
});

$("btn-voir-schema").addEventListener("click", () => afficherSchemas(true));

document.addEventListener("keydown", e => {
  if (!$("ecran-etude").classList.contains("actif") || !$("pause").hidden) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
  if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); suivant(); }
  else if (e.key === "ArrowLeft") { precedent(); }
  else if (e.key.toLowerCase() === "l") { $("btn-ecouter").click(); }
});

// ========== SCHÉMAS ==========
let schemaDepuisEtude = false;

function afficherSchemas(depuisEtude = false) {
  schemaDepuisEtude = depuisEtude;
  const zone = $("schemas-zone");
  zone.innerHTML = "";
  prep.schemas.forEach(s => {
    try { zone.append(dessinerSchema(s)); } catch (e) { /* schéma mal formé : ignoré */ }
  });
  $("btn-schema-quiz").textContent = depuisEtude ? "◀ Continuer la leçon" : "🧠 Passer au quiz";
  $("btn-schema-retour").hidden = depuisEtude;
  afficherEcran("schema");
}

$("btn-schema-retour").addEventListener("click", () => {
  afficherEcran("etude");
  demarrerMinuteur();
  afficherMorceau();
});

$("btn-schema-quiz").addEventListener("click", () => {
  if (schemaDepuisEtude) {
    afficherEcran("etude");
    demarrerMinuteur();
    afficherMorceau();
  } else {
    commencerQuiz();
  }
});

function texteSchema(s) {
  if (s.type === "carte") return [s.centre, ...(s.branches || []).map(b => `${b.titre || ""}. ${b.texte || ""}`)].join(". ");
  if (s.type === "comparaison") return (s.lignes || []).map(l => l.join(", ")).join(". ");
  return (s.elements || []).map((e, i) => `Étape ${i + 1} : ${e.texte}`).join(". ");
}

function dessinerSchema(s) {
  const bloc = el("div", { className: "schema" });
  const ecouter = el("button", { className: "btn", textContent: "🔊", title: "Écouter le schéma" });
  ecouter.addEventListener("click", () => parler((s.titre ? s.titre + ". " : "") + texteSchema(s)));
  bloc.append(el("div", { className: "schema-tete" }, [el("h3", { textContent: s.titre || "Schéma" }), ecouter]));

  if (s.type === "etapes" || s.type === "cycle") {
    const ligne = el("div", { className: "schema-etapes" });
    (s.elements || []).forEach((e, i) => {
      if (i > 0) ligne.append(el("span", { className: "fleche", textContent: "➜" }));
      const boite = el("div", { className: "etape" });
      if (e.emoji && !/^\d/.test(e.emoji) && !e.emoji.includes("⃣")) boite.append(el("span", { className: "emoji", textContent: e.emoji }));
      boite.append(el("span", { className: "num", textContent: i + 1 }), el("div"));
      const txt = boite.lastChild;
      txt.innerHTML = surligner(e.texte || "", prep.mots);
      ligne.append(boite);
    });
    bloc.append(ligne);
    if (s.type === "cycle") bloc.append(el("div", { className: "retour-cycle", textContent: "↺ Puis tout recommence à l'étape 1" }));
  } else if (s.type === "carte") {
    const carte = el("div", { className: "schema-carte" });
    carte.append(el("div", { className: "carte-centre", textContent: s.centre || s.titre }));
    carte.append(el("div", { className: "carte-tige" }));
    const branches = el("div", { className: "carte-branches" });
    (s.branches || []).forEach(b => {
      const br = el("div", { className: "branche" });
      br.append(el("strong", { textContent: `${b.emoji || ""} ${b.titre || ""}`.trim() }));
      const t = el("div"); t.innerHTML = surligner(b.texte || "", prep.mots);
      br.append(t);
      branches.append(br);
    });
    carte.append(branches);
    bloc.append(carte);
  } else if (s.type === "comparaison") {
    const table = el("table", { className: "schema-comparaison" });
    const tr = el("tr");
    (s.colonnes || []).forEach(c => tr.append(el("th", { textContent: c })));
    table.append(el("thead", {}, [tr]));
    const corps = el("tbody");
    (s.lignes || []).forEach(l => {
      const ligne = el("tr");
      l.forEach((c, i) => ligne.append(el("td", { textContent: c, style: i === 0 ? "font-weight:700" : "" })));
      corps.append(ligne);
    });
    table.append(corps);
    bloc.append(table);
  } else {
    throw new Error("type inconnu");
  }
  return bloc;
}

// ---------- Minuteur et pauses ----------
let tempsRestant = 0;
let intervalle = null;

function format(sec) {
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}

function demarrerMinuteur() {
  arreterMinuteur();
  if (tempsRestant <= 0) tempsRestant = NIVEAUX[niveau].minutes * 60;
  $("etude-minuteur").textContent = "⏱ " + format(tempsRestant);
  intervalle = setInterval(() => {
    tempsRestant--;
    $("etude-minuteur").textContent = "⏱ " + format(Math.max(tempsRestant, 0));
    if (tempsRestant <= 0) { arreterMinuteur(); lancerPause(); }
  }, 1000);
}

function arreterMinuteur() { clearInterval(intervalle); intervalle = null; }

let intervallePause = null;
function lancerPause() {
  silence();
  son(true);
  let reste = DUREE_PAUSE;
  $("pause-temps").textContent = format(reste);
  $("pause").hidden = false;
  intervallePause = setInterval(() => {
    reste--;
    $("pause-temps").textContent = format(Math.max(reste, 0));
    if (reste <= 0) { clearInterval(intervallePause); son(true); }
  }, 1000);
}

$("btn-fin-pause").addEventListener("click", () => {
  clearInterval(intervallePause);
  $("pause").hidden = true;
  tempsRestant = 0;
  if ($("ecran-etude").classList.contains("actif")) demarrerMinuteur();
});

// ========== QUIZ ==========
let questions = [];
let indexQuestion = 0;
let bonnes = 0;

function questionsATrous(nb) {
  const texteEtude = texteParle(prep.morceaux.map(m => m.simple).join(" "));
  const phrases = decouperPhrases(texteEtude);
  const reserve = [...new Set([...prep.mots, ...motsAutomatiques(texteEtude, 15)])];
  const res = [];

  melanger(prep.mots).forEach(mot => {
    if (res.length >= nb) return;
    const phrase = phrases.find(p => regexMot(mot).test(p) && p.length > mot.length + 15);
    if (!phrase) return;
    const leurres = melanger(reserve.filter(m => normaliser(m) !== normaliser(mot) && !regexMot(m).test(phrase))).slice(0, 2);
    if (leurres.length < 2) return;
    res.push({
      type: "trou",
      phrase: echapper(phrase).replace(regexMot(echapper(mot)), '<span class="trou">?</span>'),
      bonne: mot,
      options: melanger([mot, ...leurres])
    });
  });
  return res;
}

function commencerQuiz() {
  arreterMinuteur();
  silence();
  tempsRestant = 0;
  const nb = NIVEAUX[niveau].quiz;
  const libres = [...(lecon.questions || []), ...(prep.questions || [])].map(q => ({ type: "libre", q: q.q, r: q.r }));
  const trous = questionsATrous(Math.ceil(nb / 2));
  // Mélange équilibré : questions de l'enseignant d'abord, puis IA et textes à trous
  const perso = (lecon.questions || []).length;
  questions = melanger([...libres.slice(0, Math.max(perso, nb - trous.length)), ...trous]).slice(0, Math.max(nb, perso));
  indexQuestion = 0;
  bonnes = 0;

  if (questions.length === 0) { terminer(); return; }
  afficherEcran("quiz");
  afficherQuestion();
}

function afficherQuestion() {
  const q = questions[indexQuestion];
  const zone = $("quiz-zone");
  zone.innerHTML = "";
  zone.style.animation = "none"; void zone.offsetWidth; zone.style.animation = "";
  $("quiz-barre").style.width = (indexQuestion / questions.length * 100) + "%";
  $("quiz-score").textContent = `Question ${indexQuestion + 1} / ${questions.length}`;

  const btnSuite = el("button", {
    className: "btn principal",
    textContent: indexQuestion === questions.length - 1 ? "Voir mon résultat" : "Question suivante ➜"
  });
  btnSuite.hidden = true;
  btnSuite.addEventListener("click", () => {
    indexQuestion++;
    if (indexQuestion < questions.length) afficherQuestion(); else terminer();
  });

  if (q.type === "trou") {
    const titre = el("p", { className: "question", textContent: "Complète la phrase :" });
    const phrase = el("p");
    phrase.innerHTML = q.phrase;
    const options = el("div", { className: "options" });
    const retour = el("p", { className: "retour" });

    q.options.forEach(opt => {
      const b = el("button", { className: "btn", textContent: opt });
      b.addEventListener("click", () => {
        const ok = normaliser(opt) === normaliser(q.bonne);
        options.querySelectorAll("button").forEach(x => {
          x.disabled = true;
          if (normaliser(x.textContent) === normaliser(q.bonne)) x.classList.add("bon");
        });
        if (!ok) b.classList.add("faux");
        phrase.querySelector(".trou").textContent = q.bonne;
        if (ok) bonnes++;
        son(ok);
        retour.textContent = ok ? "👏 Bravo, c'est juste !" : "Pas grave ! La bonne réponse est en vert.";
        btnSuite.hidden = false;
        btnSuite.focus();
      });
      options.append(b);
    });

    const ecouter = el("button", { className: "btn", textContent: "🔊", title: "Écouter la phrase" });
    ecouter.addEventListener("click", () => parler(phrase.textContent.replace("?", "…")));
    zone.append(titre, phrase, options, retour, el("div", { className: "ligne" }, [ecouter, btnSuite]));
  } else {
    const titre = el("p", { className: "question", textContent: q.q });
    const reponse = el("div", { className: "reponse", textContent: "✅ " + q.r });
    reponse.hidden = true;
    const consigne = el("p", { className: "astuce", textContent: "Réfléchis ou dis ta réponse à voix haute, puis regarde la réponse." });

    const btnVoir = el("button", { className: "btn principal", textContent: "👀 Voir la réponse" });
    const btnSavais = el("button", { className: "btn", textContent: "✔ Je savais" });
    const btnRevoir = el("button", { className: "btn", textContent: "✗ À revoir" });
    const choix = el("div", { className: "ligne" }, [btnSavais, btnRevoir]);
    choix.hidden = true;

    const ecouter = el("button", { className: "btn", textContent: "🔊", title: "Écouter la question" });
    ecouter.addEventListener("click", () => parler(q.q));

    btnVoir.addEventListener("click", () => { reponse.hidden = false; choix.hidden = false; btnVoir.hidden = true; });
    const repondre = ok => {
      if (ok) bonnes++;
      son(ok);
      choix.hidden = true;
      consigne.textContent = ok ? "👏 Super !" : "D'accord, tu la reverras la prochaine fois.";
      btnSuite.hidden = false;
      btnSuite.focus();
    };
    btnSavais.addEventListener("click", () => repondre(true));
    btnRevoir.addEventListener("click", () => repondre(false));

    zone.append(titre, consigne, reponse, el("div", { className: "ligne" }, [ecouter, btnVoir]), choix,
      el("div", { className: "ligne" }, [btnSuite]));
  }
}

// ========== FIN ==========
function terminer() {
  const total = questions.length;
  const ratio = total ? bonnes / total : 1;
  const etoiles = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;

  if (etoiles > (lecon.etoiles || 0)) {
    lecon.etoiles = etoiles;
    sauver("lf_lecons", lecons);
  }
  majEtoiles();

  $("fin-message").textContent = total
    ? `Tu as terminé « ${lecon.titre} » avec ${bonnes} bonne(s) réponse(s) sur ${total}.`
    : `Tu as terminé « ${lecon.titre} ».`;
  $("fin-etoiles").textContent = "⭐".repeat(etoiles) + "☆".repeat(3 - etoiles);
  afficherEcran("fin");
  son(true);
}

$("btn-revoir").addEventListener("click", () => commencerEtude(lecon.id));

// ========== RÉGLAGES ==========
function appliquerReglages() {
  document.body.classList.toggle("lisible", reglages.lisible);
  document.body.classList.toggle("grand", reglages.grand);
  document.body.classList.toggle("sombre", reglages.sombre);
  $("opt-police").checked = reglages.lisible;
  $("opt-grand").checked = reglages.grand;
  $("opt-sombre").checked = reglages.sombre;
  $("opt-son").checked = reglages.son;
  $("opt-vitesse").value = reglages.vitesse;
  $("opt-cle").value = reglages.cle;
  $("opt-modele").value = reglages.modele;
  $("badge-ia").hidden = !iaActive();
  $("opt-cle-ocr").value = reglages.cleOcr || "";
  $("type-ecriture").value = reglages.typeEcriture || "imprime";
}

$("btn-reglages").addEventListener("click", () => { $("reglages").hidden = false; });
$("btn-fermer-reglages").addEventListener("click", () => { $("reglages").hidden = true; appliquerReglages(); });

[["opt-police", "lisible"], ["opt-grand", "grand"], ["opt-sombre", "sombre"], ["opt-son", "son"]].forEach(([id, cle]) => {
  $(id).addEventListener("change", () => { reglages[cle] = $(id).checked; sauver("lf_reglages", reglages); appliquerReglages(); });
});
$("opt-cle-ocr").addEventListener("change", () => { reglages.cleOcr = $("opt-cle-ocr").value.trim(); sauver("lf_reglages", reglages); });
$("type-ecriture").addEventListener("change", () => { reglages.typeEcriture = $("type-ecriture").value; sauver("lf_reglages", reglages); });
$("opt-vitesse").addEventListener("input", () => { reglages.vitesse = Number($("opt-vitesse").value); sauver("lf_reglages", reglages); });
$("opt-cle").addEventListener("change", () => { reglages.cle = $("opt-cle").value.trim(); sauver("lf_reglages", reglages); appliquerReglages(); });
$("opt-modele").addEventListener("change", () => {
  reglages.modele = $("opt-modele").value;
  sauver("lf_reglages", reglages);
  // Nouveau modèle : on refera la préparation des leçons
  lecons.forEach(l => (l.ia = {}));
  sauver("lf_lecons", lecons);
});

// ========== DÉMARRAGE ==========
appliquerReglages();
afficherAccueil();
