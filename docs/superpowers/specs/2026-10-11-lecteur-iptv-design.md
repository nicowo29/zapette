# Lecteur IPTV : document de conception

Date : 11 octobre 2026. Statut : à valider par le propriétaire.
Nom : « Zapette » (choisi le 11 octobre 2026 ; nom de travail précédent : « Lecteur IPTV »).

## 1. Objectif

Un lecteur IPTV personnel, gratuit, utilisable d'abord sur iPhone puis sur Mac, avec une interface soignée et tactile. Il se branche sur un compte Xtream Codes existant. Il ne fournit aucun contenu.

Réussite de la première version : ajouter son compte en moins d'une minute, trouver une chaîne ou un film en quelques lettres, lancer une chaîne en un tap.

## 2. Ce que les essais ont établi

Ces points ont été mesurés avec le vrai fournisseur, sur iPhone (Safari, iOS 18.7). Ils fixent l'architecture.

| Constat | Conséquence |
| --- | --- |
| Le fournisseur ne répond qu'en `http://`. | Une page servie en HTTPS ne peut ni l'interroger ni lire ses flux. |
| Le fournisseur refuse les demandes venant de Cloudflare (`403`), quelle que soit la signature du client. | Pas de relais hébergé chez Cloudflare. Les segments vidéo sont en plus servis par adresse IP, ce que Cloudflare refuse. |
| Depuis une page servie en `http://`, l'iPhone lit le catalogue directement (460 catégories, 16 959 chaînes, 104 615 films). | Aucun relais nécessaire : l'application parle au fournisseur depuis l'appareil. |
| Les chaînes se lisent dans Safari en HLS natif, HD et UHD, image en 1,4 à 3,9 s. | Lecteur intégré pour le direct. |
| Films : `mkv` 58 %, `mp4` 33 %, `ts` 9 %. Safari ne lit ni `mkv` ni `ts`. Le seul film `mp4` essayé a échoué (cause non établie). | VLC est la voie principale pour les films. La lecture intégrée des `mp4` est tentée, avec repli automatique. |
| VLC lit les films depuis le lien « Ouvrir dans VLC ». | Passage à VLC retenu comme solution de repli. |
| Le compte autorise une seule connexion à la fois. | Impossible de précharger une seconde chaîne pour zapper instantanément. |

## 3. Architecture

Application web statique, sans serveur ni relais.

- **Pile** : React, TypeScript, Vite, Dexie (IndexedDB). La même que Bouzin.
- **Service** : en `http://` simple. Piste d'hébergement gratuit : GitHub Pages avec l'option « Enforce HTTPS » décochée. En développement : `vite --host` sur le Wi-Fi.
- **Pas de service worker** : interdit hors HTTPS. Donc pas de mode hors ligne, sans objet pour du streaming.
- **Données** : tout reste sur l'appareil (identifiants, catalogue en cache, favoris, progression, réglages).

Contreparties assumées du HTTP : la connexion n'est pas chiffrée, donc sur un Wi-Fi public un tiers pourrait lire les identifiants IPTV. C'est déjà le cas avec ce fournisseur, quel que soit le lecteur.

### Modules

Chaque module a un rôle unique et se teste seul.

| Module | Rôle | Dépend de |
| --- | --- | --- |
| `xtream/` | Appels à `player_api.php` (compte, catégories, chaînes, films, séries, guide) et construction des adresses de flux. | rien |
| `catalog/normalize` | Tire d'un nom brut la langue, la qualité et le nom propre ; regroupe les variantes d'une même chaîne. | rien |
| `catalog/store` | Cache du catalogue dans IndexedDB, rafraîchissement, favoris, progression. | `xtream/`, `catalog/normalize` |
| `search/` | Index en mémoire et recherche instantanée, sans accents ni majuscules. | `catalog/store` |
| `player/` | Lecture d'une chaîne ou d'un film, gestes, image dans l'image, AirPlay, passage à VLC. | `xtream/` |
| `ui/` | Écrans et composants. | tous |

### Volume

Le catalogue compte plus de 120 000 entrées. Règles :

- catalogue téléchargé une fois, gardé en cache, rafraîchi au bout de 24 h ou à la demande ;
- listes à défilement virtuel : seules les lignes visibles existent dans la page ;
- recherche sur des chaînes de caractères normalisées à l'import, pas à chaque frappe.

## 4. Tri et recherche

### Lecture des noms

Les noms du fournisseur portent la langue et la qualité, par exemple `|FR| TF1 ᵁᴴᴰ`, `FR| Ligue 1+ 6 ʜᴅ`, `FR - Le Labyrinthe (2014) MULTI`.

- **Langue** : préfixe du nom (`|FR|`, `FR|`, `FR -`), sinon nom de la catégorie.
- **Qualité** : `SD`, `HD`, `FHD`, `UHD` (dont `4K`), y compris les écritures en petites capitales et en exposant.
- **Nom propre** : nom sans préfixe ni suffixe de qualité (`TF1`).
- **Format de fichier** (films, séries) : `mp4`, `mkv`, etc., donné par le fournisseur.

### Regroupement des chaînes

Une chaîne apparaît sur une seule ligne, avec ses qualités à droite. Un tap lance la qualité préférée ; un tap sur une pastille lance cette qualité. Qualité préférée par défaut : HD ou FHD avant UHD, car l'UHD démarre plus lentement (3,9 s contre 1,7 s mesurés).

### Filtres

