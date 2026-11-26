# View Fields Demo

Ce module affiche, dans Content Editor, les champs d'un contenu selon la vue choisie dans `j:view`.
Il efface la valeur d'un champ masqué au moment de l'enregistrement, et seulement à ce moment-là.

Testé sur Jahia 8.2.3.7 avec jContent 3.8.2.

## Le principe

Un type de contenu active le comportement en étendant le mixin marqueur
`vfdmix:viewDependentFields`. Ce mixin ne porte aucune propriété. Chaque propriété du type indique
ensuite, par l'option `views` de son sélecteur, les vues dans lesquelles elle apparaît :

```cnd
[vfdnt:teaser] > jnt:content, jmix:editorialContent, mix:title, jmix:renderable, vfdmix:viewDependentFields
 - teaserText (string, textarea)
 - badge (string, text[views='card,list'])
 - cardSubtitle (string, text[views='card'])
 - maxItems (long, text[views='list'])
```

| Propriété | Vue `default` | Vue `card` | Vue `list` |
| --- | --- | --- | --- |
| `teaserText`, sans option `views` | visible | visible | visible |
| `badge` | masquée | visible | visible |
| `cardSubtitle` | masquée | visible | masquée |
| `maxItems` | masquée | masquée | visible |

Les règles sont les suivantes :

- Une propriété sans option `views` est toujours visible.
- Sans valeur de `j:view`, la vue est `default`.
- L'option se combine avec celles du sélecteur : `picker[type='image',views='card']`,
  `choicelist[resourceBundle,views='list']`.
- Un nœud peut aussi recevoir le mixin à titre individuel, même si son type ne l'étend pas.
- Un type qui porte l'option `views` sans le mixin n'est pas concerné : rien n'est masqué ni effacé.
  C'est le cas du type témoin `vfdnt:control`.

## Ce que voit le contributeur

- La section **Layout**, qui contient `j:view`, s'affiche en premier et reste ouverte.
- Quand la vue change, les champs s'affichent ou se masquent aussitôt. Leurs valeurs restent dans
  le formulaire : en revenant à la vue précédente, le contributeur les retrouve.
- À l'enregistrement, la valeur de chaque champ masqué par la vue choisie est retirée.
  - En édition, une valeur déjà stockée est supprimée du nœud.
  - En création, la valeur n'est pas écrite, même si c'est la valeur par défaut de la propriété.

## Le fonctionnement

### Côté serveur

`META-INF/jahia-content-editor-forms/forms/vfdmix_viewDependentFields.json` s'applique à tout type
qui porte le mixin. Il donne à la section `layout` le rang 0.5, avant `content` (1.0), et l'ouvre
au chargement (`expanded: true`).

Les champs ne sont **pas** masqués par un override `"hide": true`. Le serveur retire un champ masqué
du formulaire qu'il envoie (`EditorFormServiceImpl`, filtre `Field::isVisible`). Le client n'aurait
alors plus rien à réafficher. Tous les champs arrivent donc visibles, et c'est le client qui les
masque.

### Côté client

`src/javascript/viewFields.js` enregistre trois extensions dans le registre de jContent :

| Extension | Rôle |
| --- | --- |
| `selectorType.onChange` sur `'*'` | Calcule la visibilité de chaque champ qui a une option `views`, à partir de la vue courante. Il modifie `field.visible` dans les sections, puis appelle `onSectionsUpdate()`. |
| `contentEditor.onEdit` | Juste avant la mutation d'enregistrement : retire les champs masqués de `propertiesToSave` et ajoute à `propertiesToDelete` ceux que le nœud stocke. |
| `contentEditor.onCreate` | Juste avant la création : retire les champs masqués de `properties`. |

Quelques points de détail :

- **Pourquoi `'*'`.** `onChange` ne se déclenche au montage que pour un champ dont la valeur
  initiale n'est pas nulle. Un `j:view` vide ne se déclencherait jamais. N'importe quel champ monté
  avec une valeur, comme `ce:systemName`, applique donc la vue qu'il lit dans Formik.
- **Le mixin, en édition.** Le module le lit dans les données du nœud : les supertypes du type
  primaire et les mixins du nœud.
- **Le mixin, en création.** Le formulaire ne charge pas les supertypes du nouveau type. Le module
  pose donc une fois la question au serveur (`nodeTypeByName { isNodeType }`) et garde la réponse
  pour `onCreate`.
- **La section Layout toujours ouverte.** Content Editor range l'état des sections dans Redux, sous
  la clé `formKey` du formulaire (`ceToggleSections`). Le module retrouve cette clé dans le hash de
  l'URL : `uuid` en édition, `contentType` en création. Il rouvre `layout` dès qu'elle est repliée,
  et oublie la clé quand le formulaire se ferme.

## Limites

- **Un champ obligatoire masqué reste validé.** L'enregistrement échoue alors sur un champ que le
  contributeur ne voit pas. Ne mettez pas d'option `views` sur une propriété `mandatory`.
- **Une valeur traduite masquée** n'est supprimée que dans la langue en cours d'édition.
- **API internes.** Le module s'appuie sur des API internes de jContent : la forme des sections,
  `visible`, `ceToggleSections` et le format du hash. Une montée de version de jContent peut le
  casser : relancez alors les tests manuels ci-dessous.
- **Modification de la CND.** Changer les supertypes d'un type déjà déployé est un « major change »
  que Jahia refuse. Sur un environnement de développement, supprimez les contenus de ces types,
  puis retirez les définitions du module avant de redéployer.

## Build et tests

```bash
mvn clean install                 # build : node et yarn sont installés par frontend-maven-plugin
node --test src/javascript/       # tests unitaires de la logique (sans Jahia)
```

Les tests manuels sur un Jahia :

1. Un `vfdnt:teaser` en vue `list` affiche `badge` et `maxItems`. En passant à `card`, `badge` et
   `cardSubtitle` s'affichent. Après l'enregistrement, `maxItems` a disparu du nœud.
2. Un `vfdnt:control` garde `maxItems` dans toutes les vues et après l'enregistrement.
3. Un `vfdnt:viewFieldsDemo` créé sans vue n'a aucune propriété dépendante de la vue, pas même
   `listStyle` et sa valeur par défaut.
4. La section Layout s'affiche en premier, ouverte, et se rouvre après un clic sur son en-tête.

## Organisation des fichiers

```text
src/main/resources/META-INF/definitions.cnd                         mixin marqueur et types d'exemple
src/main/resources/META-INF/jahia-content-editor-forms/forms/       section Layout en premier et ouverte
src/main/resources/vfdnt_*/html/                                    vues default, card et list
src/javascript/init.js                                              point d'entrée de l'app shell
src/javascript/viewFields.js                                        visibilité, enregistrement, section Layout
src/javascript/viewFields.test.mjs                                  tests unitaires
webpack.config.js                                                   Module Federation, copie de package.json dans javascript/apps
```
