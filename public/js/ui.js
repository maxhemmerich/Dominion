/**
 * UI Manager - Handles UI updates and screen transitions
 */

class UIManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.currentScreen = 'mainMenu';
    this.turnTimerInterval = null;
  }

  /**
   * Show a specific screen
   */
  showScreen(screenName) {
    console.log(`[UI] Switching to screen: ${screenName}`);

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.classList.add('hidden');
      console.log(`[UI] Hiding screen: ${screen.id}`);
    });

    // Show target screen
    const targetScreen = document.getElementById(screenName);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      this.currentScreen = screenName;
      console.log(`[UI] Showing screen: ${screenName}`);
    } else {
      console.error(`[UI] Screen not found: ${screenName}`);
    }
  }

  /**
   * Show error toast
   */
  showError(message) {
    const toast = document.getElementById('errorToast');
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  /**
   * Update lobby UI
   */
  updateLobby(lobby) {
    document.getElementById('lobbyId').textContent = lobby.id;
    document.getElementById('playerCount').textContent = lobby.players.length;

    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    lobby.players.forEach(player => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="${player.isAI ? 'player-ai' : (player.isReady ? 'player-ready' : 'player-not-ready')}">
          ${player.isAI ? '[BOT]' : (player.isReady ? '✓ Ready' : '⏳ Not Ready')}
        </span>
      `;
      playersList.appendChild(li);
    });

    // Update start button visibility (only host can start)
    const startBtn = document.getElementById('startGameBtn');
    const isHost = lobby.host === this.gameClient.playerId;
    startBtn.style.display = isHost ? 'block' : 'none';

    // Update add bot button visibility (only host can add bots)
    const addBotBtn = document.getElementById('addBotBtn');
    addBotBtn.style.display = isHost ? 'block' : 'none';
  }

  /**
   * Update game HUD
   */
  updateHUD(gameState) {
    if (!gameState || gameState.gamePhase !== 'playing') return;

    // Update current player
    const currentPlayer = gameState.getCurrentPlayer();
    document.getElementById('currentPlayerName').textContent = currentPlayer.name;

    // Update turn timer
    const timeRemaining = Math.ceil(gameState.getTurnTimeRemaining() / 1000);
    const timerElement = document.getElementById('turnTimer');
    timerElement.textContent = timeRemaining;

    // Update timer color based on time remaining
    timerElement.classList.remove('warning', 'danger');
    if (timeRemaining <= 10) {
      timerElement.classList.add('danger');
    } else if (timeRemaining <= 20) {
      timerElement.classList.add('warning');
    }

    // Update player's own stats
    const myPlayer = gameState.players.find(p => p.id === this.gameClient.playerId);
    if (myPlayer) {
      document.getElementById('playerTerritories').textContent = myPlayer.territoriesOwned;
      document.getElementById('playerTroops').textContent = myPlayer.totalTroops;
    }

    // Update end turn button
    const endTurnBtn = document.getElementById('endTurnBtn');
    const isMyTurn = currentPlayer.id === this.gameClient.playerId;
    endTurnBtn.disabled = !isMyTurn;
    endTurnBtn.style.opacity = isMyTurn ? '1' : '0.5';
  }

  /**
   * Update players panel
   */
  updatePlayersPanel(gameState) {
    if (!gameState) return;

    const playersList = document.getElementById('gamePlayersList');
    playersList.innerHTML = '';

    // Sort players by territories owned
    const sortedPlayers = [...gameState.players].sort((a, b) => b.territoriesOwned - a.territoriesOwned);

    sortedPlayers.forEach(player => {
      const li = document.createElement('li');
      li.style.borderLeft = `4px solid ${player.color}`;
      li.className = player.isAlive ? '' : 'player-eliminated';

      li.innerHTML = `
        <div class="player-item">
          <span class="player-name">${player.name}</span>
          <span>${player.territoriesOwned} territories</span>
        </div>
      `;

      playersList.appendChild(li);
    });
  }

  /**
   * Start turn timer update loop
   */
  startTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
    }

    this.turnTimerInterval = setInterval(() => {
      if (this.gameClient.gameState) {
        this.updateHUD(this.gameClient.gameState);
      }
    }, 100); // Update every 100ms for smooth countdown
  }

  /**
   * Stop turn timer
   */
  stopTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
  }

  /**
   * Show game over screen
   */
  showGameOver(gameState) {
    this.stopTurnTimer();

    const winner = gameState.winner;

    if (winner) {
      document.getElementById('gameOverTitle').textContent = 'Victory!';
      document.getElementById('winnerName').textContent = winner.name;
      document.getElementById('winnerName').style.color = winner.color;
      document.getElementById('winnerStats').textContent =
        `Controlled ${winner.territoriesOwned} territories with ${winner.totalTroops} troops`;
    } else {
      document.getElementById('gameOverTitle').textContent = 'Draw!';
      document.getElementById('winnerName').textContent = 'No winner';
      document.getElementById('winnerStats').textContent = '';
    }

    // Show final standings
    const standingsList = document.getElementById('finalStandingsList');
    standingsList.innerHTML = '';

    const sortedPlayers = [...gameState.players].sort((a, b) => b.territoriesOwned - a.territoriesOwned);

    sortedPlayers.forEach((player, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${index + 1}. ${player.name}</span>
        <span style="color: ${player.color}">${player.territoriesOwned} territories</span>
      `;
      standingsList.appendChild(li);
    });

    this.showScreen('gameOverScreen');
  }

  /**
   * Animate attack result
   */
  animateAttack(result) {
    // This could be enhanced with more visual effects
    if (result.conquered) {
      console.log(`Territory ${result.toId} conquered!`);
    }
  }

  /**
   * Setup canvas size
   */
  setupCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const hud = document.getElementById('gameHUD');
    const hudHeight = hud.offsetHeight;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - hudHeight;
    canvas.style.marginTop = hudHeight + 'px';

    return canvas;
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.currentScreen === 'gameScreen') {
      this.setupCanvas();
      if (this.gameClient.renderer && this.gameClient.gameState) {
        this.gameClient.renderer.render(this.gameClient.gameState);
      }
    }
  }
}