- Langue choisie au premier lancement, appliquée partout, modifiable par pastille.
- Pastilles de qualité.
- Films et séries : badge « Dans l'app » ou « VLC » selon le format de fichier.

### Recherche

Un seul champ. Résultats dès la première lettre, sans accents ni majuscules, regroupés par type (chaînes, films, séries). Les filtres de langue et de qualité s'appliquent aux résultats.

## 5. Écrans

Navigation : barre d'onglets en bas sur iPhone (Accueil, Direct, Films, Séries, Recherche) ; barre latérale sur Mac.

- **Premier lancement** : ajout du compte (serveur, utilisateur, mot de passe), vérification, puis choix de la langue.
- **Accueil** : bannière à la une, rangées « Continuer à regarder », « Chaînes favorites », « Ma liste », « Ajouts récents ».
- **Direct** : catégories en pastilles, liste de chaînes regroupées avec logo et programme en cours.
- **Films / Séries** : grille d'affiches par catégorie. Fiche détail : fond teinté, résumé, « Lire » ou « Ouvrir dans VLC », favori. Séries : saisons puis épisodes.
- **Recherche** : selon la maquette validée.
- **Lecteur** : plein écran, commandes en surimpression.
- **Réglages** : compte, langue, qualité préférée, rafraîchissement du catalogue.

### Direction visuelle

Thème sombre. Teinte d'ambiance tirée de l'affiche ou du logo affiché ; si l'image ne permet pas la lecture de ses couleurs, teinte dérivée du titre. Accueil dans l'esprit Netflix, écran Direct dans l'esprit TiviMate. Zones de tap d'au moins 44 px, respect de l'encoche et de l'indicateur d'accueil.

## 6. Lecteur

- **Chaînes** : flux `.m3u8`. HLS natif sur iPhone et Safari Mac ; `hls.js` sur les autres navigateurs (non vérifié avec ce fournisseur).
- **Films et séries** : `mp4`, `m4v`, `mov` tentés dans l'application ; en cas d'échec, ou pour tout autre format, proposition « Ouvrir dans VLC ».
- **Gestes** : glisser vers le haut ou le bas pour changer de chaîne dans la liste en cours ; double tap pour avancer ou reculer de 10 s (films, séries).
- **Sorties** : image dans l'image, AirPlay.
- **Retour immédiat au tap** : logo et programme affichés tout de suite, dernière image gardée jusqu'à l'arrivée de la nouvelle.
- **Reprise de lecture** : position mémorisée pour ce qui est lu dans l'application. VLC ne renvoie pas la position : un contenu ouvert dans VLC est seulement marqué « ouvert récemment ».

## 7. Guide TV

Programme en cours et suivant, chargé à la demande pour les chaînes visibles. Programme de la journée sur la fiche d'une chaîne. Pas de grille horaire complète en première version : trop lourde pour 17 000 chaînes.

## 8. Erreurs

Chaque erreur dit ce qui s'est passé et quoi faire, sans jargon.

| Situation | Message et action |
| --- | --- |
| Identifiants refusés | « Identifiants refusés. Vérifie le serveur, l'utilisateur et le mot de passe. » |
| Compte expiré | Date d'expiration affichée, lecture bloquée. |
| Chaîne hors antenne ou flux illisible | « Cette chaîne n'émet pas pour l'instant. » Retour à la liste, autres qualités proposées. |
| Connexion déjà utilisée ailleurs | « Ton abonnement autorise un seul écran. Ferme l'autre lecture. » |
| Film illisible dans l'application | Bascule vers « Ouvrir dans VLC ». |
| Catalogue inaccessible | Catalogue en cache conservé, bouton « Réessayer ». |

## 9. Tests

- Tests unitaires (Vitest) : lecture des noms à partir d'exemples réels, regroupement des chaînes, construction des adresses, recherche.
- Faux fournisseur local pour les écrans et le lecteur.
- Vérification manuelle sur iPhone à chaque étape : ajout du compte, recherche, lecture d'une chaîne, passage à VLC.

## 10. Hors périmètre de la première version

Sources M3U, plusieurs comptes, grille horaire complète, téléchargements, rattrapage (catch-up), contrôle parental, lecture `mkv` dans l'application, moteurs de lecture rapides (`hls.js` progressif, `mpegts.js`) tant qu'ils ne sont pas mesurés sur iPhone.

Le modèle de données garde la notion de « source » pour accueillir le M3U et d'autres comptes plus tard.

## 11. Risques ouverts

| Risque | Vérification prévue |
| --- | --- |
| GitHub Pages peut refuser de servir en HTTP simple pour ce compte. | Essai dès la première mise en ligne ; sinon autre hébergeur HTTP. |
| Ajout à l'écran d'accueil de l'iPhone depuis une page HTTP : comportement non vérifié. | Essai sur iPhone à la première étape. |
| Lecture intégrée des films `mp4` non prouvée. | Essai sur plusieurs films ; le repli VLC couvre l'échec. |
| Lecture hors Safari (Chrome sur Mac) dépend d'autorisations du fournisseur non vérifiées. | Essai sur Mac ; Safari reste la cible. |

## 12. Découpage en étapes

Chaque étape donne une application utilisable et se planifie séparément.

1. **Socle et direct** : ajout du compte, catalogue en cache, tri par langue et qualité, recherche, lecteur de chaînes, mise en ligne.
2. **Films et séries** : grilles, fiches, lecture intégrée ou VLC.
3. **Accueil et confort** : favoris, reprise, guide TV, gestes avancés, image dans l'image, AirPlay.
