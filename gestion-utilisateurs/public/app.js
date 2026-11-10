// Logique côté navigateur : appelle l'API du serveur Node.js
const API = '/api/utilisateurs';

const form = document.getElementById('form-utilisateur');
const champId = document.getElementById('id_user');
const champNom = document.getElementById('nom');
const champPrenom = document.getElementById('prenom');
const champEmail = document.getElementById('email');
const champTel = document.getElementById('telephone');
const titreForm = document.getElementById('titre-form');
const btnEnregistrer = document.getElementById('btn-enregistrer');
const btnAnnuler = document.getElementById('btn-annuler');
const liste = document.getElementById('liste');
const zoneMessage = document.getElementById('message');

// Affiche un message (succès ou erreur) pendant 4 secondes
function afficherMessage(texte, type = 'succes') {
  zoneMessage.textContent = texte;
  zoneMessage.className = type;
  zoneMessage.hidden = false;
  clearTimeout(afficherMessage.timer);
  afficherMessage.timer = setTimeout(() => (zoneMessage.hidden = true), 4000);
}

// Appel générique à l'API
async function appelApi(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur');
  return data;
}

// Évite l'injection HTML dans le tableau
function echapper(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Affiche les utilisateurs dans le tableau
function afficherListe(utilisateurs) {
  if (utilisateurs.length === 0) {
    liste.innerHTML = '<tr><td colspan="6" class="vide">Aucun utilisateur</td></tr>';
    return;
  }
  liste.innerHTML = utilisateurs.map(u => `
    <tr>
      <td>${u.id_user}</td>
      <td>${echapper(u.nom)}</td>
      <td>${echapper(u.prenom)}</td>
      <td>${echapper(u.email)}</td>
      <td>${echapper(u.telephone)}</td>
      <td class="actions-cell">
        <button class="modifier" data-id="${u.id_user}">Modifier</button>
        <button class="supprimer" data-id="${u.id_user}">Supprimer</button>
      </td>
    </tr>`).join('');
}

// Charge tous les utilisateurs
async function chargerTout() {
  try {
    afficherListe(await appelApi(API));
  } catch (e) {
    afficherMessage(e.message, 'erreur');
  }
}

// Remet le formulaire en mode "création"
function reinitialiserForm() {
  form.reset();
  champId.value = '';
  titreForm.textContent = 'Nouvel utilisateur';
  btnEnregistrer.textContent = 'Créer';
  btnAnnuler.hidden = true;
}

// Création ou modification
form.addEventListener('submit', async e => {
  e.preventDefault();
  const utilisateur = {
    nom: champNom.value.trim(),
    prenom: champPrenom.value.trim(),
    email: champEmail.value.trim(),
    telephone: champTel.value.trim()
  };
  try {
    const id = champId.value;
    const data = id
      ? await appelApi(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(utilisateur) })
      : await appelApi(API, { method: 'POST', body: JSON.stringify(utilisateur) });
    afficherMessage(data.message + (data.id_user ? ` (id_user = ${data.id_user})` : ''));
    reinitialiserForm();
    chargerTout();
  } catch (err) {
    afficherMessage(err.message, 'erreur');
  }
});

btnAnnuler.addEventListener('click', reinitialiserForm);

// Boutons Modifier / Supprimer du tableau
liste.addEventListener('click', async e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('modifier')) {
    try {
      const u = await appelApi(`${API}/${id}`);
      champId.value = u.id_user;
      champNom.value = u.nom;
      champPrenom.value = u.prenom;
      champEmail.value = u.email;
      champTel.value = u.telephone || '';
      titreForm.textContent = `Modifier l'utilisateur n° ${u.id_user}`;
      btnEnregistrer.textContent = 'Enregistrer';
      btnAnnuler.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    }
  }

  if (e.target.classList.contains('supprimer')) {
    if (!confirm(`Supprimer l'utilisateur n° ${id} ?`)) return;
    try {
      const data = await appelApi(`${API}/${id}`, { method: 'DELETE' });
      afficherMessage(data.message);
      if (champId.value === id) reinitialiserForm();
      chargerTout();
    } catch (err) {
      afficherMessage(err.message, 'erreur');
    }
  }
});

// Recherche par id_user
document.getElementById('form-recherche').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('recherche-id').value;
  try {
    afficherListe([await appelApi(`${API}/${id}`)]);
  } catch (err) {
    afficherListe([]);
    afficherMessage(err.message, 'erreur');
  }
});

document.getElementById('btn-tout').addEventListener('click', () => {
  document.getElementById('recherche-id').value = '';
  chargerTout();
});

chargerTout();
