/* ============================================================================
   Programme : trigger_client_hist.sql
   Objet     : Alimenter automatiquement la table CLIENT_HIST à chaque insertion
               dans la table CLIENT.
   Prérequis : Tables CLIENT et CLIENT_HIST créées (creation_tables_client.sql)
   Compatible : Oracle 11g et +
   ----------------------------------------------------------------------------
   Remarque : ce script crée la séquence CLIENT_HIST_SEQ. S'il est relancé, la
              création de la séquence échoue (ORA-00955) sans conséquence et le
              trigger est simplement remplacé.
   ============================================================================ */

/* Séquence pour HIST_ID : elle démarre après le plus grand identifiant existant,
   pour ne pas entrer en conflit avec les données déjà présentes. */
DECLARE
    l_debut NUMBER;
BEGIN
    SELECT NVL(MAX(hist_id), 0) + 1
      INTO l_debut
      FROM client_hist;

    EXECUTE IMMEDIATE 'CREATE SEQUENCE client_hist_seq START WITH ' || l_debut;
END;
/

CREATE OR REPLACE TRIGGER trg_client_ai_hist
AFTER INSERT ON client
FOR EACH ROW
BEGIN
    INSERT INTO client_hist (hist_id, id_client, statut, date_hist)
    VALUES (client_hist_seq.NEXTVAL, :NEW.id_client, :NEW.statut, SYSDATE);
END;
/

SHOW ERRORS TRIGGER trg_client_ai_hist

/* Test (à adapter selon les colonnes obligatoires de CLIENT) :

INSERT INTO client (id_client, nom, prenom, ville, categorie, statut, date_creation)
VALUES (999999, 'TEST', 'Trigger', 'Montreal', 'A', 'ACTIF', SYSDATE);

SELECT * FROM client_hist WHERE id_client = 999999;

ROLLBACK;
*/
