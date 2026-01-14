/**
 * AIBot - AI opponent logic for territory conquest
 */

class AIBot {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.aggressiveness = this.getAggressiveness();
  }

  /**
   * Get aggressiveness factor based on difficulty
   */
  getAggressiveness() {
    switch (this.difficulty) {
      case 'easy': return 0.3;
      case 'hard': return 0.8;
      default: return 0.5; // medium
    }
  }

  /**
   * Make a decision for the AI's turn
   * @param {GameState} gameState - Current game state
   * @param {string} playerId - AI player ID
   * @returns {Object|null} Attack decision or null if no good move
   */
  makeDecision(gameState, playerId) {
    const ownedTerritories = gameState.territories.filter(t => t.owner === playerId);

    if (ownedTerritories.length === 0) return null;

    // Evaluate all possible attacks
    const possibleAttacks = [];

    for (const territory of ownedTerritories) {
      if (territory.troops <= 1) continue;

      for (const neighborId of territory.neighbors) {
        const neighbor = gameState.territories[neighborId];

        // Don't attack own territories
        if (neighbor.owner === playerId) continue;

        // Evaluate this attack
        const score = this.evaluateAttack(territory, neighbor, gameState, playerId);
        possibleAttacks.push({
          fromId: territory.id,
          toId: neighbor.id,
          score
        });
      }
    }

    if (possibleAttacks.length === 0) return null;

    // Sort by score and pick based on difficulty
    possibleAttacks.sort((a, b) => b.score - a.score);

    // Add some randomness based on difficulty
    let choice;
    if (this.difficulty === 'easy') {
      // Easy: Pick from top 50% randomly
      const topHalf = possibleAttacks.slice(0, Math.max(1, Math.floor(possibleAttacks.length / 2)));
      choice = topHalf[Math.floor(Math.random() * topHalf.length)];
    } else if (this.difficulty === 'hard') {
      // Hard: Usually pick best, sometimes second best
      choice = Math.random() < 0.8 ? possibleAttacks[0] : possibleAttacks[Math.min(1, possibleAttacks.length - 1)];
    } else {
      // Medium: Pick from top 30%
      const topThird = possibleAttacks.slice(0, Math.max(1, Math.floor(possibleAttacks.length * 0.3)));
      choice = topThird[Math.floor(Math.random() * topThird.length)];
    }

    return choice;
  }

  /**
   * Evaluate the value of an attack
   * @returns {number} Score for this attack (higher is better)
   */
  evaluateAttack(from, to, gameState, playerId) {
    let score = 0;

    // Factor 1: Troop advantage
    const troopAdvantage = from.troops - to.troops;
    score += troopAdvantage * 10;

    // Factor 2: Prefer attacking neutral territories over players
    if (to.owner === null) {
      score += 20;
    }

    // Factor 3: Prefer attacking weaker opponents
    if (to.owner !== null) {
      const opponent = gameState.players.find(p => p.id === to.owner);
      if (opponent) {
        // Attack weaker players (fewer territories)
        score += (10 - opponent.territoriesOwned) * 5;
      }
    }

    // Factor 4: Strategic position - prefer territories with more neighbors
    score += to.neighbors.length * 3;

    // Factor 5: Defensive consideration - don't weaken border too much
    const isBorder = from.neighbors.some(nId => {
      const neighbor = gameState.territories[nId];
      return neighbor.owner !== playerId;
    });

    if (isBorder && from.troops < 5) {
      score -= 30; // Don't attack from weak border territories
    }

    // Factor 6: Expansion priority
    const ownedNeighbors = to.neighbors.filter(nId => {
      return gameState.territories[nId].owner === playerId;
    }).length;

    // Prefer territories that connect to our existing territories
    score += ownedNeighbors * 8;

    // Factor 7: Aggressiveness modifier
    if (troopAdvantage < 0) {
      score *= (1 - this.aggressiveness); // Reduce score for risky attacks
    }

    return score;
  }

  /**
   * Decide whether to attack this turn
   * @returns {boolean} True if AI should attack
   */
  shouldAttack(gameState, playerId) {
    const ownedTerritories = gameState.territories.filter(t => t.owner === playerId);
    const totalTroops = ownedTerritories.reduce((sum, t) => sum + t.troops, 0);

    // Early game: Expand aggressively
    if (ownedTerritories.length < 10) return true;

    // If we have strong armies, attack
    if (totalTroops > ownedTerritories.length * 3) return true;

    // Random chance based on aggressiveness
    return Math.random() < this.aggressiveness;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIBot;
}
