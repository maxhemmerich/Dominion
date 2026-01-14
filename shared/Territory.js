/**
 * Territory class representing a single region on the map
 */
class Territory {
  constructor(id, vertices, center) {
    this.id = id;
    this.vertices = vertices; // Array of {x, y} points defining the polygon
    this.center = center; // {x, y} center point for display
    this.owner = null; // Player ID who owns this territory (null = neutral)
    this.troops = 10; // Number of troops stationed here
    this.neighbors = []; // Array of adjacent territory IDs
  }

  /**
   * Add a neighboring territory
   */
  addNeighbor(territoryId) {
    if (!this.neighbors.includes(territoryId)) {
      this.neighbors.push(territoryId);
    }
  }

  /**
   * Check if this territory is adjacent to another
   */
  isAdjacentTo(territoryId) {
    return this.neighbors.includes(territoryId);
  }

  /**
   * Serialize territory for network transmission
   */
  serialize() {
    return {
      id: this.id,
      vertices: this.vertices,
      center: this.center,
      owner: this.owner,
      troops: this.troops,
      neighbors: this.neighbors
    };
  }

  /**
   * Deserialize territory from network data
   */
  static deserialize(data) {
    const territory = new Territory(data.id, data.vertices, data.center);
    territory.owner = data.owner;
    territory.troops = data.troops;
    territory.neighbors = data.neighbors;
    return territory;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Territory;
}
