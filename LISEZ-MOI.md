# Cha'Vap — site vitrine

Site statique (HTML, CSS, JS, sans dépendance) : ouvrir `index.html` dans un navigateur suffit.
Lien de démonstration qui saute l'écran d'âge : `index.html?apercu`.

## Structure

```
index.html              page unique (accueil, boutique, univers, conseils, galerie, infos)
assets/css/style.css    styles (couleurs et polices en variables en haut du fichier)
assets/js/main.js       fumée WebGL, bouffées de vapeur, chat animé, âge, horaires, galerie
assets/fonts/           polices hébergées en local (RGPD) : Kaushan Script, Yellowtail, Montserrat
assets/img/chat/        les 3 poses du chat, détourées (WebP transparents)
assets/img/logo-chavap.webp         badge officiel détouré (écran d'accueil, pied de page)
assets/img/logo-chavap-source.jpg   logo officiel d'origine (1254 px, partage réseaux sociaux)
assets/img/icone-180.png            icône d'écran d'accueil iPhone / Android
assets/img/visuels/     nuage-cœur du logo + visuels PROVISOIRES extraits des maquettes
```

## Ce qui bouge

- Écran d'accueil : contrôle de l'âge (18 ans) révélé dans la fumée, le chat passe la tête par le bord.
- Hero : fumée temps réel qui s'écarte sous la souris ; le chat vapote en continu et souffle
  un nuage en forme de cœur. Au clic, il donne un conseil.
- Le chat apparaît de temps en temps par les bords de l'écran (cliquable, il donne un conseil)
  et traverse parfois l'écran sur son nuage.
- Section conseils : le chat surgit dans un « pouf » de fumée ; chaque clic donne un nouveau conseil.
- Infos pratiques : « Ouvert / Fermé » calculé en direct à l'heure de Paris.
- Tout est désactivé proprement si le visiteur a demandé « réduire les animations ».

## À remplacer avant la mise en ligne

### 1. Le chat
Toutes les versions du chat ont été agrandies 4x par une IA spécialisée illustration
(APISR), puis détourées. Pour ne jamais montrer le chat « coupé », il est posé sur un nuage
de vapeur composé à partir du nuage du logo.

| Fichier                             | Version                                          | Source |
| ----------------------------------- | ------------------------------------------------ | ------ |
| `assets/img/chat/chat-nuage.webp`   | clin d'œil, vapote, assis sur son nuage (hero, traversée) | logo officiel |
| `assets/img/chat/chat-vape.webp`    | même pose en buste, sans nuage (en réserve)      | logo officiel |
| `assets/img/chat/chat-coucou.webp`  | demi-tête qui sort du bord de l'écran            | logo officiel |
| `assets/img/chat/chat-tete.webp`    | avatar rond des bulles de conseil                | logo officiel |
| `assets/img/chat/chat-conseil.webp` | pouce levé, sur son nuage (section conseils)     | maquette (agrandie par IA) |

Pour une nouvelle pose : PNG **fond transparent** (ou fond noir uni), **au moins 1500 px de haut**.

Si les proportions changent, ajuster dans `main.js` les points `MOUTH`, `TIP_END`,
`PEEK_MOUTH` et `TIPCAT_MOUTH` (position de la bouche en % de l'image, d'où sort la fumée).

### 2. Les photos de la boutique et des produits
Les visuels de `assets/img/visuels/` viennent des maquettes, agrandis 4x par IA (mélangés à
un agrandissement doux pour garder un rendu photo). Ils sont nets à l'écran, mais restent des
images de concept : à remplacer par de vraies photos de la boutique et des produits dès que
possible. Garder les mêmes noms de fichiers, ou modifier les `src` dans `index.html`.
Format conseillé : WebP, 1600 px de large.

### 3. Les informations (exemples des maquettes)
- Adresse « 12 Rue de la Vape, 75000 Paris », téléphone « 06 12 34 56 78 », e-mail
  « contact@chavap.fr » : dans `index.html` (section infos + bloc JSON-LD dans `<head>`).
- Horaires : tableau dans `index.html` **et** constante `SLOTS` dans `main.js` (statut en direct).
- Coordonnées du plan : URL OpenStreetMap dans `main.js` (fonction du bouton « Afficher le plan »).
- Lien « Itinéraire » : URL Google Maps dans `index.html`.
- Liens Instagram / Facebook et pages « Mentions légales » / « Confidentialité » (à créer).

## Réglementation (à faire valider par la cliente)
Le site présente des produits du vapotage : l'écran d'âge et l'avertissement nicotine sont en
place, mais la publicité pour ces produits est très encadrée en France (Code de la santé
publique, art. L3513-4). Faire relire les textes et l'usage de la mascotte avant la mise en ligne.


## Mise à jour visuelle HD — 02/11/2026

Les nouveaux visuels HD (mascotte, vues conceptuelles de boutique, e-liquides, pods et atomiseur) sont directement intégrés à leurs emplacements d’origine sous forme de WebP optimisés. Le logo officiel, le design, les sections et les animations du site sont conservés. Les coordonnées des bouffées de vapeur ont été recalées pour suivre la nouvelle pose du chat. Les URLs des images concernées utilisent désormais `?v=3` pour forcer leur actualisation dans les navigateurs.

**Important :** les visuels de boutique et de produits sont des représentations conceptuelles générées, pas des photographies vérifiées de la vraie boutique ni des produits effectivement en stock. À remplacer par des photos réelles si le site est utilisé comme représentation factuelle du lieu. Les informations pratiques d’exemple du fichier initial restent à renseigner avant publication.
