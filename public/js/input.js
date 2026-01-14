/**
 * InputHandler - Manages mouse and touch input
 */

class InputHandler {
  constructor(canvas, renderer, gameClient) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.gameClient = gameClient;
    this.selectedTerritoryId = null;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    // Touch events for mobile support
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  /**
   * Get mouse position relative to canvas
   */
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * Get touch position relative to canvas
   */
  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  /**
   * Handle mouse click
   */
  handleClick(e) {
    const pos = this.getMousePos(e);
    const gameState = this.gameClient.gameState;

    if (!gameState || gameState.gamePhase !== 'playing') return;

    const territory = this.renderer.getTerritoryAt(pos.x, pos.y, gameState.territories);

    if (!territory) {
      this.deselectTerritory();
      return;
    }

    // Get current player
    const currentPlayer = gameState.getCurrentPlayer();
    const isMyTurn = currentPlayer.id === this.gameClient.playerId;

    // If no territory selected, select this one
    if (this.selectedTerritoryId === null) {
      if (territory.owner === this.gameClient.playerId) {
        this.selectTerritory(territory.id);
      }
    } else {
      // If same territory clicked, deselect
      if (territory.id === this.selectedTerritoryId) {
        this.deselectTerritory();
      } else {
        // Try to attack
        const from = gameState.territories[this.selectedTerritoryId];

        if (from && isMyTurn) {
          // Check if this is a valid attack
          if (from.owner === this.gameClient.playerId &&
              territory.owner !== this.gameClient.playerId &&
              from.isAdjacentTo(territory.id) &&
              from.troops > 1) {
            // Perform attack
            this.gameClient.attack(from.id, territory.id);
            this.deselectTerritory();
          } else if (territory.owner === this.gameClient.playerId) {
            // Select new territory
            this.selectTerritory(territory.id);
          }
        }
      }
    }
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const pos = this.getMousePos(e);
    const gameState = this.gameClient.gameState;

    if (!gameState || gameState.gamePhase !== 'playing') return;

    const territory = this.renderer.getTerritoryAt(pos.x, pos.y, gameState.territories);

    if (territory) {
      this.renderer.setHoveredTerritory(territory.id);
      this.canvas.style.cursor = 'pointer';

      // Update selection info
      this.updateSelectionInfo(territory, gameState);
    } else {
      this.renderer.setHoveredTerritory(null);
      this.canvas.style.cursor = 'default';

      // Hide selection info if no territory selected
      if (this.selectedTerritoryId === null) {
        this.hideSelectionInfo();
      }
    }
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave() {
    this.renderer.setHoveredTerritory(null);
    this.canvas.style.cursor = 'default';

    if (this.selectedTerritoryId === null) {
      this.hideSelectionInfo();
    }
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    const mouseEvent = new MouseEvent('click', {
      clientX: pos.x + this.canvas.getBoundingClientRect().left,
      clientY: pos.y + this.canvas.getBoundingClientRect().top
    });
    this.handleClick(mouseEvent);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    e.preventDefault();
    const pos = this.getTouchPos(e);
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: pos.x + this.canvas.getBoundingClientRect().left,
      clientY: pos.y + this.canvas.getBoundingClientRect().top
    });
    this.handleMouseMove(mouseEvent);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    e.preventDefault();
  }

  /**
   * Select territory
   */
  selectTerritory(territoryId) {
    this.selectedTerritoryId = territoryId;
    this.renderer.setSelectedTerritory(territoryId);

    const gameState = this.gameClient.gameState;
    if (gameState) {
      const territory = gameState.territories[territoryId];
      if (territory) {
        this.updateSelectionInfo(territory, gameState);
      }
    }
  }

  /**
   * Deselect territory
   */
  deselectTerritory() {
    this.selectedTerritoryId = null;
    this.renderer.setSelectedTerritory(null);
    this.hideSelectionInfo();
  }

  /**
   * Update selection info panel
   */
  updateSelectionInfo(territory, gameState) {
    const selectionInfo = document.getElementById('selectionInfo');
    const selectedTroops = document.getElementById('selectedTroops');
    const selectedOwner = document.getElementById('selectedOwner');

    if (territory.owner !== null) {
      const owner = gameState.players.find(p => p.id === territory.owner);
      selectedOwner.textContent = owner ? owner.name : 'Unknown';
      selectedOwner.style.color = owner ? owner.color : '#fff';
    } else {
      selectedOwner.textContent = 'Neutral';
      selectedOwner.style.color = '#888';
    }

    selectedTroops.textContent = territory.troops;
    selectionInfo.classList.remove('hidden');
  }

  /**
   * Hide selection info panel
   */
  hideSelectionInfo() {
    const selectionInfo = document.getElementById('selectionInfo');
    selectionInfo.classList.add('hidden');
  }
}
