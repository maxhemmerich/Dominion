/**
 * GameClient - Main client-side game logic and networking
 */

class GameClient {
  constructor() {
    this.socket = null;
    this.gameState = null;
    this.playerId = null;
    this.currentLobbyId = null;
    this.renderer = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.renderLoop = null;

    this.init();
  }

  /**
   * Initialize game client
   */
  init() {
    // Connect to server
    this.socket = io();
    this.playerId = this.socket.id;

    // Create UI manager
    this.uiManager = new UIManager(this);

    // Setup event listeners
    this.setupSocketListeners();
    this.setupUIListeners();

    // Handle window resize
    window.addEventListener('resize', () => this.uiManager.handleResize());
  }

  /**
   * Setup Socket.io event listeners
   */
  setupSocketListeners() {
    // Connection events
    this.socket.on('connect', () => {
      this.playerId = this.socket.id;
      console.log('Connected to server:', this.playerId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.uiManager.showError('Disconnected from server');
    });

    // Lobby events
    this.socket.on('lobbyCreated', (lobby) => {
      console.log('Lobby created:', lobby);
      this.currentLobbyId = lobby.id;
      this.uiManager.showScreen('lobbyScreen');
      this.uiManager.updateLobby(lobby);
    });

    this.socket.on('lobbyUpdate', (lobby) => {
      console.log('Lobby updated:', lobby);
      this.uiManager.updateLobby(lobby);
    });

    // Game events
    this.socket.on('gameStarted', (gameStateData) => {
      console.log('Game started!');
      this.gameState = GameState.deserialize(gameStateData);
      this.startGame();
    });

    this.socket.on('gameStateUpdate', (gameStateData) => {
      this.gameState = GameState.deserialize(gameStateData);
      this.uiManager.updateHUD(this.gameState);
      this.uiManager.updatePlayersPanel(this.gameState);
    });

    this.socket.on('attackResult', (result) => {
      console.log('Attack result:', result);
      this.uiManager.animateAttack(result);

      // Refresh game state will come in next gameStateUpdate event
    });

    this.socket.on('gameEnded', (data) => {
      console.log('Game ended!', data);
      if (this.renderLoop) {
        cancelAnimationFrame(this.renderLoop);
      }
      this.uiManager.showGameOver(this.gameState);
    });

    // Error handling
    this.socket.on('error', (data) => {
      console.error('Server error:', data.message);
      this.uiManager.showError(data.message);
    });
  }

  /**
   * Setup UI event listeners
   */
  setupUIListeners() {
    // Main menu
    document.getElementById('createLobbyBtn').addEventListener('click', () => {
      const playerName = document.getElementById('playerNameInput').value.trim() || 'Player';
      this.createLobby(playerName);
    });

    document.getElementById('joinLobbyBtn').addEventListener('click', () => {
      const playerName = document.getElementById('playerNameInput').value.trim() || 'Player';
      const lobbyId = document.getElementById('lobbyIdInput').value.trim();

      if (!lobbyId) {
        this.uiManager.showError('Please enter a lobby ID');
        return;
      }

      this.joinLobby(lobbyId, playerName);
    });

    // Lobby screen
    document.getElementById('copyLobbyIdBtn').addEventListener('click', () => {
      const lobbyId = document.getElementById('lobbyId').textContent;
      navigator.clipboard.writeText(lobbyId).then(() => {
        this.uiManager.showError('Lobby ID copied to clipboard!');
      });
    });

    document.getElementById('addBotBtn').addEventListener('click', () => {
      this.addBot();
    });

    document.getElementById('toggleReadyBtn').addEventListener('click', () => {
      this.toggleReady();
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
      this.requestStartGame();
    });

    document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
      this.leaveLobby();
    });

    // Game screen
    document.getElementById('endTurnBtn').addEventListener('click', () => {
      this.endTurn();
    });

    // Game over screen
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.backToMenu();
    });
  }

  /**
   * Create a new lobby
   */
  createLobby(playerName) {
    this.socket.emit('createLobby', { playerName });
  }

  /**
   * Join existing lobby
   */
  joinLobby(lobbyId, playerName) {
    this.socket.emit('joinLobby', { lobbyId, playerName });
  }

  /**
   * Add bot to lobby
   */
  addBot() {
    this.socket.emit('addBot', { lobbyId: this.currentLobbyId });
  }

  /**
   * Toggle ready status
   */
  toggleReady() {
    this.socket.emit('toggleReady', { lobbyId: this.currentLobbyId });
  }

  /**
   * Request to start game
   */
  requestStartGame() {
    this.socket.emit('startGame', { lobbyId: this.currentLobbyId });
  }

  /**
   * Leave lobby
   */
  leaveLobby() {
    this.currentLobbyId = null;
    this.uiManager.showScreen('mainMenu');
  }

  /**
   * Start the game
   */
  startGame() {
    this.uiManager.showScreen('gameScreen');

    // Setup canvas
    const canvas = this.uiManager.setupCanvas();

    // Create renderer
    this.renderer = new Renderer(canvas);
    this.renderer.setSize(canvas.width, canvas.height);

    // Create input handler
    this.inputHandler = new InputHandler(canvas, this.renderer, this);

    // Start render loop
    this.startRenderLoop();

    // Start turn timer
    this.uiManager.startTurnTimer();

    // Initial UI update
    this.uiManager.updateHUD(this.gameState);
    this.uiManager.updatePlayersPanel(this.gameState);
  }

  /**
   * Start render loop
   */
  startRenderLoop() {
    const render = () => {
      if (this.gameState && this.renderer) {
        this.renderer.render(this.gameState);
      }
      this.renderLoop = requestAnimationFrame(render);
    };
    render();
  }

  /**
   * Perform an attack
   */
  attack(fromId, toId) {
    this.socket.emit('attack', {
      roomId: this.currentLobbyId,
      fromId,
      toId
    });
  }

  /**
   * End current turn
   */
  endTurn() {
    this.socket.emit('endTurn', {
      roomId: this.currentLobbyId
    });
  }

  /**
   * Back to main menu
   */
  backToMenu() {
    if (this.renderLoop) {
      cancelAnimationFrame(this.renderLoop);
      this.renderLoop = null;
    }

    this.gameState = null;
    this.currentLobbyId = null;
    this.renderer = null;
    this.inputHandler = null;

    this.uiManager.stopTurnTimer();
    this.uiManager.showScreen('mainMenu');
  }
}

// Initialize game when page loads
let gameClient;

window.addEventListener('DOMContentLoaded', () => {
  gameClient = new GameClient();
});
