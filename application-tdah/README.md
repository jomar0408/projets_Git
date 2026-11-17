# Leçons Faciles — aide aux leçons pour élèves TDAH

Application web locale qui rend les leçons plus faciles à apprendre pour les élèves qui ont un TDAH, du primaire à l'âge adulte.

## Principe
1. On colle (ou on écrit) une leçon.
2. L'application la **découpe en petits morceaux** adaptés au niveau de l'élève.
3. L'élève avance morceau par morceau, avec les **mots importants surlignés**.
4. Des **pauses** sont proposées régulièrement.
5. Un **petit quiz** termine la leçon et fait gagner des **étoiles**.

## Niveaux
| Niveau   | Taille des morceaux | Pause toutes les | Questions du quiz |
|----------|---------------------|------------------|-------------------|
| Primaire | 1 à 2 phrases       | 5 min            | 3                 |
| Collège  | court               | 10 min           | 4                 |
| Lycée    | moyen               | 15 min           | 5                 |
| Adulte   | plus long           | 20 min           | 6                 |

## Nouveautés
- 📷 **Photo de la leçon** : photo avec le téléphone, image du PC ou webcam. Le texte est lu automatiquement
  (Tesseract.js, Internet nécessaire la première fois — ou l'IA Claude si une clé est configurée, qui lit aussi l'écriture à la main).
- 🔤 **Photo → texte lisible** : la photo est nettoyée avant la lecture (ombres supprimées, contraste renforcé,
  photo penchée redressée), puis le texte est remis en paragraphes et débarrassé des caractères parasites.
  Un écran de vérification montre la photo et le texte côte à côte, avec la qualité de lecture et les mots à vérifier.
  Aussi possible : glisser une image ou la coller avec Ctrl+V. Fonctionne en français, arabe et anglais.
- ✍️ **Reformulation** adaptée au niveau : phrases courtes, mots simples, mots difficiles expliqués.
  Bouton « 📄 Texte original » pour comparer.
- 📊 **Schémas** : étapes, cycle, carte mentale, tableau de comparaison, affichés avant le quiz et à tout moment.

### Version gratuite (sans clé)
- Mots compliqués remplacés par des mots simples au primaire et au collège (« cependant » → « mais », « lorsque » → « quand »…)
- Phrases longues coupées, énumérations transformées en listes à puces
- Encadré « 💡 Mots expliqués » : dictionnaire scolaire intégré (`lexique.js`, rangé par matière)
  + mots ajoutés dans chaque leçon (champ « Mots difficiles à expliquer » : `mot = explication`)

### IA facultative (Claude)
Dans ⚙️ Réglages, coller une clé API Claude (https://console.anthropic.com). Sans clé, l'application utilise
une version automatique plus simple (découpage des phrases longues, schémas à partir des paragraphes et des mots importants).
La clé est stockée uniquement dans le navigateur.

## Fonctionnalités
- Découpage automatique de la leçon par niveau
- Mots importants : donnés par l'enseignant ou le parent, sinon choisis automatiquement
- 🔊 Lecture à voix haute (voix française du navigateur, vitesse réglable)
- 📏 Mode « phrase par phrase » : une seule phrase mise en avant à la fois
- Minuteur de concentration + écran de pause de 2 minutes
- Quiz : textes à trous générés automatiquement + questions personnalisées (`question | réponse`)
- Étoiles par leçon (meilleur score gardé)
- Réglages : police plus lisible, texte plus grand, mode sombre, son
- Raccourcis clavier pendant l'étude : `Espace` / `→` suivant, `←` retour, `L` écouter

## Lancer l'application
Double-cliquer sur `index.html`. Aucune installation nécessaire.
Les données sont enregistrées dans le `localStorage` du navigateur.

## Fichiers
- `index.html` — structure des écrans
- `style.css` — mise en forme
- `app.js` — logique (découpage, étude, quiz, réglages)
- `lexique.js` — dictionnaire des mots expliqués et des mots simples (modifiable)
