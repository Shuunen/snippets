# Guide du Développement Web : Introduction

Ce guide a pour objectif **d'informer** mais aussi de **cadrer** les développements **front-end**.

Notre objectif est de fournir un contenu de haute **qualité** à nos client, des sites qui fonctionne mieux, atteignent un maximum de personnes et pas seulement avec les navigateurs et appareils d'aujourd'hui, mais aussi avec ceux de demain.

Ce guide est **collaboratif**, les lecteurs sont invités à avoir un regard critique et à réagir afin d'améliorer ce guide.

Il se veut synthétique afin de pouvoir s'y référer rapidement de temps en temps.

C'est pourquoi il sera proposé aux collaborateurs d'aller voir d'eux même des articles en détails s'ils n'ont pas les bases ou s'ils veulent plus de détails.

Je recommande tout particulièrement ces sites qui sont, selon moi, à garder sous la main :

* [https://developer.mozilla.org/fr/docs/Web](https://developer.mozilla.org/fr/docs/Web): maintenu par Mozilla, il regroupe des tutoriels et de la documentation technique claire (oui, ça existe)
* [https://devdocs.io/](https://devdocs.io/): cette webapp permet d'accéder à toutes les documentations des technologies et librairies les plus populaires, cela permet d'avoir un unique point d'entrée pour toutes les documentations

> Aucun d'entre nous n'est plus intelligent que l'ensemble d'entre nous.
> -- Kenneth Blanchard

* * *

## Les navigateurs

En fonction des projets, différents navigateurs devront être supportés.

### Avant de vendre un projet

Cibler les navigateurs :

* Regarder la part de marché des navigateurs dans le pays cible du client, ou dans le monde si nécessaire.
* Regarder les statistiques liées à la clientèle du client en question.
* Par exemple, dans le cadre d'une refonte d'un site internet d'un client, si ce dernier a inclus un scriptGoogle Analyticssur son ancien site, les données collectées permettront de connaitre les cibles : les visiteurs du site.
* Si 80% des visiteurs utilisent Internet Explorer 9 alors il faudra être compatible avec ce dernier, si à l'inverse seulement 2% utilisent Internet Explorer 8 alors la compatibilité (extrêmement coûteuse) IE8 ne sera pas nécessaire.
* Cibler les navigateurs c'est aussi cibler les versions, Firefox ? oui mais à partir de quelle version ?
* Si le client n'est pas inquiet vis à vis de cette sélection de navigateurs cibles, alors choisissons simplement les navigateurs actuels dans leurs dernières versions
* Le site [http://gs.statcounter.com/](http://gs.statcounter.com/) est très pratique pour voir toutes les statistiques

Clarifier avec le client :

* Le site ne s'affichera pas **exactement** de la même façon sur tous les navigateurs, ni sur tous les systèmes d'exploitation

> Une page doit jouer son rôle d'information et ne pas apparaître cassée. Le problème n'est pas le rendu des navigateurs, il s'agit d'offrir aux utilisateurs le meilleur contenu en fonction de leur appareil de navigation.
> -- [David Leuliette](https://davidl.fr/manifesto.html)

### Phase de développement / maintenance

Une fois le projet vendu, les navigateurs ciblés devront être compatibles avec le site web produit.

Pour se faire il faut tester le site sous ces différents navigateurs et dans les versions vendues au client.

Il existe plusieurs manière de tester le site :

* avoir un poste physique avec navigateur installé (limité à une version de chaque navigateur)
* avoir un poste physique avec navigateur portable (permet de faire coexister plusieurs versions d'un même navigateur)
* avoir une machine virtuelle avec navigateur (permet de tester d'autres systèmes d'exploitation)
* utiliser un service en ligne comme [BrowserStack](https://www.browserstack.com/) qui permet de tester quasiment tous les navigateurs sur tous les systèmes

La dernière solution est la plus intéressante même si elle a un coût, **ce coût sera rentabilisé** :

* il est moins coûteux de pouvoir facilement tester un site au cours du développement (et ainsi d'éviter des bugs liés aux différences entre navigateurs et systèmes) que de ne pas tester et laisser les bugs fleurir d'eux même lors des phases de recette
* pendant une phase de correction, un développeur ira plus vite en utilisant une plateforme de test en ligne, identifier le problème plus vite c'est aussi le corriger plus vite, et donc pour moins cher
* avoir une plateforme de test en ligne c'est aussi une économie sur l'achat de périphériques de test

* * *

## Les éditeurs (IDE)

Pour ce qui est du développement front, plusieurs IDE reconnus sont disponibles mais voici ceux que je recommande :

* **Visual Studio Code** : complet, gratuit et performant, maintenu par Microsoft, facile à prendre en main, peu gourmand en ressources
* Web Storm : très complet mais payant, peut être lourd à l'utilisation pour une machine peu puissante

J'utilise **VS Code** depuis qu'il est sorti en 2015 et il a admirablement remplacé tout les IDE que j'ai pu avoir par le passé : Eclipse, Netbeans, Sublime Text, Web Storm

Il est vivement conseillé d'avoir le même IDE au sein d'une équipe afin de limiter les changements de formatage typiques de certains IDE

Une fois que l'équipe a tranché sur l'IDE il est nécessaire de se mettre d'accord sur certaines règles de formatage :

* la plupart ne sont **pas discutables** : les noms de classes CSS sont en kebab-case par exemple, les noms de constantes en majuscules
* certaines sont plus **discutables** et aux goûts de chacun : la taille de l'indentation (2 ou 4 espaces), le nommage des couleurs en Sass

En général il est conseillé de :

1. mettre en place un fichier .editorconfig à la racine du projet, je conseille par exemple celui de [Babel](https://github.com/babel/babel/blob/master/.editorconfig)
2. utiliser un linter comme ESlint ou TSlint avec les règles recommandées
3. configurer le linter au fur et à mesure des développements si l'équipe est d'avis de changer une des règles **discutables**

* * *

## Le versioning

La gestion des versions n'étant pas une option, il faut à minima se mettre d'accord sur les commits :

* la langue : français, anglais, cela dépendra de l'équipe et du client si le code est hébergé chez ce dernier
* le nommage : un nommage couramment utilisé inclus le type (fix, feature, update, refacto, ...) et bien sûr la description du commit, par exemple :
  * fix - survol des boutons
  * feature - ajout du responsive sur la page d'accueil
  * refacto : section téléchargements
  * \[fix #123\] menu déroulant sur mobile  

Vous noterez le dernier exemple qui référence directement le numéro de l'issue (bug, ou ticket) dans le titre du commit, **c'est très important** car cela permet de facilement retrouver les bugs en questions

* * *

## Le workflow

Travailler à plusieurs sur le même code source nécessite d'avoir une discipline, une méthode de travail commune.

Parmi ces méthodes, la plus simple et la plus efficace à mes yeux reste celle de chez Github, le Github Flow :

* **une seule branche master** (pas de branche develop ici)
* tout ce qui est dans master peut être déployé en **production**
* **créer des branches de feature aux noms explicites depuis master** : par exemple `feature/responsive-page-accueil` ou `fix/menu-deroulant-mobile`
* pousser sur **origin** régulièrement : cela permet de communiquer avec l'équipe
* ouvrir une **pull-request** dès qu'on pense avoir terminé ou qu'on est coincé, la pull-request permet de demander une **revue du code**. Il est alors possible de commenter le code, d'apporter des modifications et de visualiser ce que l'on s'apprête à fusionner dans **master**
* fusionner seulement après une **pull-request review**: un développeur ne doit pas fusionner sa branche dans master lorsqu'il pense que c'est bon, un autre doit venir faire une **revue du code** et confirmer la stabilité de la branche.

La méthode Github Flow en détails : [https://guides.github.com/introduction/flow/](https://guides.github.com/introduction/flow/)

* * *

# HTML

Dans [l'introduction](/confluence/pages/viewpage.action?pageId=46745647) nous avons pu voir ensemble des sujets transverses au développement web.

Ici nous allons nous pencher sur la structure de toute page web, les balises HTML, aussi appelées tag ou DOM Element

* * *

## Sémantique

Ne pas utiliser **`<br />`** pour séparer des éléments. Pour séparer plusieurs groupes de texte, on utilisera des **`<p>`**.

**Pour espacer des éléments d'interface, on utilisera du CSS**.

Utiliser les balises HTML existantes sémantiques si elles existent.

Ne pas utiliser d'éléments génériques comme **`<div>`** ou **`<span>`** si un élément HTML existe déjà pour cette fonction. Utiliser par exemple **`<ul>`**, **`<ol>`** ou **`<dl>`** pour une liste, ou **`<table>`** pour des données tabulaires.

Tirer profit des balises **`<table>`** spécifiques. Par exemple **`<thead>`**, **`<tbody>`** et **`<tfoot>`** permettent de définir respectivement le **`header`**, le **`body`** et le **`footer`** d'un tableau.

L'intérêt d'avoir une bonne sémantique est multiple :

* Le code est plus lisible et donc plus facilement maintenable par les développeurs
* Un site avec un code source ayant une sémantique correcte sera mis en avant par les moteurs de recherche car les informations contenues dans le site seront mieux extraite
* Un code sémantique est plus rapide à taper, et les styles associés le seront aussi

évitez

```html
<div class="image-avatar" style="background-image: url('mon-image.jpg')"></div>
```

préférez

```html
<img class="avatar" src="mon-image.jpg" />
```

* * *

## Formulaires

Toujours lier chaque **`<input>`**, **`<select>`**, **`<textarea>`**, etc à un élément **`<label>`** grâce aux attributs **`name`** et **`for`**.

Cette liaison permet d'avoir un formulaire :

* plus simple à utiliser, quand un utilisateur clique sur un label `for="accept"` l'input associé gagne le focus
* plus accessible aux personnes mal-voyante
* bien pris en charge par les différent navigateurs

évitez :

```html
<div>
  J'accepte les conditions <input type="checkbox" id="accept">
</div>
```

préférez :

```html
<div>
  <label for="accept">J'accepte les conditions</label>
  <input type="checkbox" name="accept" id="accept">
</div>
```

* * *

## Balises

**Indenter** chaque balise.

Cela permet de visualiser plus facilement la **hiérarchie** des différents éléments.

Pour l'uniformité, toujours écrire les balises en **minuscule**.

Toujours **fermer** les balises.Ajouter un /> de fermeture pour les **self-closing tags**.

Utiliser un **minimum** de balises.

Tirez profit du fait qu'on puisse ajouter plusieurs classes CSS à un même élément pour éviter d'ajouter des balises `<span>` ou `<div>` inutiles.

évitez :

```html
<DIV class="section-entete"> <span class="titre">Bienvenue</span> <img src="image.jpg"> </DIV>
```

préférez :

```html
<section class="entete">
  <h1>Bienvenue</h1>
  <img src="image.jpg" />
</section>
```

* * *

## Attributs

Toujours en **minuscule**, comme pour les balises, pour l'uniformité.

Utiliser des **double quotes**.

Ne pas ajouter de valeurs aux attributs de type booléens. En effet il est inutile d'ajouter une valeur aux attributs booléens, leur présence signifie **true** et leur absence **false**.

Pour les attributs **personnalisés**, ajouter un préfixe **`"data-"`**

évitez :

```html
<input TYPE="text" disabled="disabled" user='12' />
```

préférez :

```html
<input type="text" disabled data-user="12" />
```

* * *

## URL

Utiliser des adresses relatives, sauf s'il est nécessaire de pointer vers un autre domaine.

Les syntaxes **`href="./path/to/page.html"`** et **`href="path/to/file.html"`** étant équivalentes, on préférera la seconde car elle est plus succincte.

Si on doit utiliser des adresses absolues (limitation du CMS, profondeur de lien trop complexe), on utilisera la syntaxe **`//`**, qui permet d'utiliser https ou http en fonction du contexte.

évitez :

```html
<a href="/path/to/file.html">Lien</a>
<a href="./path/to/file.html">Lien</a>
<a href="http://www.site.com/path/to/file.html">Lien</a>
```

préférez :

```html
<a href="path/to/file.html">Lien</a>
<a href="//www.site.com/path/to/file.html">Lien</a>
```

* * *

## Images

Toujours mettre un attribut **alt** pour l'accessibilité, cela permet aux terminaux qui ne peuvent pas afficher d'image d'avoir une information sur le contenu de l'image.

**N'utiliser `<img>` que pour des images de contenu** : seules les images qui apportent un contenu à la page (comme une illustration) doivent utiliser des balises `<img>`. Toutes les images de présentation (bulletpoint, icone, fond, etc) doivent trouver leur place dans le CSS.

évitez :

```html
<div class="image-avatar" style="background-image: url('mon-image.jpg')"></div>
```

préférez :

```html
<img class="avatar" src="mon-image.jpg" />
```

* * *

## Compatibilité

Toujours utiliser le doctype HTML5. Cela nous permet d'avoir la plus grande cohérence de rendu sur l'ensemble des navigateurs.

Un **doctype est obligatoire** pour forcer les navigateurs à utiliser un moteur de rendu et prévenir le mode quirks avec Internet Explorer

Toujours dire à IE d'utiliser la dernière version de son moteur de rendu, sans cette balise, il utilisera un fallback de compatibilité moins performant.

```html
<meta http-equiv="X-UA-Compatible" content="IE=Edge">
```

Toujours utiliser le bon encodage, il est important d'indiquer dans le **`<head>`** que la page est en **`UTF-8`** avec la balise suivante :

```html
<meta charset="UTF-8">
```

exemple de structure HTML simple :

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

***

## Javascript

JavaScript vient en complément de la base HTML et CSS. Il améliore l'expérience et le comportement de la page utilisateur