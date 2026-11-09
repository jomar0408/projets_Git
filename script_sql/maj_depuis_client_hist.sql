/* ============================================================================
   Programme : maj_depuis_client_hist.sql
   Objet     : Lire la table CLIENT_HIST et mettre à jour un champ de la table
               CLIENT à partir de la dernière ligne d'historique de chaque client.
   Compatible: Oracle 11g et +
   ----------------------------------------------------------------------------
   HYPOTHÈSES (à adapter) :
     CLIENT_HIST(client_id, statut, date_hist, ...)
     CLIENT     (client_id, statut, date_maj, ...)
   -> On reporte dans CLIENT.statut le statut de la ligne d'historique
      la plus récente (date_hist max) de chaque client.
   ----------------------------------------------------------------------------
   PRÉREQUIS pour DBMS_LOCK.SLEEP (à exécuter une fois en tant que SYS) :
     GRANT EXECUTE ON SYS.DBMS_LOCK TO <ton_schema>;
   ============================================================================ */

SET SERVEROUTPUT ON SIZE UNLIMITED

/* ----------------------------------------------------------------------------
   VERSION 1 : procédure PL/SQL avec BULK COLLECT
   (UPDATE mis en commentaire et remplacé par une pause de 2 secondes par lot,
    + calcul et affichage de la durée d'exécution)
   ---------------------------------------------------------------------------- */
CREATE OR REPLACE PROCEDURE maj_client_depuis_hist (
    p_taille_lot IN PLS_INTEGER DEFAULT 1000
) AS
    -- Dernière ligne d'historique par client
    CURSOR c_hist IS
        SELECT client_id, statut
          FROM (SELECT h.client_id,
                       h.statut,
                       ROW_NUMBER() OVER (PARTITION BY h.client_id
                                          ORDER BY h.date_hist DESC) AS rn
                  FROM client_hist h)
         WHERE rn = 1;

    TYPE t_id     IS TABLE OF client_hist.client_id%TYPE;
    TYPE t_statut IS TABLE OF client_hist.statut%TYPE;

    l_ids      t_id;
    l_statuts  t_statut;

    l_nb_lus   PLS_INTEGER := 0;
    l_nb_maj   PLS_INTEGER := 0;
    l_nb_err   PLS_INTEGER := 0;

    -- Mesure de la durée
    l_debut         TIMESTAMP;
    l_fin           TIMESTAMP;
    l_duree         INTERVAL DAY(2) TO SECOND(3);
    l_duree_sec     NUMBER;

    e_bulk_errors EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_bulk_errors, -24381);
BEGIN
    l_debut := SYSTIMESTAMP;
    DBMS_OUTPUT.PUT_LINE('Début : ' || TO_CHAR(l_debut, 'DD/MM/YYYY HH24:MI:SS.FF3'));

    OPEN c_hist;
    LOOP
        FETCH c_hist BULK COLLECT INTO l_ids, l_statuts LIMIT p_taille_lot;
        EXIT WHEN l_ids.COUNT = 0;

        l_nb_lus := l_nb_lus + l_ids.COUNT;

        BEGIN
            /* ---------- UPDATE mis en commentaire ----------
            FORALL i IN 1 .. l_ids.COUNT SAVE EXCEPTIONS
                UPDATE client c
                   SET c.statut   = l_statuts(i),
                       c.date_maj = SYSDATE
                 WHERE c.client_id = l_ids(i)
                   -- ne met à jour que si la valeur change (NULL géré)
                   AND (c.statut <> l_statuts(i)
                        OR (c.statut IS NULL AND l_statuts(i) IS NOT NULL)
                        OR (c.statut IS NOT NULL AND l_statuts(i) IS NULL));
            ------------------------------------------------- */

            -- Remplacement : pause de 2 secondes (ne fait rien d'autre)
            DBMS_LOCK.SLEEP(2);
            -- En Oracle 18c et + : DBMS_SESSION.SLEEP(2);  (pas de GRANT nécessaire)

        EXCEPTION
            WHEN e_bulk_errors THEN
                FOR j IN 1 .. SQL%BULK_EXCEPTIONS.COUNT LOOP
                    l_nb_err := l_nb_err + 1;
                    DBMS_OUTPUT.PUT_LINE(
                        'Erreur client_id=' ||
                        l_ids(SQL%BULK_EXCEPTIONS(j).ERROR_INDEX) || ' : ' ||
                        SQLERRM(-SQL%BULK_EXCEPTIONS(j).ERROR_CODE));
                END LOOP;
        END;

        /* ---------- Comptage lié au FORALL, mis en commentaire ----------
        FOR i IN 1 .. l_ids.COUNT LOOP
            l_nb_maj := l_nb_maj + SQL%BULK_ROWCOUNT(i);
        END LOOP;
        ------------------------------------------------------------------ */

        COMMIT;
    END LOOP;
    CLOSE c_hist;

    -- Calcul de la durée
    l_fin       := SYSTIMESTAMP;
    l_duree     := l_fin - l_debut;
    l_duree_sec := EXTRACT(DAY    FROM l_duree) * 86400
                 + EXTRACT(HOUR   FROM l_duree) * 3600
                 + EXTRACT(MINUTE FROM l_duree) * 60
                 + EXTRACT(SECOND FROM l_duree);

    DBMS_OUTPUT.PUT_LINE('Fin   : ' || TO_CHAR(l_fin, 'DD/MM/YYYY HH24:MI:SS.FF3'));
    DBMS_OUTPUT.PUT_LINE('Clients lus      : ' || l_nb_lus);
    DBMS_OUTPUT.PUT_LINE('Lignes modifiées : ' || l_nb_maj);
    DBMS_OUTPUT.PUT_LINE('Erreurs          : ' || l_nb_err);
    DBMS_OUTPUT.PUT_LINE('Durée            : ' ||
        TO_CHAR(EXTRACT(HOUR   FROM l_duree), 'FM00') || ':' ||
        TO_CHAR(EXTRACT(MINUTE FROM l_duree), 'FM00') || ':' ||
        TO_CHAR(EXTRACT(SECOND FROM l_duree), 'FM00.000') ||
        '  (' || TO_CHAR(l_duree_sec, 'FM999999990.000') || ' s)');

EXCEPTION
    WHEN OTHERS THEN
        IF c_hist%ISOPEN THEN
            CLOSE c_hist;
        END IF;
        ROLLBACK;
        DBMS_OUTPUT.PUT_LINE('Erreur fatale : ' || SQLERRM);
        DBMS_OUTPUT.PUT_LINE('Durée avant erreur : ' || (SYSTIMESTAMP - l_debut));
        RAISE;
END maj_client_depuis_hist;
/

-- Exécution
BEGIN
    maj_client_depuis_hist(p_taille_lot => 1000);
END;
/


/* ----------------------------------------------------------------------------
   VERSION 2 : en une seule instruction MERGE (plus rapide si pas besoin
   de traitement ligne par ligne)
   ---------------------------------------------------------------------------- */
/*
MERGE INTO client c
USING (SELECT client_id, statut
         FROM (SELECT h.client_id,
                      h.statut,
                      ROW_NUMBER() OVER (PARTITION BY h.client_id
                                         ORDER BY h.date_hist DESC) AS rn
                 FROM client_hist h)
        WHERE rn = 1) h
   ON (c.client_id = h.client_id)
 WHEN MATCHED THEN
   UPDATE SET c.statut   = h.statut,
              c.date_maj = SYSDATE
    WHERE DECODE(c.statut, h.statut, 0, 1) = 1;   -- seulement si différent

COMMIT;
*/
