// Serveur Node.js : sert les pages (dossier public) et l'API REST vers MySQL
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

// ---- Configuration MySQL : adapte user / password si besoin ----
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_utilisateurs',
  waitForConnections: true,
  connectionLimit: 10
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Vérifie les champs envoyés par le formulaire
function valider(body) {
  const { nom, prenom, email } = body;
  if (!nom || !prenom || !email) return 'Nom, prénom et email sont obligatoires.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide.';
  return null;
}

// Liste de tous les utilisateurs
app.get('/api/utilisateurs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM utilisateurs ORDER BY id_user');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur : ' + err.message });
  }
});

// Recherche par id_user
app.get('/api/utilisateurs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM utilisateurs WHERE id_user = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur : ' + err.message });
  }
});

// Création
app.post('/api/utilisateurs', async (req, res) => {
  const erreur = valider(req.body);
  if (erreur) return res.status(400).json({ message: erreur });
  const { nom, prenom, email, telephone } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO utilisateurs (nom, prenom, email, telephone) VALUES (?, ?, ?, ?)',
      [nom, prenom, email, telephone || null]
    );
    res.status(201).json({ message: 'Utilisateur créé.', id_user: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email existe déjà.' });
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur : ' + err.message });
  }
});

// Modification
app.put('/api/utilisateurs/:id', async (req, res) => {
  const erreur = valider(req.body);
  if (erreur) return res.status(400).json({ message: erreur });
  const { nom, prenom, email, telephone } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE utilisateurs SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE id_user = ?',
      [nom, prenom, email, telephone || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({ message: 'Utilisateur modifié.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email existe déjà.' });
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur : ' + err.message });
  }
});

// Suppression
app.delete('/api/utilisateurs/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM utilisateurs WHERE id_user = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur : ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Application démarrée : http://localhost:${PORT}`);
});
