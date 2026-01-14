/**
 * Territory Conquest Game - Server
 * Handles multiplayer connections and game coordination
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const GameState = require('../shared/GameState.js');
const AIBot = require('../shared/AIBot.js');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve shared files to client
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Game rooms (support multiple concurrent games)
const gameRooms = new Map();

// Lobby system
const lobbies = new Map();

/**
 * Create a new lobby
 */
function createLobby(hostId, hostName) {
  const lobbyId = generateId();
  const lobby = {
    id: lobbyId,
    host: hostId,
    players: [{
      id: hostId,
      name: hostName,
      isReady: false,
      isAI: false
    }],
    gameStarted: false,
    maxPlayers: 8
  };
  lobbies.set(lobbyId, lobby);
  return lobby;
}

/**
 * Start game from lobby
 */
function startGame(lobbyId) {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return null;

  // Create game state
  const gameState = new GameState({
    turnTimeLimit: 45000,
    mapWidth: 1200,
    mapHeight: 800,
    territoryCount: 60
  });

  gameState.initializeGame(lobby.players);

  // Store game room
  gameRooms.set(lobbyId, {
    gameState,
    players: lobby.players,
    turnTimer: null,
    aiPlayers: lobby.players.filter(p => p.isAI).map(p => ({
      id: p.id,
      bot: new AIBot('medium')
    }))
  });

  lobby.gameStarted = true;

  // Start turn timer
  startTurnTimer(lobbyId);

  return gameState;
}

/**
 * Start turn timer for a game
 */
function startTurnTimer(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  // Clear existing timer
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
  }

  // Set new timer
  room.turnTimer = setTimeout(() => {
    // Auto-advance turn if time runs out
    handleTurnEnd(roomId);
  }, room.gameState.turnTimeLimit);
}

/**
 * Handle turn end (manual or timeout)
 */
function handleTurnEnd(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  room.gameState.nextTurn();

  // Broadcast updated state
  io.to(roomId).emit('gameStateUpdate', room.gameState.serialize());

  // Check if game ended
  if (room.gameState.gamePhase === 'ended') {
    clearTimeout(room.turnTimer);
    io.to(roomId).emit('gameEnded', {
      winner: room.gameState.winner
    });
    return;
  }

  // Start new turn timer
  startTurnTimer(roomId);

  // Check if current player is AI
  const currentPlayer = room.gameState.getCurrentPlayer();
  if (currentPlayer.isAI) {
    // Delay AI action slightly for more natural feel
    setTimeout(() => {
      handleAITurn(roomId);
    }, 1000 + Math.random() * 1000);
  }
}

/**
 * Handle AI turn
 */
function handleAITurn(roomId) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  const currentPlayer = room.gameState.getCurrentPlayer();
  const aiPlayer = room.aiPlayers.find(ai => ai.id === currentPlayer.id);

  if (!aiPlayer) return;

  // AI makes multiple decisions per turn
  const actionsPerTurn = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < actionsPerTurn; i++) {
    const decision = aiPlayer.bot.makeDecision(room.gameState, currentPlayer.id);

    if (decision && decision.score > 0) {
      // Execute attack
      const result = room.gameState.processAttack(
        decision.fromId,
        decision.toId,
        currentPlayer.id
      );

      // Broadcast attack result
      io.to(roomId).emit('attackResult', {
        ...result,
        playerId: currentPlayer.id
      });

      // Small delay between AI actions
      if (i < actionsPerTurn - 1) {
        const delay = 500 + Math.random() * 500;
        setTimeout(() => {}, delay);
      }
    }
  }

  // Broadcast updated state
  io.to(roomId).emit('gameStateUpdate', room.gameState.serialize());

  // End AI turn after a short delay
  setTimeout(() => {
    handleTurnEnd(roomId);
  }, 1500);
}

