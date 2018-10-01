# Guide du Développement Web

## Introduction

Ce guide a pour objectif **d'informer**, mais aussi de **cadrer** les développements **frontend**.

Notre objectif est de fournir un contenu de haute **qualité** à nos clients, des sites qui fonctionnent mieux et atteignent un maximum de personnes et pas seulement avec les navigateurs et appareils d'aujourd'hui, mais aussi avec ceux de demain.

Ce guide est **collaboratif**, les lecteurs sont invités à avoir un regard critique et à réagir afin d'améliorer ce guide.

Il se veut synthétique afin de pouvoir s'y référer rapidement de temps en temps.

C'est pourquoi il sera proposé aux collaborateurs d'aller voir d'eux même des articles en détail s'ils n'ont pas les bases ou s'ils veulent plus de détails.

Je recommande tout particulièrement ces sites qui sont, selon moi, à garder sous la main :

* [https://developer.mozilla.org/fr/docs/Web](https://developer.mozilla.org/fr/docs/Web): maintenu par Mozilla, il regroupe des tutoriels et de la documentation technique claire (oui, ça existe)
* [https://devdocs.io/](https://devdocs.io/): cette webapp permet d'accéder à toutes les documentations des technologies et librairies les plus populaires, cela permet d'avoir un unique point d'entrée pour toutes les documentations
* [https://caniuse.com/](https://caniuse.com/): permet de connaitre la disponibilité des fonctionnalités par navigateur, indispensable pour le support d'Internet Explorer ou de fonctions expérimentales

> Aucun d'entre nous n'est plus intelligent que l'ensemble d'entre nous.
> -- Kenneth Blanchard

* * *

### Navigateurs

En fonction des projets, différents navigateurs devront être supportés.

#### Avant de vendre un projet

Cibler les navigateurs :

* Regarder la part de marché des navigateurs dans le pays cible du client, ou dans le monde si nécessaire
* Regarder les statistiques liées à la clientèle du client en question
* Par exemple, dans le cadre d'une refonte d'un site internet d'un client, si ce dernier a inclus un scriptGoogle Analytics sur son ancien site, les données collectées permettront de connaitre les cibles : les visiteurs du site
* Si 80% des visiteurs utilisent IE9 alors il faudra être compatible avec ce dernier, si à l'inverse seulement 2% utilisent IE8 alors la compatibilité (extrêmement coûteuse) IE8 ne sera pas nécessaire
* Cibler les navigateurs c'est aussi cibler les versions, Firefox ? Oui, mais à partir de quelle version ?
* Si le client n'est pas inquiet vis-à-vis de cette sélection de navigateurs cibles, alors choisissons simplement les navigateurs actuels dans leurs dernières versions
* Le site [http://gs.statcounter.com/](http://gs.statcounter.com/) est très pratique pour voir toutes les statistiques

Clarifier avec le client :

* Le site ne s'affichera pas **exactement** de la même façon sur tous les navigateurs ni sur tous les systèmes d'exploitation

> Une page doit jouer son rôle d'information et ne pas apparaître cassée. Le problème n'est pas le rendu des navigateurs, il s'agit d'offrir aux utilisateurs le meilleur contenu en fonction de leur appareil de navigation.
> -- [David Leuliette](https://davidl.fr/manifesto.html)

#### Phase de développement / maintenance

Une fois le projet vendu, les navigateurs ciblés devront être compatibles avec le site web produit.

Pour se faire, il faut tester le site sous ces différents navigateurs et dans les versions vendues au client.

Il existe plusieurs manières de tester le site :

* avoir un poste physique avec navigateur installé (limité à une version de chaque navigateur)
* avoir un poste physique avec navigateur portable (permets de faire coexister plusieurs versions d'un même navigateur)
* avoir une machine virtuelle avec navigateur (permets de tester d'autres systèmes d'exploitation)
* utiliser un service en ligne comme [BrowserStack](https://www.browserstack.com/) qui permet de tester quasiment tous les navigateurs sur tous les systèmes

La dernière solution est la plus intéressante même si elle a un coût, **ce coût sera rentabilisé** :

* il est moins coûteux de pouvoir facilement tester un site au cours du développement (et ainsi d'éviter des bugs liés aux différences entre navigateurs et systèmes) que de ne pas tester et laisser les bugs fleurir d'eux-mêmes lors des phases de recette
* pendant une phase de correction, un développeur ira plus vite en utilisant une plateforme de test en ligne, identifier le problème plus vite c'est aussi le corriger plus vite, et donc pour moins cher
* avoir une plateforme de test en ligne c'est aussi une économie sur l'achat de périphériques de test

* * *

### Éditeurs ou IDE

Pour ce qui est du développement front, plusieurs éditeurs reconnus sont disponibles, mais voici ceux que je recommande :

* **Visual Studio Code** : complet, gratuit et performant, maintenu par Microsoft, facile à prendre en main et peu gourmand en ressources
* Web Storm : très complet, mais payant, peut être lourd à l'utilisation pour une machine peu puissante

J'utilise **VS Code** depuis qu'il est sorti en 2015 et il a admirablement remplacé tous les éditeurs que j'ai pu avoir par le passé : Eclipse, Netbeans, Sublime Text, Web Storm

Il est vivement conseillé d'avoir le même IDE au sein d'une équipe afin de limiter les changements de formatage typiques de certains éditeurs

Une fois que l'équipe a tranché sur l'éditeur, il est nécessaire de se mettre d'accord sur certaines règles de formatage :

* la plupart ne sont **pas discutables** : les noms de classes CSS sont en kebab-case par exemple, les noms de constantes en majuscules
* certaines sont plus **discutables** et aux goûts de chacun : la taille de l'indentation (2 ou 4 espaces), le nommage des couleurs en Sass

En général il est conseillé de :

1. mettre en place un fichier .EditorConfig à la racine du projet, je conseille par exemple celui de [Babel](https://github.com/babel/babel/blob/master/.editorconfig)
2. utiliser un linter comme ESLint ou TSlint avec les règles recommandées
3. configurer le linter au fur et à mesure des développements si l'équipe est d'avis de changer une des règles **discutables**

* * *

### Versioning

La gestion des versions n'étant pas une option, il faut à minima se mettre d'accord sur les commits :

* la langue : français, anglais, cela dépendra de l'équipe et du client si le code est hébergé chez ce dernier
* le nommage : un nommage couramment utilisé inclus le type (fix, feature, update, refacto, ...) et bien sûr la description du commit, par exemple :
  * fix - survol des boutons
  * feature - ajout du responsive sur la page d'accueil
  * refacto : section téléchargements
  * \[fix #123\] menu déroulant sur mobile  

Vous noterez le dernier exemple qui référence directement le numéro de l'issue (bug, ou ticket) dans le titre du commit, **c'est très important** car cela permet de facilement retrouver les bugs en questions

* * *

### Workflow

Travailler à plusieurs sur le même code source nécessite d'avoir une discipline, une méthode de travail commune.

Parmi ces méthodes, la plus simple et la plus efficace à mes yeux reste celle de chez Github, le GitHub Flow :

* **une seule branche master** (pas de branche develop ici)
* tout ce qui est dans master peut être déployé en **production**
* **créer des branches de feature aux noms explicites depuis master** : par exemple `feature/responsive-page-accueil` ou `fix/menu-deroulant-mobile`
* pousser sur **origin** régulièrement : cela permet de communiquer avec l'équipe
* ouvrir une **pull-request** dès qu'on pense avoir terminé ou qu'on est coincé, la pull-request permet de demander une **revue du code**. Il est alors possible de commenter le code, d'apporter des modifications et de visualiser ce que l'on s'apprête à fusionner dans **master**
* fusionner seulement après une **pull-request review**: un développeur ne doit pas fusionner sa branche dans master lorsqu'il pense que c'est bon, un autre doit venir faire une **revue du code** et confirmer la stabilité de la branche

La méthode GitHub Flow en détail : [https://guides.github.com/introduction/flow/](https://guides.github.com/introduction/flow/)

* * *

## HTML

Dans [l'introduction](/confluence/pages/viewpage.action?pageId=46745647) nous avons pu voir ensemble des sujets transverses au développement web.

Ici nous allons nous pencher sur la structure de toute page web, les balises HTML, aussi appelées tag ou DOM Element.

* * *

### Sémantique

Ne pas utiliser **`<br />`** pour séparer des éléments. Pour séparer plusieurs groupes de texte, on utilisera des **`<p>`**.

**Pour espacer des éléments d'interface, on utilisera du CSS**.

Utiliser les balises HTML existantes sémantiques si elles existent.

Ne pas utiliser d'éléments génériques comme **`<div>`** ou **`<span>`** si un élément HTML existe déjà pour cette fonction. Utiliser par exemple **`<ul>`**, **`<ol>`** ou **`<dl>`** pour une liste, ou **`<table>`** pour des données tabulaires.

Tirer profit des balises **`<table>`** spécifiques. Par exemple **`<thead>`**, **`<tbody>`** et **`<tfoot>`** permettent de définir respectivement le **`header`**, le **`body`** et le **`footer`** d'un tableau.

L'intérêt d'avoir une bonne sémantique est multiple :

* Le code est plus lisible et donc plus facilement maintenable par les développeurs
* Un site avec un code source ayant une sémantique correcte sera mis en avant par les moteurs de recherche car les informations contenues dans le site seront mieux extraites
* Un code sémantique est plus rapide à taper, et les styles associés le seront aussi

Évitez :

```html
<div class="image-avatar" style="background-image: url('mon-image.jpg')"></div>
```

Préférez :

```html
<img class="avatar" src="mon-image.jpg" />
```

* * *

### Formulaires

Toujours lier chaque **`<input>`**, **`<select>`**, **`<textarea>`**, etc. à un élément **`<label>`** grâce aux attributs **`name`** et **`for`**.

Cette liaison permet d'avoir un formulaire :

* plus simple à utiliser, quand un utilisateur clique sur un label `for="accept"` l'input associé gagne le focus
* plus accessible aux personnes malvoyantes
* bien pris en charge par les différents navigateurs

Évitez :

```html
<div>
  J'accepte les conditions <input type="checkbox" id="accept">
</div>
```

Préférez :

```html
<div>
  <label for="accept">J'accepte les conditions</label>
  <input type="checkbox" name="accept" id="accept">
</div>
```

* * *

### Balises

**Indenter** chaque balise.

Cela permet de visualiser plus facilement la **hiérarchie** des différents éléments.

Pour l'uniformité, toujours écrire les balises en **minuscule**.

Toujours **fermer** les balises.Ajouter un /> de fermeture pour les **self-closing tags**.

Utiliser un **minimum** de balises.

Tirez profit du fait qu'on puisse ajouter plusieurs classes CSS à un même élément pour éviter d'ajouter des balises `<span>` ou `<div>` inutiles.

Évitez :

```html
<DIV class="section-entete"> <span class="titre">Bienvenue</span> <img src="image.jpg"> </DIV>
```

Préférez :

```html
<section class="entete">
  <h1>Bienvenue</h1>
  <img src="image.jpg" />
</section>
```

* * *

### Attributs

Toujours en **minuscule**, comme pour les balises, pour l'uniformité.

Utiliser les **doubles quotes**.

Ne pas ajouter de valeurs aux attributs de type booléens. En effet il est inutile d'ajouter une valeur aux attributs booléens, leur présence signifie **true** et leur absence **false**.

Pour les attributs **personnalisés**, ajouter un préfixe **`"data-"`**

Évitez :

```html
<input TYPE="text" disabled="disabled" user='12' />
```

Préférez :

```html
<input type="text" disabled data-user="12" />
```

* * *

### Liens ou URL

Utiliser des adresses relatives, sauf s'il est nécessaire de pointer vers un autre domaine.

Les syntaxes **`href="./path/to/page.html"`** et **`href="path/to/file.html"`** étant équivalentes, on préférera la seconde car elle est plus succincte.

Si on doit utiliser des adresses absolues (limitation du framework, profondeur de lien trop complexe), on utilisera la syntaxe **`//`**, qui permet d'utiliser HTTPS ou HTTP en fonction du contexte.

Évitez :

```html
<a href="/path/to/file.html">Lien</a>
<a href="./path/to/file.html">Lien</a>
<a href="http://www.site.com/path/to/file.html">Lien</a>
```

Préférez :

```html
<a href="path/to/file.html">Lien</a>
<a href="//www.site.com/path/to/file.html">Lien</a>
```

* * *

### Images

Toujours mettre un attribut **alt** pour l'accessibilité, cela permet aux terminaux qui ne peuvent pas afficher d'image d'avoir une information sur le contenu de l'image.

**N'utiliser `<img>` que pour des images de contenu** : seules les images qui apportent un contenu à la page (comme une illustration) doivent utiliser des balises `<img>`. Toutes les images de présentation (bulletpoint, icône, fond, etc.) doivent trouver leur place dans le CSS.

Évitez :

```html
<div class="image-avatar" style="background-image: url('mon-image.jpg')"></div>
```

Préférez :

```html
<img class="avatar" src="mon-image.jpg" />
```

* * *

### Compatibilité

Toujours utiliser le doctype HTML5. Cela nous permet d'avoir la plus grande cohérence d'affichage sur l'ensemble des navigateurs.

Un **doctype est obligatoire** pour forcer les navigateurs à utiliser un moteur de rendu

Toujours dire à IE d'utiliser la dernière version de son moteur de rendu, sans cette balise, il utilisera un fallback de compatibilité moins performant.

```html
<meta http-equiv="X-UA-Compatible" content="IE=Edge">
```

Toujours utiliser le bon encodage, il est important d'indiquer dans le **`<head>`** que la page est en **`UTF-8`** avec la balise suivante :

```html
<meta charset="UTF-8">
```

Exemple de structure HTML simple :

```html
<!DOCTYPE html>  
<html lang="fr">  
<head>  
<meta charset="utf-8">  
<title>I Love HTML</title>  
<link rel="stylesheet" href="application.css">  
</head>  
<body>
  <h1>HTML Forever</h1>
  <script src="application.js"></>  
</body>  
</html>
```

* * *

## JavaScript

JavaScript vient en **complément** de la base HTML et CSS. Il améliore **l'expérience** et le **comportement** de la page utilisateur aussi appelée **UX** (User Experience).

Voici les bonnes pratiques à respecter en général :

* Favoriser les frameworks et la pratique du code [DRY](http://fr.wikipedia.org/wiki/Ne_vous_r%C3%A9p%C3%A9tez_pas)
* **Pas de JavaScript embedded**
* **Pas de JavaScript inline**
* Toujours être sur la défensive, en utilisant des fonctions de détection
* Minimiser le nombre d'événements sur une page : [utiliser la délégation des événements](https://javascript.developpez.com/actu/85848/Comprendre-la-delegation-d-evenement-en-JavaScript/)
* Conserver les composants indépendants dès que possible
* Toujours ajouter les **`{`** et **`}`** sur les **`if`**, **`while`**, etc

* * *

### Égalités

Une des bonnes pratiques concerne les tests d'égalité ou comparaison.

**Il faut toujours utiliser le triple égal `===` pour avoir les égalités strictes, les comparaisons à base de `==` sont sujettes à de nombreux effets de bords.**

Voici une table qui montre les dérives du double égal :

![double-dangers](https://i.imgur.com/XDgmR51.png)
(je vous conseille de tester par vous même à la [source](https://slikts.github.io/js-equality-game/))

On peut voir ci-dessus en vert les **égalités logiques et strictes** comme :

* `true` est **strictement** égal à `true` (deux booléens égaux entre eux)
* `1` est **strictement** égal à `1` (deux nombres entiers égaux entre eux)
* `"false"` est **strictement** égal à `"true"` (deux chaines de caractère)

Mais on peut aussi voir certaines **aberrations qui sont aussi des égalités non strictes** (en rouge) :

* `true` est équivalent à `1` (un booléen et un nombre entier)
* `true` est équivalent à `"1"` (un booléen et une chaine de caractère contenant un)
* `false` est équivalent à `"0"` (un booléen et une chaine de caractère contenant zéro)
* `0` est équivalent à `""` (un nombre entier et une chaine de caractère vide)

La liste est longue comme vous pouvez le constater et je n'ai listé que quelques exemples qui vous montrent le **laxisme de la comparaison double**.

Aucune de ces égalités (en rouge) ne serait vraie au sens strict :

* `true` n'est **pas strictement** égal à `1`
* `true` n'est **pas strictement** égal à `"1"`
* `false` n'est **pas strictement** égal à `"0"`
* `0` n'est **pas strictement** égal à `""`

Exemple dans la console de Chrome :

```js
(0 == "")  // true
(0 === "") // false
```

Vous voilà prévenus, **en utilisant des comparaisons laxistes, on laisse la porte ouverte aux bugs**.

Par exemple ici, cette fonction (triviale certes) teste si l'utilisateur est autorisé à accéder à des ressources confidentielles :

```js
function hasAccess(id) {
    if (id == 0){
        // only admin
        return true
    } else {
        return false
    }
}
```

On peut voir dans le commentaire que seul l'administrateur possède l'identifiant `0`

Faisons le test dans la console JavaScript :

```js
hasAccess(0)  // true
hasAccess(42) // false
```

Très bien, on voit bien que l'utilisateur 42 n'a pas accès.

Et si un enregistrement en base ne s'est pas déroulé comme prévu et que l'identifiant n'a pas été généré comme il se doit ? Ou si c'est un utilisateur sans compte et qu'il n'a pour le coup pas d'identifiant attitré ?

```js
hasAccess("")  // true
```

Bien sûr, ceci est un exemple, mais cette fonction `hasAccess` n'est pas sûre de par son usage du double égal, en ajoutant un petit égal de plus on évite le problème ci-dessus.

* * *

### Variables

Les bonnes pratiques liées aux **variables** :

* Précéder chaque déclaration de variable par **`var`** ou **`let`** et **`const`** dans les versions plus récentes
* Utiliser des variables en camelCase
* Utiliser des constantes en MAJUSCULE_AVEC_UNDERSCORE
* Utiliser une majuscule à la première lettre des constructeurs
* Garder une portée globale propre : [utiliser des namespaces](https://falola.developpez.com/tutoriels/javascript/namespace/), exemple ci-dessous

```js
// Pollution du namespace global
var showUser = true
var blockEdition = false
var maxDownloads = 3

// Pas de pollution
var app = {};
app.settings = {
    showUser: true,
    blockEdition: false,
    maxDownloads: 3
};
```

#### Français ou Anglais

En général (et si les membres de l'équipe sont à l'aise avec) on choisit **l'anglais**.

Je vous conseille de choisir et de ne garder qu'une langue pour les nommages.

Pensez aux personnes qui reprendront le projet, qui vont chercher un fichier ou une méthode, par exemple ici dans la capture ci-dessous :

* newEntry ?
* newEntree ?
* nouvelleEntry ?
* nouvelleEntree ?

![franglais](https://i.imgur.com/MDNXVc0.png)

Parfois, on doit fournir des documentations aux clients, ça ne donne pas une image très professionnelle d'utiliser du Franglais de cette façon.

Le franglais ne doit être utilisé que pour les termes métier et les acronymes.

Un bon article sur le blog de [Xebia](https://blog.xebia.fr/2010/02/18/nommage-en-anglais-ou-francais-ou-franglais)

En effet comme dit l'auteur de l'article, il faut définir la bonne frontière, rester clair et cohérent.

Voici l'exemple ci-dessus, renommé par ordre de préférence, du mieux au pire :

1. newEntry
2. nouvelleEntree
3. newEntree
4. nouvelleEntry

* * *

### Fichiers de configuration

On commence par écrire :

```js
function getUser(id) {
  return get('http://localhost:8080/aidegestion/rest/user/' + id)
}
```

puis on ajoute :

```js
function deleteUser(id) {
  return delete('http://localhost:8080/aidegestion/rest/user/' + id)
}
```

puis :

```js
function updateUser(id, data) {
  return update('http://localhost:8080/aidegestion/rest/user/' + id, data)
}
```

Et on finit par avoir ceci :

![static-strings](https://i.imgur.com/t4UYYt4.png)

Ce genre d'URL a sa place dans un fichier de configuration, **le code source d'une app ne doit pas être changé si demain l'API change d'adresse**.

Il en va de même pour toutes les autres chaines de caractères, identifiants, token et autres qui sont de l'ordre de la configuration.

Solution : créez un fichier de configuration et importez-le dans chaque fichier source qui a besoin d'utiliser une entrée de la configuration.

On se retrouve avec un code plus clair et une app configurable :

```js
import config from '../config'

function getUser(id) {
  return get(config.api + '/user/' + id)
}
```

### Commentaires

Souvent oubliés ou esquivés par le développeur initial, les commentaires s'avèrent indispensables lorsqu'une autre personne a besoin de faire des évolutions ou des correctifs sur le code.

Bien sûr, les commentaires sont nécessaires dans des situations particulières.

Commentaire inutile :

```js
// Retourne le nom de l'utilisateur
function getUserName() {
    ...
}
```

Commentaire utile :

```js
// Retourne les données associés à l'utilisateur au format objet
// { name: "John", lastName: "Doe", age: 21 }
function getUserData(id) {
    ...
}
```

Pour les fonctions, la meilleure pratique est encore de la décorer avec JSDoc :

```js
/**
 * Retourne les données associées à l'utilisateur
 * @param {number} id - L'identifiant unique utilisateur
 * @returns {User} Données utilisateur au format objet { name: "John", lastName: "Doe", age: 21 }
 */
function getUserData(id) {
    // ...
}
```

L'intérêt derrière est d'avoir toutes les définitions de fonctions directement dans l'IDE :

![jsdoc](https://i.imgur.com/putcr6z.png)

* * *

### Frameworks

Les frameworks permettent de **cadrer les développements** et surtout de **gagner du temps**.

#### Choisir un framework

Pour le web, voici les géants qui s'affrontent : **Angular**, **Vue** et **React**.

Précision : Angular.js est la première version, renommée simplement "Angular" depuis la version 2, c'est bien le dernier que nous aborderons dans ce guide. Toutefois à titre de comparaison, il est intéressant de regarder ce qui se passe côté Angular.js

Voici un graphique représentant l'intérêt suscité par les développeurs sur GitHub lors de ces 5 dernières années :

![Stars-Comparison](https://i.imgur.com/3dll5iR.png)

On peut voir qu'Angular n'est plus aussi populaire qu'il a été.

Regardons maintenant du côté des téléchargements annuels :

![annual-downloads](https://i.imgur.com/snsIl3N.png)

On ne retrouve pas les mêmes tendances, en effet, la popularité et l'utilisation ne se reflètent pas toujours.

**React** et **Vue** on une belle côte de **popularité**, pour autant React domine largement sur les téléchargements (86 millions), suivi par Angular.js (@angular/core avec 37 millions) en seconde place puis en dernière position Vue est à égalité avec Angular avec environs 13 millions de téléchargements annuels.

Ces téléchargements représentent le nombre de projets qui démarrent, les POC, les déploiements continus, etc. Par exemple pour expliquer la position d'Angular.js à la seconde place, on peut imaginer qu'un grand nombre de projets qui ont été développés avec sont toujours maintenus et du coup les CI continuent de télécharger cette librairie, contribuant à lui garder une belle place dans ce classement en 2018.

Malgré sa deuxième place, Angular.js n'est plus un choix à considérer en 2018, la communauté ayant migré vers Angular et d'autres frameworks ou librairies.

Voyons ensemble ce qui distingue Angular, React et Vue.

|              | Angular        | React        | Vue               |
| ------------ | -------------- | ------------ | ----------------- |
| Type         | **Framework**  | *Librairie*  | **Framework**     |
| Fondateurs   | Google         | Facebook     | Ex-employé Google |
| Sorti en     | Septembre 2016 | Mars 2013    | Février 2014      |
| App natives  | NativeScript   | React Native | *Weex*            |
| Montée       | Standard       | *Difficile*  | **Facile**        |
| Debugging    | Standard       | *Difficile*  | Standard          |
| Data-Binding | Two-way        | One-way      | One & Two-way     |

Et voici leurs points communs :

* compatibles avec **TypeScript**, l'indispensable pour tous les nouveaux projets
* de bonnes **performances** vis-à-vis d'autres frameworks non cités ici
* de grandes **communautés** qui permettent d'avoir des plug-ins, du support, etc

Les inconvénients selon moi (en italique dans le tableau) :

* **React n'est pas un framework**, il ne donne pas de structure à un projet, il demande d'avoir un architecte compétent pour bien initialiser la stack et d'avoir aussi des développeurs qualifiés qui connaissent bien React et les bonnes pratiques React pour ne pas faire n'importe quoi
* Sur le sujet des applications natives, c'est Vue qui est un peu en retrait avec son projet **Weex** qui **est encore en cours de développement**
* Pour ce qui est de la montée en compétence, **Vue est vraiment simple à prendre en main** tandis que **React reste difficile** de prime abord et difficile à maintenir proprement
* Côté debugging, j'ai une préférence pour Vue et d'amers souvenirs avec React (et React Native)

Comment choisir selon moi :

* pour un démarrage facile, un code propre et facilement maintenable : **Vue**
* pour une équipe qui a déjà travaillé sur JavaScript ou Angular.js : **Vue**
* pour une équipe qui a déjà travaillé sur Angular : **Angular** ou **Vue**
* pour un projet qui a des besoins web et natifs : **Angular** ou **React** (tant que Vue Weex n'est pas stable)

Vous l'aurez compris, j'ai un faible pour **Vue**, je l'utilise depuis plusieurs années sur des projets de toutes sortes et n'ai jamais été déçu. J'ai aussi eu l'occasion de présenter et faire tester Vue à des développeurs débutants qui m'ont confirmé que Vue était plus simple à appréhender et à pratiquer.

Comme toutes les opinions, il n'y en a pas une de mieux qu'une autre, et les opinions sont aussi le reflet d'une pensée et d'une expérience à un instant T, tout peut changer à T + 1. N'hésitez pas à réagir face à ce comparatif.

#### Choisir une librairie

Une fois le framework choisi, on ajoute des librairies spécifiques **qui ne sont pas embarquées** avec le framework : animations, visualisation de données, **polyfill** (fonctionnalités qui ne sont pas supportées par certains navigateurs), etc.

> Si vous voulez utiliser une librairie, vous devez la lire, la comprendre, être d'accord avec elle, et ne pas être capable d'en écrire une meilleure quand vous êtes en forme.
> @sentience

Voici les raisons qui poussent à embarquer une librairie :

* répond au besoin sans avoir besoin de l'adapter énormément
* n'est pas une "usine à gaz"
* on utilisera au moins 50% de ses capacités
* compatible avec nos navigateurs et OS cibles
* réputée, maintenue et sans trop de bugs ouverts (étoiles, contributeurs et issues sur GitHub par exemple)

Si un de ces problèmes apparaît, chercher une autre librairie ou en créer une :

* suite à l'intégration de la librairie, du développement custom sera nécessaire pour changer **beaucoup** de choses et l'adapter à notre besoin
* cette librairie pèse plus de 100kb minifiée
* contient une centaine de fonctionnalités, mais nous n'en avons besoin que de quelques-unes, l'import partiel n'est pas disponible
* n'est pas compatible avec un de nos navigateurs ou OS cible
* n'est plus maintenue depuis des années
* compte plusieurs dizaines de bugs ouverts depuis plusieurs mois et non traités
* compte plusieurs dizaines de bugs qui ont été clos sans être traités
* compte plus de fork que de stars, elle ne semble pas être adaptée en l'état

Il ne faut pas hésiter à créer son propre outil quand les libraires disponibles ne passent pas les critères ci-dessus. Un code qu'on crée est un code qu'on connait et qui sera facilement extensible et plus simple à maintenir.

Il faut garder à l'esprit que même si la création d'une librairie peut sembler risquée au premier abord, on se repose toujours sur des briques plus petites d'autres librairies qui respectent les critères.
  
**On ne réinvente jamais la roue.**

* * *

### Lint

Outil **indispensable** dans la stack d'un projet, grand gardien des **conventions de code**, voici les libraires les plus connues :

* Pour JavaScript, TypeScript (préconfiguré) : [Standard](https://github.com/standard/standard)
* Pour JavaScript (configurable) : [ESLint](https://eslint.org/) (ou [XO](https://github.com/xojs/xo) à tester)
* Pour TypeScript (configurable) : [TSLint](https://palantir.github.io/tslint/) ([TSStyle](https://github.com/google/ts-style) à tester)
* Pour CSS, Sass, etc. (configurable) : [StyleLint](https://stylelint.io/)
* Pour Markdown (préconfiguré) : [MarkdownLint](https://github.com/DavidAnson/markdownlint)
* Pour Markdown et textes statiques (configurable) : [TextLint](https://github.com/textlint/textlint)

Notez que les linters ci-dessus sont à installer dans la stack technique du projet, ils seront lancés pendant les développements, mais aussi avant chaque commit et chaque build.

Le but étant de garder une cohérence tout au long du processus de création et au sein d'une équipe.

**Pensez aussi à récupérer les extensions pour votre IDE afin de voir les erreurs de lint en amont.**

* * *

## CSS

Le HTML pose la structure, le JavaScript apporte la réactivité et les données dynamiques, il ne reste plus qu'à mettre tout cela en forme.

Voici les bonnes pratiques à respecter comme en JavaScript :

* Favoriser les frameworks et la pratique du code [DRY](http://fr.wikipedia.org/wiki/Ne_vous_r%C3%A9p%C3%A9tez_pas)
* **Pas de style embedded**
* **Pas de style inline**

Et les bonnes pratiques liées au styling uniquement :

* Je conserve le style complètement séparé du HTML (pas obligatoire avec **Vue**)
* Je code des composants (header, buttons, links, ...) et des modules  (reset, grilles, formulaires, typographie ...)

* * *

### Sélecteurs

Comme pour tous les langages, voici les conventions de nommages en CSS :

* **`.nom-de-classe`** : les classes visent la réutilisation, c'est la base du styling, on catégorise et groupe des styles dans des **classes réutilisables**
* les noms de classe vont du plus générique au plus spécifique, exemple : `.login-form-button` désigne le button dans un formulaire de login, et `.login-form-field` un champ dans un formulaire de login, sans conventions on peut retrouver ce genre de classes : `.form-button-login` et `.field-form-login`
* **`#identifiant-unique`** : chaque identifiant ne visent d'un seul élément HTML, **il n’existe que de très rares cas d'utilisation d'identifiants en CSS**, réfléchissez-y à deux fois avant de vous en servir

Bon exemple :

```html
<section class="back-grey">
  <h1>Bienvenue</h1>
  <button>Pas inscrit ? C'est parti !</button>
  <button class="secondary">Déjà inscrit ? M'identifier !</button>
  <button class="secondary">Continuer sans compte</button>
</section>
```

```css
.back-grey { background-color: #1acfee; }
button { font-size: 100%; color: black; }
button.secondary { font-size: 70%; color: grey; }
```

Les **bonnes** choses à dire sur ce code HTML & CSS :

* côté HTML la sémantique est respectée, simple et lisible
* côté CSS, le code est aussi simple et lisible
* `button` est stylisé par défaut et facilement extensible avec une classe `.secondary` qui permet de le customiser quand on le souhaite
* la classe `.secondary` est réutilisable **sans effets de bords** car elle ne concerne que les `button`
* la classe `.back-grey` est réutilisable et permet d'appliquer le même fond gris à plusieurs éléments sans risquer de se tromper de couleur

Mauvais exemple :

```html
<div style="background-color: #1acfee;">
  <span class="title">Bienvenue</span>
  <button class="button-normal blackColor">Pas inscrit ? C'est parti !</button>
  <button class="button-secondary" id="login">Déjà inscrit ? M'identifier !</button>
  <button class="button-secondary" id="skip">Continuer sans compte</button>
</div>
```

```css
.title { font-weight: bold; }
.button-normal { font-size: 100%; }
.button-secondary { font-size: 70%; }
.blackColor { color: black; }
#login, #skip { color: grey; }
```

Les **mauvaises pratiques** dans ce code HTML & CSS :

* côté HTML la sémantique n'est pas respectée, le code peu lisible
* côté CSS, le code est peu lisible
* le style appliqué en dur sur la `div`, risque d'oubli si on doit copier-coller cela ailleurs, manque de lisibilité, c'est quelle couleur `#1acfee` au fait ?
* la classe `.title` doit être remplacée par une balise de titre comme un `h1` par exemple
* `.button-normal` pourrait être simplifié en `.button` si on veut styliser les boutons, et pourquoi utiliser une classe plutôt que l'élément lui-même ?
* `.blackColor` ne respecte pas la syntaxe kebab-case et devrait être `.black-color`, cette dernière ne respecte pas non plus la règle de spécificité et devrait être `.color-black`
* les identifiants `#login` et `#skip` ont été utilisés pour styliser plusieurs choses de la même manière, il faut utiliser une classe pour ça
* les boutons ayant 2 styles, il est inutile de gaspiller du temps en découpant les classes avec des classes pour les font et les couleurs, afin de garder une uniformité et une simplicité, utiliser `.button-secondary { font-size: 70%; color: grey; }` ou mieux encore comme dans le bon exemple : `button.secondary { font-size: 70%; color: grey; }`

* * *

### IE or not IE

La priorité est de développer pour les navigateurs respectueux des standards (Google Chrome, Firefox par exemple). Je fixe les bugs pour internet Explorer par la suite sauf si le client a un besoin prioritaire sur IE.

> Je remercie chaque jour les navigateurs modernes d'avoir une certaine cohérence. Je n'ai jamais eu besoin de hack pour régler un problème sur un navigateur spécifique autre que IE.
> Sans Internet Exporer, le développement front-end serait un jeu d'enfant.
> -- [David Leuliette](https://davidl.fr/manifesto.html)

Ajoutons cette balise pour rendre IE Compatible avec lui-même :

```html
<meta http-equiv="X-UA-Compatible" content="IE=edge">
```

Pour tester IE, voir la section sur les navigateurs dans l'introduction.

Pour créer des patchs spécifiques pour IE on peut utiliser des commentaires conditionnels :

```html
<!--[if lte IE 8 ]><body class="lte-ie8"> <![endif]-->
<!--[if IE 9 ]> <body class="ie9"> <![endif]-->
<!--[if (gt IE 9)|!(IE)]><!--> <body> <!--<![endif]-->
```

La technique ci-dessus est ma favorite lorsque la compatibilité IE a été vendue (et donc obligatoire :/), elle permet de poser des classes en fonction de la version d'IE et d'ensuite appliquer des hacks du genre :

```css
.rgba-bg {
  background-color: rgba(255,0,0,0.2);
}
.lte-ie8 .rgba-bg {
  background-image: url('i/rgba/red-02.png');
}
```

Ce patch (ou hack) permet par exemple d'avoir une image de fond sur IE 8 et plus anciens (IE6, IE7) car comme on peut le voir sur [CanIUse](https://caniuse.com/#feat=css3-colors), les couleurs définies en rgba ne sont pas prises en charge qu'à partir d'IE 9.

Deux très bons articles sur le sujet des hacks IE :

* en français chez [AlsaCreations](https://www.alsacreations.com/astuce/lire/988-classes-conditionnelles-HTML.HTML)
* en anglais chez [Css-Tricks](https://css-tricks.com/how-to-create-an-ie-only-stylesheet/)

* * *

## Glossaire

* **API** (Application Programming Interface) : ensemble normalisé de classes, de méthodes ou de fonctions qui sert de façade par laquelle un logiciel offre des services à d'autres logiciels
* **CSS** (Cascading Style Sheets) : feuilles de style en cascade, décris la présentation (le style) des documents HTML et XML
* **DOM** (Document Object Model) : est une interface de programmation normalisée par le W3C, qui permet à des scripts d'examiner et de modifier le contenu du navigateur web
* **DRY** (Don't Repeat Yourself) : Ne vous répétez pas, une philosophie en programmation informatique consistant à éviter la redondance de code
* **HTML** (Hyper Text Markup Language) : le langage de balisage conçu pour représenter les pages web
* **IDE** (Integrated Development Environment) : Environnement de développement intégré, un éditeur de code
* **IE** (**I**nternet **E**xplorer) : parfois abrégé IE, MIE ou MSIE, est le navigateur web développé par la société américaine Microsoft et installé par défaut avec Windows
* **POC** (Proof of Concept) : démonstration de faisabilité, une réalisation (projet) expérimentale concrète et préliminaire, courte ou incomplète, illustrant une certaine méthode ou idée afin d'en démontrer la faisabilité
* **Sass** (Syntactically Awesome Style Sheets) : langage permettant de produire du CSS de manière plus simple et plus lisible
* **URL** (Uniform Resource Locator) : synonyme de l'expression « adresse web » ou « lien » , qui désigne une chaine de caractères utilisée pour identifier les ressources du Web : page, image, son, etc
* **Vue** : un framework open source JavaScript orienté simplicité et composants réutilisables
