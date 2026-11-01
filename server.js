const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const MOTS = ["Avion","Banque","Chat","Dragon","Eau","Feu","Glace","Hôtel","Île","Jardin","Roi","Lune","Mer","Nuit","Or","Pont","Reine","Soleil","Table","Usine","Verre","Cheval","Diamant","Étoile","Forêt","Gâteau","Horloge","Ours","Jungle","Clé","Lion","Montagne","Neige","Orange","Pirate","Radio","Sable","Train","Vampire","Chapeau","Café","Livre","Miroir","Cuisine","Piano","Fantôme","Château","Désert","Docteur","École","Fleur","Fromage","Guitare","Hôpital","Laser","Médecin","Musée","Nuage","Œuf","Plage","Pomme","Robot","Serpent","Théâtre","Tigre","Voleur","Agent","Bateau","Camp","Canon","Cercle","Cirque","Couronne","Dent","Espion","Flèche","Fusée","Grenouille","Hiver","Joueur","Laine","Marché","Ombre","Papier","Pétrole","Pilote","Poison","Prince","Satellite","Sorcier","Tempête","Tour","Trésor","Vague","Violon","Zéro","Araignée","Bague","Couteau","Mouche"];

const rooms = {};
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
function endTurn(room) {
  room.turn = other(room.turn);
  room.clue = null;
  room.guesses = 0;
}
function view(room, code, id) {
  const me = room.players[id];
  const showAll = room.winner || (me && me.role === 'spy');
  return {
    code,
    me: id,
    started: room.started,
    turn: room.turn,
    winner: room.winner,
    clue: room.clue,
    guesses: room.guesses,
    left: room.started ? { red: left(room, 'red'), blue: left(room, 'blue') } : null,
    players: Object.entries(room.players).map(([pid, p]) => ({ id: pid, name: p.name, team: p.team, role: p.role })),
    cards: room.started
      ? room.words.map((w, i) => ({ w, r: room.revealed[i], c: room.revealed[i] || showAll ? room.colors[i] : null }))
      : null
  };
}
function broadcast(code) {
  const room = rooms[code];
  if (!room) return;
  for (const id of Object.keys(room.players)) io.to(id).emit('state', view(room, code, id));
}

io.on('connection', socket => {
  const getRoom = () => rooms[socket.data.code];
  const err = m => socket.emit('err', m);

  socket.on('create', name => {
    const code = newCode();
    rooms[code] = { players: {}, started: false };
    rooms[code].players[socket.id] = { name: String(name).slice(0, 20) || 'Joueur', team: null, role: 'agent' };
    socket.data.code = code;
    socket.join(code);
    broadcast(code);
  });

  socket.on('join', ({ code, name }) => {
    code = String(code || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return err('Salle introuvable');
    room.players[socket.id] = { name: String(name).slice(0, 20) || 'Joueur', team: null, role: 'agent' };
    socket.data.code = code;
    socket.join(code);
    broadcast(code);
  });

  socket.on('setRole', ({ team, role }) => {
    const room = getRoom();
    if (!room || room.started) return;
    if (!['red', 'blue'].includes(team) || !['agent', 'spy'].includes(role)) return;
    if (role === 'spy') {
      const taken = Object.entries(room.players).some(([id, p]) => id !== socket.id && p.team === team && p.role === 'spy');
      if (taken) return err('Cette équipe a déjà un espion');
    }
    Object.assign(room.players[socket.id], { team, role });
    broadcast(socket.data.code);
  });

  socket.on('start', () => {
    const room = getRoom();
    if (!room) return;
    const ps = Object.values(room.players);
    for (const t of ['red', 'blue']) {
      if (!ps.some(p => p.team === t && p.role === 'spy')) return err('Chaque équipe doit avoir un espion');
      if (!ps.some(p => p.team === t && p.role === 'agent')) return err('Chaque équipe doit avoir un agent');
    }
    newGame(room);
    broadcast(socket.data.code);
  });

  socket.on('clue', ({ word, num }) => {
    const room = getRoom();
    if (!room || !room.started || room.winner || room.clue) return;
    const p = room.players[socket.id];
    if (p.role !== 'spy' || p.team !== room.turn) return;
    word = String(word || '').trim().slice(0, 30);
    num = parseInt(num, 10);
    if (!word || isNaN(num) || num < 0 || num > 9) return err('Indice invalide');
    room.clue = { w: word, n: num };
    room.guesses = num === 0 ? 99 : num + 1;
    broadcast(socket.data.code);
  });

  socket.on('reveal', i => {
    const room = getRoom();
    if (!room || !room.started || room.winner || !room.clue) return;
    const p = room.players[socket.id];
    if (p.role !== 'agent' || p.team !== room.turn || room.revealed[i] !== false) return;
    room.revealed[i] = true;
    const c = room.colors[i];
    if (c === 'assassin') room.winner = other(room.turn);
    else if (left(room, 'red') === 0) room.winner = 'red';
    else if (left(room, 'blue') === 0) room.winner = 'blue';
    else if (c === room.turn) { if (--room.guesses <= 0) endTurn(room); }
    else endTurn(room);
    broadcast(socket.data.code);
  });

  socket.on('endTurn', () => {
    const room = getRoom();
    if (!room || !room.started || room.winner || !room.clue) return;
    const p = room.players[socket.id];
    if (p.role !== 'agent' || p.team !== room.turn) return;
    endTurn(room);
    broadcast(socket.data.code);
  });

  socket.on('restart', () => {
    const room = getRoom();
    if (!room) return;
    room.started = false;
    room.winner = null;
    broadcast(socket.data.code);
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    const room = rooms[code];
    if (!room) return;
    delete room.players[socket.id];
    if (Object.keys(room.players).length === 0) delete rooms[code];
    else broadcast(code);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Serveur sur http://localhost:' + PORT));
