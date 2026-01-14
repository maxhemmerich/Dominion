# Territory Conquest Game

A real-time multiplayer territory conquest strategy game built with HTML5 Canvas, Node.js, and Socket.io. Players compete to control territories on a procedurally generated map through strategic attacks and expansion.

## Features

### Core Gameplay
- **Turn-based Strategy**: Players take turns to attack adjacent territories and expand their empire
- **Procedural Map Generation**: Each game features a unique map with 60 territories generated using Voronoi-like algorithms
- **Real-time Multiplayer**: 2-8 players can compete simultaneously with real-time game state synchronization
- **AI Opponents**: Intelligent bots with configurable difficulty levels (easy/medium/hard)
- **Combat System**: Strategic combat resolution based on troop counts with randomness factor
- **Resource Management**: Territories generate troops over time, requiring strategic planning

### Technical Features
- **Responsive Canvas Rendering**: Smooth HTML5 Canvas graphics with territory highlighting and animations
- **Lobby System**: Players can create games, invite friends via lobby ID, and configure match settings
- **Turn Timer**: 45-second turn limit to keep games moving
- **Game State Synchronization**: Server-authoritative architecture prevents cheating
- **Spectator Mode**: Eliminated players can continue watching the game
- **Reconnection Handling**: Graceful handling of player disconnections

## Project Structure

```
territory-conquest-game/
├── server/
│   └── server.js           # Node.js backend with Socket.io
├── shared/
│   ├── Territory.js        # Territory class (used by both client/server)
│   ├── MapGenerator.js     # Procedural map generation algorithm
│   ├── GameState.js        # Core game logic and state management
│   └── AIBot.js            # AI opponent logic
├── public/
│   ├── index.html          # Main HTML page
│   ├── css/
│   │   └── style.css       # Game styling
│   └── js/
│       ├── game.js         # Main client-side game controller
│       ├── renderer.js     # Canvas rendering engine
│       ├── input.js        # Input handling (mouse/touch)
│       └── ui.js           # UI management
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Clone or download the repository**
   ```bash
   cd territory-conquest-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open the game**
   - Open your browser and navigate to `http://localhost:3000`
   - The game is now ready to play!

## How to Play

### Starting a Game

1. **Create a Lobby**
   - Enter your name
   - Click "Create Game"
   - Share the Lobby ID with friends

2. **Join a Game**
   - Enter your name
   - Enter the Lobby ID
   - Click "Join Game"

3. **Configure the Match**
   - Host can add AI bots using the "Add Bot" button
   - Players click "Ready" when prepared
   - Host clicks "Start Game" when all players are ready

### Gameplay

#### Your Turn
- Click on one of your territories to select it (territories you own are highlighted in your color)
- Click on an adjacent enemy or neutral territory to attack
- The attack is automatically resolved based on troop counts
- Click "End Turn" when you're done attacking

#### Combat Resolution
- **Attack Power** = (Attacker Troops - 1) × Random Factor (0.8-1.2)
- **Defense Power** = Defender Troops × Random Factor (0.8-1.2)
- If Attack Power > Defense Power: Attacker conquers the territory
- Otherwise: Both sides lose troops but defender retains the territory

#### Territory Management
- Each territory generates 1 troop per turn for its owner
- You must leave at least 1 troop in a territory to attack from it
- Expand strategically to control more territory and generate more troops

#### Winning Conditions
- Eliminate all opponents by conquering all their territories
- Last player standing wins
- Game ends when only one player remains or all territories are owned

### Strategy Tips

1. **Early Game**: Focus on capturing neutral territories for easy expansion
2. **Mid Game**: Identify weak opponents and target their territories
3. **Late Game**: Defend borders while pressing advantages
4. **Always** keep strong territories on your borders to prevent enemy breakthroughs
5. Watch the turn timer - plan your moves in advance!

## Game Architecture

### Map Generation Algorithm

The map generator uses a Voronoi-like approach:

