import { WebSocketServer } from 'ws';
import { Chess } from 'chess.js';
import { nanoid } from 'nanoid';

const wss = new WebSocketServer({ port: 8080, host: '0.0.0.0' });
const rooms = new Map(); // id -> { game: Chess, history: string[], theme: any, players: [{ws, color, token}], undoPending: boolean, timer: timeout, chat: any[], lastMove: any, enforceSharedExp: boolean, allowPersonalPieces: boolean }

console.log('Chess LAN Server running on port 8080 (0.0.0.0)');

const broadcastStatus = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  const status = {
    white: room.players.some(p => p.color === 'w'),
    black: room.players.some(p => p.color === 'b')
  };
  console.log(`[BROADCAST] Room ${roomId} status: w:${status.white} b:${status.black}`);
  room.players.forEach(p => p.ws?.send(JSON.stringify({ type: 'presence', payload: status })));
};

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[SOCKET] New connection from ${ip}`);

  ws.on('message', (data) => {
    let message;
    try { message = JSON.parse(data); } catch (e) { return; }
    
    const { type, payload } = message;
    const roomId = payload?.roomId?.toUpperCase();

    if (type === 'create') {
      const newId = nanoid(6).toUpperCase();
      const token = nanoid(10);
      const game = new Chess();
      rooms.set(newId, { 
        game, 
        history: [game.fen()], 
        theme: null, 
        players: [{ ws, color: 'w', token }],
        undoPending: false,
        timer: null,
        chat: [],
        lastMove: null,
        enforceSharedExp: true,
        allowPersonalPieces: false
      });
      console.log(`[CREATE] Room: "${newId}" stored.`);
      ws.send(JSON.stringify({ type: 'created', payload: { roomId: newId, color: 'w', token } }));
      broadcastStatus(newId);
    }

    if (type === 'join') {
      const room = rooms.get(roomId);
      if (room) {
        let player = room.players.find(p => p.token === payload.token);
        
        if (player) {
          player.ws = ws;
          if (room.timer) {
            clearTimeout(room.timer);
            room.timer = null;
          }
          ws.send(JSON.stringify({ type: 'joined', payload: { roomId, color: player.color, token: player.token } }));
        } else if (room.players.length < 2) {
          const existingColors = room.players.map(p => p.color);
          const assignedColor = !existingColors.includes('w') ? 'w' : 'b';
          const token = nanoid(10);
          player = { ws, color: assignedColor, token };
          room.players.push(player);
          ws.send(JSON.stringify({ type: 'joined', payload: { roomId, color: assignedColor, token } }));
        } else {
          return ws.send(JSON.stringify({ type: 'error', payload: 'Room full' }));
        }

        broadcastStatus(roomId);
        ws.send(JSON.stringify({ 
          type: 'sync_full', 
          payload: { 
            history: room.history, 
            theme: room.theme,
            chat: room.chat,
            lastMove: room.lastMove,
            enforceSharedExp: room.enforceSharedExp,
            allowPersonalPieces: room.allowPersonalPieces
          } 
        }));
      } else {
        ws.send(JSON.stringify({ type: 'error', payload: 'Room not found' }));
      }
    }

    if (type === 'update_room_settings') {
      const room = rooms.get(roomId);
      if (room && room.players[0]?.ws === ws) {
        room.enforceSharedExp = payload.enforceSharedExp;
        room.allowPersonalPieces = payload.allowPersonalPieces;
        room.players.forEach(p => p.ws?.send(JSON.stringify({ 
          type: 'room_settings_sync', 
          payload: { enforceSharedExp: room.enforceSharedExp, allowPersonalPieces: room.allowPersonalPieces } 
        })));
      }
    }

    if (type === 'move') {
      const room = rooms.get(roomId);
      if (room) {
        if (room.undoPending) return ws.send(JSON.stringify({ type: 'error', payload: 'Undo request pending' }));
        try {
          const result = room.game.move(payload.move);
          if (result) {
            room.lastMove = { from: result.from, to: result.to };
            room.history.push(room.game.fen());
            room.players.forEach(p => p.ws?.send(JSON.stringify({ 
              type: 'sync', 
              payload: { fen: room.game.fen(), lastMove: room.lastMove, history: room.history } 
            })));
          }
        } catch (e) { ws.send(JSON.stringify({ type: 'error', payload: 'Invalid move' })); }
      }
    }

    if (type === 'chat') {
      const room = rooms.get(roomId);
      if (room) {
        const sender = room.players.find(p => p.ws === ws);
        const msg = {
          text: payload.text,
          sender: sender?.color || '?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        room.chat.push(msg);
        room.players.forEach(p => p.ws?.send(JSON.stringify({ type: 'chat', payload: msg })));
      }
    }

    if (type === 'theme_sync') {
      const room = rooms.get(roomId);
      if (room) {
        if (room.players[0]?.ws === ws) room.theme = payload.theme;
        room.players.forEach(p => { if (p.ws !== ws) p.ws?.send(JSON.stringify({ type: 'theme_sync', payload: payload.theme })); });
      }
    }

    if (type === 'undo_request' || type === 'undo_decline') {
      const room = rooms.get(roomId);
      if (room) {
        if (type === 'undo_request' && room.undoPending) return;
        room.undoPending = (type === 'undo_request');
        room.players.forEach(p => { if (p.ws !== ws) p.ws?.send(JSON.stringify({ type, payload })); });
      }
    }

    if (type === 'undo_accept') {
      const room = rooms.get(roomId);
      if (room && room.history.length > 1) {
        room.undoPending = false;
        room.game.undo();
        room.history.pop();
        const hist = room.game.history({ verbose: true });
        room.lastMove = hist.length > 0 ? hist[hist.length - 1] : null;
        room.players.forEach(p => p.ws?.send(JSON.stringify({ type: 'sync_full', payload: { history: room.history, lastMove: room.lastMove } })));
      }
    }
  });

  ws.on('close', () => {
    for (const [id, room] of rooms.entries()) {
      const player = room.players.find(p => p.ws === ws);
      if (player) {
        player.ws = null;
        if (room.undoPending) {
          room.undoPending = false;
          room.players.forEach(p => { if (p.ws) p.ws.send(JSON.stringify({ type: 'undo_decline', payload: { roomId: id, reason: 'Opponent disconnected' } })); });
        }
        if (room.players.every(p => !p.ws)) {
          room.timer = setTimeout(() => {
            if (rooms.get(id)?.players.every(p => !p.ws)) {
              rooms.delete(id);
              console.log(`[CLOSE] Room ${id} expired`);
            }
          }, 300000);
        } else {
          broadcastStatus(id);
        }
      }
    }
  });
});
