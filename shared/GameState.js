/**
 * GameState - Core game logic and state management
 */

// Import dependencies (Node.js only - browser uses global)
if (typeof require !== 'undefined' && typeof Territory === 'undefined') {
  var Territory = require('./Territory.js');
}
if (typeof require !== 'undefined' && typeof MapGenerator === 'undefined') {
  var MapGenerator = require('./MapGenerator.js');
}

class GameState {
  constructor(config = {}) {
    this.territories = [];
    this.players = [];
    this.currentTurn = 0;
    this.turnTimeLimit = config.turnTimeLimit || 45000; // 45 seconds
    this.turnStartTime = Date.now();
    this.gamePhase = 'lobby'; // lobby, playing, ended
    this.winner = null;
    this.mapWidth = config.mapWidth || 1200;
    this.mapHeight = config.mapHeight || 800;
    this.territoryCount = config.territoryCount || 60;
    this.troopGenerationRate = config.troopGenerationRate || 1; // Troops per territory per turn
  }

  /**
   * Initialize the game with players
   */
  initializeGame(players) {
    this.players = players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      color: this.getPlayerColor(idx),
      isAI: p.isAI || false,
      isAlive: true,
      territoriesOwned: 0,
      totalTroops: 0
    }));

    // Generate map
    this.territories = MapGenerator.generateMap(
      this.territoryCount,
      this.mapWidth,
      this.mapHeight
    );

    // Assign starting territories to players
    this.assignStartingTerritories();

    // Set game phase
    this.gamePhase = 'playing';
    this.currentTurn = 0;
    this.turnStartTime = Date.now();
  }

  /**
   * Assign starting territories to players
   */
  assignStartingTerritories() {
    const territoriesPerPlayer = Math.floor(this.territories.length / this.players.length / 2);

    // Shuffle territories
    const shuffled = [...this.territories].sort(() => Math.random() - 0.5);

    let territoryIndex = 0;
    for (const player of this.players) {
      for (let i = 0; i < territoriesPerPlayer; i++) {
        if (territoryIndex < shuffled.length) {
          shuffled[territoryIndex].owner = player.id;
          shuffled[territoryIndex].troops = 15;
          territoryIndex++;
        }
      }
    }

    // Remaining territories are neutral
    for (let i = territoryIndex; i < shuffled.length; i++) {
      shuffled[i].owner = null;
      shuffled[i].troops = 5;
    }

    this.updatePlayerStats();
  }

  /**
   * Get player color based on index
   */
  getPlayerColor(index) {
    const colors = [
      '#FF4444', // Red
      '#4444FF', // Blue
      '#44FF44', // Green
      '#FFFF44', // Yellow
      '#FF44FF', // Magenta
      '#44FFFF', // Cyan
      '#FF8844', // Orange
      '#8844FF'  // Purple
    ];
    return colors[index % colors.length];
  }

  /**
   * Process an attack from one territory to another
   * @param {number} fromId - Attacking territory ID
   * @param {number} toId - Defending territory ID
   * @param {string} playerId - ID of attacking player
   * @returns {Object} Result of the attack
   */
  processAttack(fromId, toId, playerId) {
    const from = this.territories[fromId];
    const to = this.territories[toId];

    // Validate attack
    if (!this.validateAttack(from, to, playerId)) {
      return { success: false, error: 'Invalid attack' };
    }

    // Combat resolution with randomness
    const attackPower = from.troops - 1; // Keep 1 troop in origin
    const defensePower = to.troops;

    // Add some randomness (±20%)
    const attackRoll = attackPower * (0.8 + Math.random() * 0.4);
    const defenseRoll = defensePower * (0.8 + Math.random() * 0.4);

    let result = {
      success: true,
      conquered: false,
      attackerLosses: 0,
      defenderLosses: 0,
      fromId,
      toId
    };

    if (attackRoll > defenseRoll) {
      // Attacker wins
      const troopsToMove = Math.floor(from.troops * 0.7);
      const survivingTroops = Math.max(1, Math.floor(troopsToMove * 0.6));

      from.troops -= troopsToMove;
      to.owner = from.owner;
      to.troops = survivingTroops;

      result.conquered = true;
      result.attackerLosses = troopsToMove - survivingTroops;
      result.defenderLosses = defensePower;
    } else {
      // Defender wins
      const attackerLosses = Math.floor(attackPower * 0.5);
      const defenderLosses = Math.floor(defensePower * 0.3);

      from.troops -= attackerLosses;
      to.troops -= defenderLosses;
      to.troops = Math.max(1, to.troops);

      result.attackerLosses = attackerLosses;
      result.defenderLosses = defenderLosses;
    }

    this.updatePlayerStats();
    this.checkWinCondition();

    return result;
  }

  /**
   * Validate if an attack is legal
   */
  validateAttack(from, to, playerId) {
    if (!from || !to) return false;
    if (from.owner !== playerId) return false;
    if (to.owner === playerId) return false;
    if (from.troops <= 1) return false;
    if (!from.isAdjacentTo(to.id)) return false;
    return true;
  }

  /**
   * Advance to next turn
   */
  nextTurn() {
    this.currentTurn++;
    this.turnStartTime = Date.now();

    // Generate troops for all territories
    this.generateTroops();

    // Check if current player is alive, skip if not
    let attempts = 0;
    while (!this.getCurrentPlayer().isAlive && attempts < this.players.length) {
      this.currentTurn++;
      attempts++;
    }

    this.updatePlayerStats();
  }

  /**
   * Generate troops for all owned territories
   */
  generateTroops() {
    for (const territory of this.territories) {
      if (territory.owner !== null) {
        territory.troops += this.troopGenerationRate;
      }
    }
  }

  /**
   * Get current player
   */
  getCurrentPlayer() {
    return this.players[this.currentTurn % this.players.length];
  }

  /**
   * Update player statistics
   */
  updatePlayerStats() {
    for (const player of this.players) {
      player.territoriesOwned = this.territories.filter(t => t.owner === player.id).length;
      player.totalTroops = this.territories
        .filter(t => t.owner === player.id)
        .reduce((sum, t) => sum + t.troops, 0);

      player.isAlive = player.territoriesOwned > 0;
    }
  }

  /**
   * Check win condition
   */
  checkWinCondition() {
    const alivePlayers = this.players.filter(p => p.isAlive);

    if (alivePlayers.length === 1) {
      this.gamePhase = 'ended';
      this.winner = alivePlayers[0];
    } else if (alivePlayers.length === 0) {
      this.gamePhase = 'ended';
      this.winner = null;
    }
  }

  /**
   * Get time remaining in current turn
   */
  getTurnTimeRemaining() {
    return Math.max(0, this.turnTimeLimit - (Date.now() - this.turnStartTime));
  }

  /**
   * Serialize game state for network transmission
   */
  serialize() {
    return {
      territories: this.territories.map(t => t.serialize()),
      players: this.players,
      currentTurn: this.currentTurn,
      turnTimeLimit: this.turnTimeLimit,
      turnStartTime: this.turnStartTime,
      gamePhase: this.gamePhase,
      winner: this.winner,
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight
    };
  }

  /**
   * Deserialize game state from network data
   */
  static deserialize(data) {
    const gameState = new GameState();
    gameState.territories = data.territories.map(t => Territory.deserialize(t));
    gameState.players = data.players;
    gameState.currentTurn = data.currentTurn;
    gameState.turnTimeLimit = data.turnTimeLimit;
    gameState.turnStartTime = data.turnStartTime;
    gameState.gamePhase = data.gamePhase;
    gameState.winner = data.winner;
    gameState.mapWidth = data.mapWidth;
    gameState.mapHeight = data.mapHeight;
    return gameState;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameState;
}
