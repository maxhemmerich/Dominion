/**
 * Renderer - Handles all canvas drawing operations
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.selectedTerritoryId = null;
    this.hoveredTerritoryId = null;
    this.camera = { x: 0, y: 0, zoom: 1 };
  }

  /**
   * Set canvas size
   */
  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render the entire game state
   */
  render(gameState) {
    this.clear();

    // Draw territories
    for (const territory of gameState.territories) {
      this.drawTerritory(territory, gameState);
    }

    // Draw borders
    for (const territory of gameState.territories) {
      this.drawTerritoryBorder(territory);
    }

    // Draw troop counts and highlights
    for (const territory of gameState.territories) {
      // Highlight selected territory
      if (territory.id === this.selectedTerritoryId) {
        this.highlightTerritory(territory, 'rgba(255, 255, 255, 0.5)');
      }

      // Highlight hovered territory
      if (territory.id === this.hoveredTerritoryId && territory.id !== this.selectedTerritoryId) {
        this.highlightTerritory(territory, 'rgba(255, 255, 255, 0.3)');
      }

      // Draw troop count
      this.drawTroopCount(territory);
    }

    // Draw attack preview
    if (this.selectedTerritoryId !== null && this.hoveredTerritoryId !== null) {
      const from = gameState.territories[this.selectedTerritoryId];
      const to = gameState.territories[this.hoveredTerritoryId];

      if (from && to && from.owner !== to.owner && from.isAdjacentTo(to.id)) {
        this.drawAttackArrow(from, to);
      }
    }
  }

  /**
   * Draw a single territory
   */
  drawTerritory(territory, gameState) {
    if (territory.vertices.length === 0) return;

    const ctx = this.ctx;
    ctx.beginPath();

    // Draw polygon
    ctx.moveTo(territory.vertices[0].x, territory.vertices[0].y);
    for (let i = 1; i < territory.vertices.length; i++) {
      ctx.lineTo(territory.vertices[i].x, territory.vertices[i].y);
    }
    ctx.closePath();

    // Fill with owner's color or neutral color
    if (territory.owner !== null) {
      const player = gameState.players.find(p => p.id === territory.owner);
      if (player) {
        ctx.fillStyle = player.color;
      } else {
        ctx.fillStyle = '#555555'; // Fallback color
      }
    } else {
      ctx.fillStyle = '#888888'; // Neutral territory
    }

    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw territory border
   */
  drawTerritoryBorder(territory) {
    if (territory.vertices.length === 0) return;

    const ctx = this.ctx;
    ctx.beginPath();

    ctx.moveTo(territory.vertices[0].x, territory.vertices[0].y);
    for (let i = 1; i < territory.vertices.length; i++) {
      ctx.lineTo(territory.vertices[i].x, territory.vertices[i].y);
    }
    ctx.closePath();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Highlight territory
   */
  highlightTerritory(territory, color) {
    if (territory.vertices.length === 0) return;

    const ctx = this.ctx;
    ctx.beginPath();

    ctx.moveTo(territory.vertices[0].x, territory.vertices[0].y);
    for (let i = 1; i < territory.vertices.length; i++) {
      ctx.lineTo(territory.vertices[i].x, territory.vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    // Draw thicker border for selected
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /**
   * Draw troop count on territory
   */
  drawTroopCount(territory) {
    const ctx = this.ctx;
    const center = territory.center;

    // Draw background circle
    ctx.beginPath();
    ctx.arc(center.x, center.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw troop count
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(territory.troops.toString(), center.x, center.y);
  }

  /**
   * Draw attack arrow between territories
   */
  drawAttackArrow(from, to) {
    const ctx = this.ctx;
    const fromCenter = from.center;
    const toCenter = to.center;

    // Draw arrow line
    ctx.beginPath();
    ctx.moveTo(fromCenter.x, fromCenter.y);
    ctx.lineTo(toCenter.x, toCenter.y);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(toCenter.x, toCenter.y);
    ctx.lineTo(
      toCenter.x - arrowLength * Math.cos(angle - arrowAngle),
      toCenter.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(toCenter.x, toCenter.y);
    ctx.lineTo(
      toCenter.x - arrowLength * Math.cos(angle + arrowAngle),
      toCenter.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  /**
   * Find territory at given coordinates
   */
  getTerritoryAt(x, y, territories) {
    // Check in reverse order (top territories first)
    for (let i = territories.length - 1; i >= 0; i--) {
      const territory = territories[i];
      if (this.isPointInTerritory(x, y, territory)) {
        return territory;
      }
    }
    return null;
  }

  /**
   * Check if point is inside territory polygon
   */
  isPointInTerritory(x, y, territory) {
    if (territory.vertices.length === 0) return false;

    // Use ray casting algorithm
    let inside = false;
    const vertices = territory.vertices;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Render attack animation
   */
  renderAttackAnimation(from, to, callback) {
    const fromCenter = from.center;
    const toCenter = to.center;
    const duration = 500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Draw explosion effect at target
      if (progress > 0.5) {
        const explosionProgress = (progress - 0.5) * 2;
        const radius = 30 * explosionProgress;
        const alpha = 1 - explosionProgress;

        this.ctx.beginPath();
        this.ctx.arc(toCenter.x, toCenter.y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
        this.ctx.fill();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (callback) {
        callback();
      }
    };

    animate();
  }

  /**
   * Set selected territory
   */
  setSelectedTerritory(territoryId) {
    this.selectedTerritoryId = territoryId;
  }

  /**
   * Set hovered territory
   */
  setHoveredTerritory(territoryId) {
    this.hoveredTerritoryId = territoryId;
  }
}