/**
 * Socket.io connection handling
 */
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  /**
   * Create new lobby
   */
  socket.on('createLobby', (data) => {
    const lobby = createLobby(socket.id, data.playerName);
    socket.join(lobby.id);
    socket.emit('lobbyCreated', lobby);
    console.log(`Lobby created: ${lobby.id}`);
  });

  /**
   * Join existing lobby
   */
  socket.on('joinLobby', (data) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (lobby.gameStarted) {
      socket.emit('error', { message: 'Game already started' });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    lobby.players.push({
      id: socket.id,
      name: data.playerName,
      isReady: false,
      isAI: false
    });

    socket.join(lobby.id);
    io.to(lobby.id).emit('lobbyUpdate', lobby);
    console.log(`Player ${data.playerName} joined lobby ${lobby.id}`);
  });

  /**
   * Add AI bot to lobby
   */
  socket.on('addBot', (data) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby || lobby.host !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('error', { message: 'Lobby is full' });
      return;
    }

    const botId = generateId();
    lobby.players.push({
      id: botId,
      name: `Bot ${lobby.players.filter(p => p.isAI).length + 1}`,
      isReady: true,
      isAI: true
    });

    io.to(lobby.id).emit('lobbyUpdate', lobby);
  });

  /**
   * Player ready toggle
   */
  socket.on('toggleReady', (data) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby) return;

    const player = lobby.players.find(p => p.id === socket.id);
    if (player) {
      player.isReady = !player.isReady;
      io.to(lobby.id).emit('lobbyUpdate', lobby);
    }
  });

  /**
   * Start game
   */
  socket.on('startGame', (data) => {
    const lobby = lobbies.get(data.lobbyId);

    if (!lobby || lobby.host !== socket.id) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }

    // Check if enough players
    if (lobby.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players' });
      return;
    }

    // Check if all human players are ready
    const allReady = lobby.players.every(p => p.isAI || p.isReady);
    if (!allReady) {
      socket.emit('error', { message: 'Not all players are ready' });
      return;
    }

    const gameState = startGame(lobby.id);
    io.to(lobby.id).emit('gameStarted', gameState.serialize());
    console.log(`Game started in lobby ${lobby.id}`);
  });

  /**
   * Process attack
   */
  socket.on('attack', (data) => {
    const room = gameRooms.get(data.roomId);

    if (!room) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const currentPlayer = room.gameState.getCurrentPlayer();

    // Verify it's this player's turn
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Process attack
    const result = room.gameState.processAttack(
      data.fromId,
      data.toId,
      socket.id
    );

    if (result.success) {
      // Broadcast attack result to all players in room
      io.to(data.roomId).emit('attackResult', result);
      io.to(data.roomId).emit('gameStateUpdate', room.gameState.serialize());
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * End turn
   */
  socket.on('endTurn', (data) => {
    const room = gameRooms.get(data.roomId);

    if (!room) return;

    const currentPlayer = room.gameState.getCurrentPlayer();

    if (currentPlayer.id !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    handleTurnEnd(data.roomId);
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from lobbies
    for (const [lobbyId, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        // If host disconnects, assign new host or delete lobby
        if (lobby.host === socket.id) {
          lobby.players.splice(playerIndex, 1);
          if (lobby.players.length > 0) {
            lobby.host = lobby.players[0].id;
            io.to(lobbyId).emit('lobbyUpdate', lobby);
          } else {
            lobbies.delete(lobbyId);
          }
        } else {
          lobby.players.splice(playerIndex, 1);
          io.to(lobbyId).emit('lobbyUpdate', lobby);
        }
      }
    }

    // Handle in-game disconnections
    for (const [roomId, room] of gameRooms.entries()) {
      const player = room.gameState.players.find(p => p.id === socket.id);
      if (player) {
        // Mark player as disconnected (could implement reconnection logic here)
        console.log(`Player ${player.name} disconnected from game ${roomId}`);
        // For now, we'll let the game continue
      }
    }
  });
});

/**
 * Generate unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Start server
 */
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Territory Conquest Game Server          ║
║   Running on http://localhost:${PORT}       ║
╚════════════════════════════════════════════╝
  `);
});
