const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const MOTS = [
  "Chat","Chien","Cheval","Lion","Tigre","Ours","Loup","Renard","Lapin","Souris","Serpent","Aigle",
  "Hibou","Pingouin","Requin","Baleine","Dauphin","Mouton","Cochon","Vache","Canard","Poule","Coq","Singe",
  "Girafe","Grenouille","Tortue","Escargot","Abeille","Fourmi","Mouche","Papillon","Crabe","Poisson","Chameau","Castor",
  "Corbeau","Pigeon","Hamster","Taureau","Arbre","Fleur","Rose","Herbe","Feuille","Racine","Montagne","Colline",
  "Vallon","Lac","Mer","Plage","Sable","Rocher","Caillou","Volcan","Nuage","Pluie","Neige","Vent",
  "Orage","Soleil","Lune","Ciel","Nuit","Jour","Hiver","Automne","Printemps","Glace","Feu","Eau",
  "Terre","Jungle","Bois","Champ","Jardin","Source","Grotte","Vague","Table","Chaise","Lit","Porte",
  "Mur","Toit","Cuisine","Salon","Cave","Escalier","Lampe","Bougie","Miroir","Horloge","Tapis","Rideau",
  "Coussin","Placard","Tiroir","Bouteille","Verre","Assiette","Tasse","Bol","Couteau","Fourchette","Casserole","Four",
  "Frigo","Savon","Brosse","Peigne","Serviette","Balai","Seau","Panier","Sac","Valise","Parapluie","Ciseaux",
  "Pain","Fromage","Pomme","Poire","Banane","Orange","Citron","Fraise","Cerise","Raisin","Tomate","Carotte",
  "Salade","Oignon","Chocolat","Bonbon","Sucre","Sel","Poivre","Beurre","Lait","Miel","Confiture","Soupe",
  "Pizza","Croissant","Biscuit","Tarte","Riz","Haricot","Champignon","Noix","Olive","Abricot","Melon","Ananas",
  "Citrouille","Sandwich","Omelette","Jambon","Avion","Train","Bateau","Voiture","Camion","Bus","Moto","Taxi",
  "Tracteur","Navire","Gare","Port","Route","Rue","Pont","Tunnel","Parking","Garage","Banque","Usine",
  "Mairie","Prison","Stade","Boulangerie","Pharmacie","Restaurant","Magasin","Bureau","Village","Ville","Tour","Phare",
  "Moulin","Ferme","Cabane","Tente","Camp","Piscine","Hangar","Kiosque","Docteur","Pirate","Roi","Reine",
  "Prince","Princesse","Espion","Agent","Voleur","Pilote","Sorcier","Vampire","Robot","Soldat","Policier","Pompier",
  "Facteur","Boulanger","Cuisinier","Juge","Avocat","Marin","Chevalier","Clown","Magicien","Professeur","Artiste","Chanteur",
  "Danseur","Peintre","Joueur","Capitaine","Bandit","Fermier","Jardinier","Infirmier","Berger","Chasseur","Dragon","Ogre",
  "Main","Pied","Bras","Jambe","Dent","Nez","Bouche","Oreille","Cheveu","Doigt","Genou","Dos",
  "Ventre","Cou","Langue","Chapeau","Bonnet","Manteau","Robe","Pantalon","Chemise","Jupe","Chaussure","Botte",
  "Chaussette","Gant","Ceinture","Cravate","Lunettes","Bague","Collier","Montre","Bouton","Poche","Casque","Masque",
  "Couronne","Costume","Pyjama","Tablier","Piano","Guitare","Violon","Tambour","Trompette","Radio","Livre","Journal",
  "Lettre","Carte","Stylo","Crayon","Cahier","Papier","Ballon","Balle","Raquette","Jouet","Puzzle","Dessin"
];

