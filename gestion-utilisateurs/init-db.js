// Crée la base et la table à partir de database.sql (aucun outil MySQL en ligne de commande nécessaire)
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    await conn.query(sql);
    await conn.end();
    console.log('Base "gestion_utilisateurs" prête.');
  } catch (err) {
    console.error('ERREUR MySQL : ' + err.message);
    if (err.code === 'ECONNREFUSED') console.error('-> MySQL n\'est pas démarré (lance-le depuis XAMPP / WAMP / Services Windows).');
    if (/Access denied/i.test(err.message)) console.error('-> Mot de passe incorrect : modifie DB_PASSWORD dans demarrer.bat.');
    process.exit(1);
  }
})();
