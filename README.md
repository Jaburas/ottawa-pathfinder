# Ottawa Pathfinder

An interactive pathfinding visualizer built on **real Ottawa road data**. Click a start and target point on the map, pick an algorithm, and watch the search expand across actual streets and intersections before tracing the final route.

Unlike most pathfinding visualizers that run on an abstract grid, this one runs on a real city's road network — pulled live from OpenStreetMap and converted into a graph of intersections and streets.

## Features

- 🗺️ **Real map, real roads** — built on Ottawa's actual major road network (motorways, trunks, primary, secondary, tertiary roads), sourced from OpenStreetMap via the Overpass API
- 🟢🔴 **Click-to-select** start and target points, automatically snapped to the nearest real intersection
- 🔀 **Three algorithms** to compare side by side:
  - **BFS** (Breadth-First Search) — finds the path with the fewest intersections
  - **DFS** (Depth-First Search) — dives deep down one direction before backtracking (included for contrast — it's dramatically worse on dense city graphs)
  - **Dijkstra's Algorithm** — finds the true shortest path by real-world distance
- 🎬 **Animated search** — watch each algorithm's search expand node-by-node before the final route is revealed
- 📏 **Real distance comparison** — see the actual path length in km, not just node counts, so you can directly compare how "efficient" each algorithm's route really is

## Why this is interesting

Node count and real-world distance don't always agree. BFS optimizes for the fewest intersections, which can produce a route that's actually *longer* in real distance than Dijkstra's, since city blocks vary in length. Running the same start/target through BFS vs. Dijkstra makes this difference visible instantly.

DFS, meanwhile, has no sense of direction at all — on a densely connected road network it can visit tens of thousands of nodes and produce a wildly indirect path before stumbling onto the target, which is a great illustration of why naive traversal algorithms aren't suited for shortest-path problems.

## Tech Stack

- **React + TypeScript** — UI and app logic
- **Vite** — build tooling and dev server
- **Leaflet** — interactive map rendering
- **OpenStreetMap** — map tiles
- **Overpass API** — road network data source

## How It Works

1. **Data fetch**: On load, the app loads Ottawa's major road network (fetched once via the Overpass API and cached locally as a static JSON file for fast, reliable loading).
2. **Graph construction**: Raw OpenStreetMap data (nodes and ways) is parsed into a graph — intersections become nodes, road segments become weighted edges, with edge weight calculated as real-world distance (Haversine formula) between connected points.
3. **Click to select**: Clicking the map finds the nearest graph node to your click and drops a marker there — first click sets the start (green), second sets the target (red).
4. **Run the algorithm**: Selecting an algorithm and hitting Run traces the search from start to target, animating each visited node before drawing the final path.
5. **Compare**: Switch algorithms and re-run on the same two points to see how the search pattern, node count, and real distance differ.

## Running Locally

```bash
# clone the repo
git clone https://github.com/your-username/ottawa-pathfinder.git
cd ottawa-pathfinder

# install dependencies
npm install

# run the dev server
npm run dev
```

Then open the local URL shown in your terminal (usually `http://localhost:5173`).

## Project Structure

```
src/
  App.tsx       # UI, map setup, click handling, animation
  graph.ts       # graph types, distance calculations, BFS/DFS/Dijkstra
  overpass.ts    # loading and parsing OpenStreetMap road data
public/
  ottawa-roads.json   # cached Overpass API export for Ottawa's major roads
```

## Future Improvements

- A* search (Dijkstra + heuristic) for an even faster optimal search
- One-way street support (currently all roads are treated as two-way)
- Preset location buttons (e.g. "Parliament Hill", "Carleton University")
- Adjustable animation speed
- Support for additional cities

## License

MIT
