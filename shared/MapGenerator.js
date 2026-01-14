/**
 * MapGenerator - Creates procedural maps with territories
 * Uses a simplified Voronoi-like approach for territory generation
 */

// Import Territory class (Node.js only - browser uses global)
if (typeof require !== 'undefined' && typeof Territory === 'undefined') {
  var Territory = require('./Territory.js');
}

class MapGenerator {
  /**
   * Generate a map with specified number of territories
   * @param {number} territoryCount - Number of territories to generate (50-100)
   * @param {number} width - Map width
   * @param {number} height - Map height
   * @returns {Array<Territory>} Array of generated territories
   */
  static generateMap(territoryCount, width, height) {
    // Generate seed points for territories
    const points = this.generatePoints(territoryCount, width, height);

    // Create territories from points
    const territories = this.createTerritories(points, width, height);

    // Calculate neighbors for each territory
    this.calculateNeighbors(territories);

    return territories;
  }

  /**
   * Generate random points with some spacing using Poisson-disc-like sampling
   */
  static generatePoints(count, width, height) {
    const points = [];
    const minDistance = Math.sqrt((width * height) / count) * 0.7;
    const maxAttempts = 30;

    while (points.length < count) {
      const point = {
        x: Math.random() * width,
        y: Math.random() * height
      };

      // Check if point is far enough from existing points
      let valid = true;
      for (const existing of points) {
        const dx = point.x - existing.x;
        const dy = point.y - existing.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          valid = false;
          break;
        }
      }

      if (valid || points.length === 0) {
        points.push(point);
      }
    }

    return points;
  }

  /**
   * Create territory polygons using a grid-based Voronoi approach
   */
  static createTerritories(points, width, height) {
    const territories = [];
    const gridSize = 10; // Pixel resolution for Voronoi calculation
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    // Create a grid to track which territory each cell belongs to
    const grid = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        const cellX = x * gridSize + gridSize / 2;
        const cellY = y * gridSize + gridSize / 2;

        // Find closest point
        let closestIdx = 0;
        let closestDist = Infinity;

        for (let i = 0; i < points.length; i++) {
          const dx = cellX - points[i].x;
          const dy = cellY - points[i].y;
          const dist = dx * dx + dy * dy;

          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }
        }

        grid[y][x] = closestIdx;
      }
    }

    // Extract territory boundaries from grid
    for (let i = 0; i < points.length; i++) {
      const vertices = this.extractBoundary(grid, i, gridSize, cols, rows);
      const center = points[i];
      territories.push(new Territory(i, vertices, center));
    }

    return territories;
  }

  /**
   * Extract boundary vertices for a territory from the grid
   */
  static extractBoundary(grid, territoryId, gridSize, cols, rows) {
    const vertices = [];
    const visited = new Set();

    // Find all edge cells for this territory
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === territoryId) {
          // Check if this is an edge cell
          const isEdge =
            x === 0 || x === cols - 1 || y === 0 || y === rows - 1 ||
            grid[y-1][x] !== territoryId ||
            grid[y+1][x] !== territoryId ||
            grid[y][x-1] !== territoryId ||
            grid[y][x+1] !== territoryId;

          if (isEdge) {
            vertices.push({
              x: x * gridSize,
              y: y * gridSize
            });
          }
        }
      }
    }

    // Simplify vertices using convex hull approach
    if (vertices.length > 8) {
      return this.convexHull(vertices);
    }

    return vertices.length > 0 ? vertices : [
      {x: 0, y: 0}, {x: gridSize, y: 0},
      {x: gridSize, y: gridSize}, {x: 0, y: gridSize}
    ];
  }

  /**
   * Calculate convex hull using Graham scan algorithm
   */
  static convexHull(points) {
    if (points.length < 3) return points;

    // Find the bottom-most point (or left-most in case of tie)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[start].y ||
          (points[i].y === points[start].y && points[i].x < points[start].x)) {
        start = i;
      }
    }

    const startPoint = points[start];

    // Sort points by polar angle
    const sorted = points.filter((_, i) => i !== start).sort((a, b) => {
      const angleA = Math.atan2(a.y - startPoint.y, a.x - startPoint.x);
      const angleB = Math.atan2(b.y - startPoint.y, b.x - startPoint.x);
      return angleA - angleB;
    });

    // Build convex hull
    const hull = [startPoint, sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      while (hull.length > 1 &&
             this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
        hull.pop();
      }
      hull.push(sorted[i]);
    }

    return hull;
  }

  /**
   * Calculate cross product for three points
   */
  static crossProduct(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  /**
   * Calculate neighbors for all territories based on proximity
   */
  static calculateNeighbors(territories) {
    for (let i = 0; i < territories.length; i++) {
      for (let j = i + 1; j < territories.length; j++) {
        // Check if territories are close enough to be neighbors
        const dist = this.distance(
          territories[i].center,
          territories[j].center
        );

        // Use a threshold based on average territory size
        const threshold = 150; // Adjust as needed

        if (dist < threshold) {
          territories[i].addNeighbor(territories[j].id);
          territories[j].addNeighbor(territories[i].id);
        }
      }
    }

    // Ensure every territory has at least one neighbor
    for (const territory of territories) {
      if (territory.neighbors.length === 0) {
        // Find closest territory
        let closestId = null;
        let closestDist = Infinity;

        for (const other of territories) {
          if (other.id !== territory.id) {
            const dist = this.distance(territory.center, other.center);
            if (dist < closestDist) {
              closestDist = dist;
              closestId = other.id;
            }
          }
        }

        if (closestId !== null) {
          territory.addNeighbor(closestId);
          territories[closestId].addNeighbor(territory.id);
        }
      }
    }
  }

  /**
   * Calculate Euclidean distance between two points
   */
  static distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapGenerator;
}
