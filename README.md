# Companion · Console d'administration

Interface Vue 3, TypeScript et Vite, en français, reliée à l'API Python locale.
Les données affichées proviennent de Companion ; aucun jeu de démonstration
n'est injecté dans le compte utilisateur.

## Démarrage

Prérequis : Python 3.11+ et Node.js 22. Les commandes ci-dessous supposent
que les deux dépôts sont voisins.

Dans un premier terminal, depuis `companion-ai` :

```sh
python3 -m venv .venv-admin
.venv-admin/bin/python -m pip install -e '.[admin,test-admin]'
PYTHONPATH=src .venv-admin/bin/python -m companion.admin
```

Dans un second terminal, depuis `companion-ai-front` :

```sh
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:5173**. L'API écoute uniquement sur
`127.0.0.1:8000`. Le proxy Vite relaie `/api` ; aucun CORS permissif n'est activé.
Si 5173 est occupé, utiliser `npm run dev -- --port 5174`. Ces deux ports sont
autorisés par l'API. Un port occupé n'est jamais libéré automatiquement.

Le premier démarrage propose la création du propriétaire si celui-ci n'existe
pas. Une configuration existante est conservée. Le service accède aux données
du compte système qui le lance, dans `~/.local/share/companion-ai`.

## Écrans

- **Vue d'ensemble** : compteurs réels, souvenirs récents, configuration des moteurs,
	aperçu graphique des yeux (pas une télémétrie du robot).
- **Mémoire** : recherche textuelle, pagination, création, correction,
	confidentialité, suppression confirmée, citations temporaires et expiration.
- **Personnes** : identités et alias dérivés des souvenirs, sources paginées par 20,
	faits extraits et signalement des ambiguïtés. Attribution confirmée d’une source
	à une identité nouvelle ou existante, dissociation et accès direct à la correction.
	Les faits confidentiels restent masqués avec leur source.
- **Conversation** : pipeline `Conversation`, modération, profils d'âge, Groq/Ollama/auto,
	sélection explicite d'un souvenir, accord ponctuel pour un souvenir confidentiel.
- **Personnalisation** : nom, surnom, présentation, intérêts, profil privé et permissions
	de partage indépendantes pour les modèles locaux et en ligne.
- **Initiatives** : jours travaillés, heures calmes et créneaux de loisirs.
- **Système & journaux** : présence de la configuration LLM, journaux locaux bornés,
	export confirmé de la sauvegarde privée compatible avec la commande propriétaire.

## Confidentialité et limites

Cette console est une **administration locale de confiance**, pas une application
multi-utilisateur ni un contrôle parental authentifié. Toute personne ou tout
processus ayant accès à la session système peut administrer le compagnon.
Ne pas exposer Vite ou l'API sur Internet ou sur le réseau local, ni modifier
leur adresse d'écoute en `0.0.0.0`. Un déploiement distant nécessite une vraie
authentification, TLS et une politique d'autorisation.

Les noms d'hôtes et origines sont contrôlés ; chaque requête nécessite un en-tête
non simple. Les réponses de l'API ne sont pas mises en cache. Les clés API ne sont
ni retournées ni éditées dans le navigateur. Les polices sont servies localement.
Le masquage des souvenirs est une protection d'affichage, pas du chiffrement :
les données sont accessibles à l'administrateur local et au navigateur.

Les variables `GROQ_API_KEY`, `COMPANION_LOCAL_CHAT_MODEL`,
`COMPANION_LOCAL_GUARD_MODEL` et `COMPANION_OLLAMA_URL` doivent être définies
dans l'environnement du processus API, puis le service redémarré. Ne jamais
utiliser des variables `VITE_*` pour une clé. Un statut « clé présente » ou
« modèles définis » ne prouve pas que le fournisseur répond.

Le chat web n'active ni mémorisation automatique ni capture audio, présence,
localisation dynamique ou initiatives. Il n'écrit pas de journal de conversation.
Son contexte n'est pas stocké dans `localStorage` : il est effacé en quittant
normalement la vue ou avec « Nouvelle conversation ». Côté serveur, il expire
après 30 minutes d'inactivité (purge au prochain message), avec au plus 16 sessions.
Un appel fournisseur déjà envoyé ne peut pas être annulé par une révocation
ultérieure ; une réponse dont les autorisations ont changé est écartée.

Les modifications utilisent les verrous existants. Une session terminal active
peut bloquer une opération exclusive avec une erreur explicite. Les suppressions
n'effacent pas les anciennes copies dans les journaux et sauvegardes.
L'export est en clair et contient les souvenirs confidentiels ; il n'inclut
ni la mémoire temporaire, ni les journaux, ni les horaires.
La restauration, la réinitialisation, l'enrôlement facial et les commandes
matérielles restent disponibles via les outils Python existants.

## Vérification

```sh
npm run build
npx playwright install chromium
npm test
```

Playwright démarre une API sur 8001 avec un répertoire temporaire et la version
compilée sur 5174. Ces ports doivent être libres. Les tests couvrent desktop et
mobile, les écritures réelles, les confirmations, la navigation clavier et les
pixels du canvas. L'appel LLM est simulé dans le test navigateur ; le pipeline
réel est testé côté Python avec un fournisseur factice, sans appel facturé.
Les captures et traces sont dans `test-results/`, ignoré par Git.

Depuis `companion-ai` :

```sh
PYTHONPATH=src .venv-admin/bin/python -m unittest discover -s tests -q
```

Prévisualiser les fichiers compilés : `npm run build && npm run preview`.
Cette prévisualisation reste locale et nécessite l'API Python sur 8000.

## Organisation

`src/api.ts` porte les contrats HTTP et les messages d'erreur ; `src/views/`
contient les sept vues chargées à la demande. `src/components/` contient la
confirmation accessible et le canvas. L'état privé n'est pas persisté côté client.
`tests/admin.spec.ts` exerce l'interface contre `tests/server.py`, isolé des
données du compte système.