1. **Point Generation**: Distributes seed points across the map using Poisson-disc sampling for even spacing
2. **Territory Creation**: Creates polygonal territories by assigning each grid cell to its nearest seed point
3. **Boundary Extraction**: Extracts territory boundaries using convex hull algorithm
4. **Neighbor Calculation**: Determines adjacent territories based on proximity of centers

See `shared/MapGenerator.js` for implementation details.

### AI Logic

The AI evaluates potential attacks using multiple factors:

- **Troop Advantage**: Prefers attacking weaker territories
- **Strategic Value**: Considers number of neighbors and connectivity
- **Territorial Expansion**: Prioritizes territories that connect to existing holdings
- **Defensive Considerations**: Avoids weakening border territories
- **Opponent Strength**: Targets weaker players preferentially

AI difficulty levels adjust aggressiveness and decision-making quality. See `shared/AIBot.js` for details.

### Networking

- **Server-Authoritative**: All game logic runs on the server to prevent cheating
- **Event-Based**: Socket.io events trigger game state updates
- **Optimistic UI**: Client-side rendering updates immediately for responsiveness
- **State Synchronization**: Full game state is periodically broadcast to all clients

Key events:
- `createLobby` / `joinLobby`: Lobby management
- `startGame`: Initialize game state
- `attack`: Process combat
- `endTurn`: Advance to next player
- `gameStateUpdate`: Broadcast updated state
- `gameEnded`: Handle victory conditions

## Configuration

### Game Settings (in `shared/GameState.js`)

```javascript
{
  turnTimeLimit: 45000,      // Turn duration in milliseconds
  mapWidth: 1200,            // Map width in pixels
  mapHeight: 800,            // Map height in pixels
  territoryCount: 60,        // Number of territories to generate
  troopGenerationRate: 1     // Troops generated per territory per turn
}
```

### Server Configuration

- **Port**: Set via `PORT` environment variable (default: 3000)
- **Max Players**: 8 per game (configurable in lobby)

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Touch controls supported

## Development

### Adding New Features

1. **Game Logic**: Modify `shared/GameState.js`
2. **AI Behavior**: Update `shared/AIBot.js`
3. **Rendering**: Edit `public/js/renderer.js`
4. **UI**: Modify `public/js/ui.js` and `public/css/style.css`
5. **Networking**: Update both `server/server.js` and `public/js/game.js`

### Testing

- Test locally with multiple browser tabs
- Add AI bots to test single-player scenarios
- Use browser dev tools to monitor Socket.io events

## Known Limitations

- No fog of war (all territories visible)
- No reconnection for disconnected players (player slot remains but is inactive)
- Single game mode (no variations)
- No persistent statistics or match history

## Future Enhancements

Potential features for future development:

- **Fog of War**: Only show territories adjacent to your own
- **Territory Types**: Mountains, water, forests with different properties
- **Power-ups**: Special abilities or bonuses
- **Multiple Game Modes**: Capture the flag, king of the hill, etc.
- **Persistent Stats**: Win/loss tracking, leaderboards
- **Reconnection Logic**: Allow players to rejoin after disconnection
- **Mini-map**: Overview for large maps
- **Sound Effects**: Audio feedback for attacks and victories
- **Animations**: Smooth territory transitions and combat effects
- **Mobile App**: Native mobile version

## Troubleshooting

### Server Won't Start
- Ensure Node.js is installed: `node --version`
- Check if port 3000 is already in use
- Verify dependencies are installed: `npm install`

### Can't Connect to Server
- Ensure server is running
- Check firewall settings
- Try `http://localhost:3000` explicitly

### Game Lag or Stuttering
- Close other applications
- Reduce number of players/territories
- Check network connection for multiplayer

### Territories Not Rendering
- Refresh the browser
- Check browser console for errors (F12)
- Ensure Canvas is supported in your browser

## Credits

Built with:
- [Node.js](https://nodejs.org/) - Backend runtime
- [Express](https://expressjs.com/) - Web server
- [Socket.io](https://socket.io/) - Real-time communication
- HTML5 Canvas - Graphics rendering

Inspired by [territorial.io](https://territorial.io/)

## License

MIT License - Feel free to use and modify for your own projects!

---

**Enjoy conquering territories!** 🎮🗺️
