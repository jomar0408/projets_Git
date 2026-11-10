# Gestion des utilisateurs

Application simple : HTML / CSS / JavaScript + serveur Node.js (Express) + MySQL.
Elle permet de créer, modifier, supprimer et rechercher des utilisateurs par `id_user`.

## Structure

```
gestion-utilisateurs/
├── database.sql      → création de la base et de la table "utilisateurs"
├── package.json      → dépendances Node.js
├── server.js         → serveur + API REST
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Prérequis (Windows)

- **Node.js** (version LTS) : https://nodejs.org
- **MySQL** : MySQL Server, ou XAMPP / WAMP (MySQL/MariaDB inclus)

## Démarrage rapide (Windows)

1. Démarrer MySQL (XAMPP / WAMP / service MySQL).
2. Si ton utilisateur root a un mot de passe, l'écrire dans `demarrer.bat` (ligne `set DB_PASSWORD=`).
3. Double-cliquer sur **demarrer.bat** : il installe les dépendances, crée la base et ouvre http://localhost:3001

## Installation manuelle

1. Décompresser le dossier dans `D:\projets_Git\gestion-utilisateurs`

2. Créer la base : exécuter `database.sql`
   - avec MySQL Workbench / phpMyAdmin (onglet SQL), ou
   - en ligne de commande :
     ```
     mysql -u root -p < database.sql
     ```

3. Vérifier l'utilisateur et le mot de passe MySQL dans `server.js`
   (par défaut : `root` sans mot de passe, comme dans XAMPP).

4. Installer les dépendances et démarrer :
   ```
   cd D:\projets_Git\gestion-utilisateurs
   npm install
   npm start
   ```

5. Ouvrir http://localhost:3001 (port 3001 pour ne pas gêner une autre appli sur le port 3000)

## API

| Méthode | URL                       | Action                 |
|---------|---------------------------|------------------------|
| GET     | /api/utilisateurs         | Liste                  |
| GET     | /api/utilisateurs/:id     | Recherche par id_user  |
| POST    | /api/utilisateurs         | Création               |
| PUT     | /api/utilisateurs/:id     | Modification           |
| DELETE  | /api/utilisateurs/:id     | Suppression            |

Tu peux aussi tester ces URL avec Postman.
