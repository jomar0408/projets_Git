-- Création de la base et de la table "utilisateurs"
CREATE DATABASE IF NOT EXISTS gestion_utilisateurs
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE gestion_utilisateurs;

CREATE TABLE IF NOT EXISTS utilisateurs (
  id_user       INT AUTO_INCREMENT PRIMARY KEY,
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  telephone     VARCHAR(30),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quelques données de test
INSERT IGNORE INTO utilisateurs (nom, prenom, email, telephone) VALUES
  ('Alami',   'Sara',   'sara.alami@example.com',   '0611223344'),
  ('Bennani', 'Karim',  'karim.bennani@example.com', '0622334455'),
  ('Idrissi', 'Nadia',  'nadia.idrissi@example.com', '0633445566');