const rooms = {};
const GRACE = 30000; // délai avant de retirer un joueur déconnecté
const other = t => (t === 'red' ? 'blue' : 'red');

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function newCode() {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); } while (rooms[c]);
  return c;
}
function newGame(room) {
  const start = Math.random() < 0.5 ? 'red' : 'blue';
  room.colors = shuffle([
    ...Array(9).fill(start), ...Array(8).fill(other(start)),
    ...Array(7).fill('neutral'), 'assassin'
  ]);
  room.words = shuffle([...MOTS]).slice(0, 25);
  room.revealed = Array(25).fill(false);
  room.turn = start;
  room.started = true;
  room.winner = null;
  room.clue = null;
  room.guesses = 0;
}
function left(room, t) {
  return room.colors.filter((c, i) => c === t && !room.revealed[i]).length;
}
function win(room, t) {
  room.winner = t;
  room.score[t]++;
}
function endTurn(room) {
  room.turn = other(room.turn);
  room.clue = null;
  room.guesses = 0;
}
function view(room, code, pid) {
  const me = room.players[pid];
  const showAll = room.winner || (me && me.role === 'spy');
  return {
    code,
    me: pid,
    started: room.started,
    turn: room.turn,
    winner: room.winner,
    score: room.score,
    clue: room.clue,
    guesses: room.guesses,
    left: room.started ? { red: left(room, 'red'), blue: left(room, 'blue') } : null,
    // jamais le jeton : il permet de reprendre la place du joueur
    players: Object.entries(room.players).map(([id, p]) => ({ id, name: p.name, team: p.team, role: p.role, online: !!p.sid })),
    cards: room.started
      ? room.words.map((w, i) => ({ w, r: room.revealed[i], c: room.revealed[i] || showAll ? room.colors[i] : null }))
      : null
  };
}
function broadcast(code) {
  const room = rooms[code];
  if (!room) return;
  for (const [pid, p] of Object.entries(room.players)) if (p.sid) io.to(p.sid).emit('state', view(room, code, pid));
}

// Rattache une socket à un joueur (nouveau ou qui revient après un rafraîchissement)
function attach(socket, code, pid) {
  const room = rooms[code];
  const p = room.players[pid];
  clearTimeout(p.timer);
  p.timer = null;
  const old = p.sid && p.sid !== socket.id && io.sockets.sockets.get(p.sid);
  if (old) { // même session ouverte dans un onglet dupliqué
    old.leave(code);
    old.data = {};
    old.emit('replaced');
  }
  p.sid = socket.id;
  socket.data = { code, pid };
  socket.join(code);
  socket.emit('chatHistory', room.chat);
  broadcast(code);
}
function addPlayer(socket, code, name) {
  const pid = crypto.randomBytes(6).toString('hex');
  const token = crypto.randomBytes(16).toString('hex');
  rooms[code].players[pid] = { name: String(name).slice(0, 20) || 'Joueur', team: null, role: 'agent', token, sid: null, timer: null };
  socket.emit('session', { code, token });
  attach(socket, code, pid);
}
function removePlayer(code, pid) {
  const room = rooms[code];
  if (!room || !room.players[pid]) return;
  clearTimeout(room.players[pid].timer);
  delete room.players[pid];
  if (Object.keys(room.players).length === 0) delete rooms[code]; // salle vide : le score repart à zéro
  else broadcast(code);
}
// Détache la socket ; le joueur est gardé GRACE ms pour lui laisser le temps de revenir
function detach(socket, now) {
  const { code, pid } = socket.data;
  const room = rooms[code];
  const p = room && room.players[pid];
  socket.data = {};
  if (!p || p.sid !== socket.id) return;
  socket.leave(code);
  p.sid = null;
  if (now) return removePlayer(code, pid);
  p.timer = setTimeout(() => removePlayer(code, pid), GRACE);
  broadcast(code);
}

