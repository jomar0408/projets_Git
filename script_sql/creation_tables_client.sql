/* ============================================================================
   Script    : creation_tables_client.sql
   Objet     : Créer la table CLIENT_HIST (historique des statuts) liée à la
               table CLIENT existante du schéma HR, avec des données de test.
   Table CLIENT existante : ID_CLIENT, NOM, PRENOM, VILLE, CATEGORIE,
                            STATUT, DATE_CREATION
   Compatible : Oracle 11g et +
   ============================================================================ */

CREATE TABLE client_hist (
    hist_id     NUMBER        PRIMARY KEY,
    id_client   NUMBER        NOT NULL REFERENCES client(id_client),
    statut      VARCHAR2(20),
    date_hist   DATE          NOT NULL
);

-- 1) Historique initial : statut actuel des 10 premiers clients
INSERT INTO client_hist (hist_id, id_client, statut, date_hist)
SELECT ROWNUM, id_client, statut, date_creation
  FROM (SELECT id_client, statut, date_creation FROM client ORDER BY id_client)
 WHERE ROWNUM <= 10;

-- 2) Changement de statut plus récent pour 3 de ces clients
INSERT INTO client_hist (hist_id, id_client, statut, date_hist)
SELECT 100 + ROWNUM, id_client, 'SUSPENDU', SYSDATE - 1
  FROM (SELECT id_client FROM client ORDER BY id_client)
 WHERE ROWNUM <= 3;

COMMIT;

-- Vérification
SELECT * FROM client_hist ORDER BY id_client, date_hist;