io.on('connection', socket => {
  const ctx = () => {
    const room = rooms[socket.data.code];
    const p = room && room.players[socket.data.pid];
    return p ? { room, p, code: socket.data.code, pid: socket.data.pid } : {};
  };
  const err = m => socket.emit('err', m);

  socket.on('create', name => {
    detach(socket, true);
    const code = newCode();
    rooms[code] = { players: {}, started: false, score: { red: 0, blue: 0 }, chat: [] };
    addPlayer(socket, code, name);
  });

  socket.on('join', ({ code, name } = {}) => {
    code = String(code || '').toUpperCase().trim();
    if (!rooms[code]) return err('Salle introuvable');
    detach(socket, true);
    if (rooms[code]) addPlayer(socket, code, name);
  });

  socket.on('rejoin', ({ code, token } = {}) => {
    const room = rooms[code];
    const entry = room && typeof token === 'string' && Object.entries(room.players).find(([, p]) => p.token === token);
    if (!entry) return socket.emit('sessionLost');
    attach(socket, code, entry[0]);
  });

  socket.on('leave', () => detach(socket, true));

  socket.on('chat', text => {
    const { room, p, code } = ctx();
    if (!p) return;
    text = String(text || '').trim().slice(0, 200);
    if (!text) return;
    const msg = { name: p.name, team: p.team, text };
    room.chat.push(msg);
    if (room.chat.length > 50) room.chat.shift();
    io.to(code).emit('chat', msg);
  });

  socket.on('setRole', ({ team, role } = {}) => {
    const { room, p, code, pid } = ctx();
    if (!p || room.started) return;
    if (!['red', 'blue'].includes(team) || !['agent', 'spy'].includes(role)) return;
    if (role === 'spy') {
      const taken = Object.entries(room.players).some(([id, o]) => id !== pid && o.team === team && o.role === 'spy');
      if (taken) return err('Cette équipe a déjà un espion');
    }
    Object.assign(p, { team, role });
    broadcast(code);
  });

  socket.on('start', () => {
    const { room, p, code } = ctx();
    if (!p) return;
    const ps = Object.values(room.players);
    for (const t of ['red', 'blue']) {
      if (!ps.some(o => o.team === t && o.role === 'spy')) return err('Chaque équipe doit avoir un espion');
      if (!ps.some(o => o.team === t && o.role === 'agent')) return err('Chaque équipe doit avoir un agent');
    }
    newGame(room);
    broadcast(code);
  });

  socket.on('clue', ({ word, num } = {}) => {
    const { room, p, code } = ctx();
    if (!p || !room.started || room.winner || room.clue) return;
    if (p.role !== 'spy' || p.team !== room.turn) return;
    word = String(word || '').trim().slice(0, 30);
    num = parseInt(num, 10);
    if (!word || isNaN(num) || num < 0 || num > 9) return err('Indice invalide');
    room.clue = { w: word, n: num };
    room.guesses = num === 0 ? 99 : num + 1;
    broadcast(code);
  });

  socket.on('reveal', i => {
    const { room, p, code } = ctx();
    if (!p || !room.started || room.winner || !room.clue) return;
    if (p.role !== 'agent' || p.team !== room.turn || room.revealed[i] !== false) return;
    room.revealed[i] = true;
    const c = room.colors[i];
    if (c === 'assassin') win(room, other(room.turn));
    else if (left(room, 'red') === 0) win(room, 'red');
    else if (left(room, 'blue') === 0) win(room, 'blue');
    else if (c === room.turn) { if (--room.guesses <= 0) endTurn(room); }
    else endTurn(room);
    broadcast(code);
  });

  socket.on('endTurn', () => {
    const { room, p, code } = ctx();
    if (!p || !room.started || room.winner || !room.clue) return;
    if (p.role !== 'agent' || p.team !== room.turn) return;
    endTurn(room);
    broadcast(code);
  });

  socket.on('restart', () => {
    const { room, p, code } = ctx();
    if (!p) return;
    room.started = false;
    room.winner = null;
    broadcast(code);
  });

  socket.on('disconnect', () => detach(socket, false));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Serveur sur http://localhost:' + PORT));
