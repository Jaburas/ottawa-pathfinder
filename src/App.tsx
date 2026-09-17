import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { fetchOttawaRoads, buildGraphFromOverpass } from "./overpass";
import { graph, nodes, findNearestNode, bfs, dfs, dijkstra, calculatePathDistance } from "./graph";
type Algorithm = "bfs" | "dfs" | "dijkstra";

function App() {
  const hasFetched = useRef(false);

  // Leaflet objects that persist across renders but don't need React re-renders
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.CircleMarker | null>(null);
  const targetMarkerRef = useRef<L.CircleMarker | null>(null);
  const pathLineRef = useRef<L.Polyline | null>(null);
  const visitedMarkersRef = useRef<L.CircleMarker[]>([]);
  const animationTimerRef = useRef<number | null>(null);

  // React state - the UI needs to know about these to re-render
  const [algorithm, setAlgorithm] = useState<Algorithm>("bfs");
  const [startNodeId, setStartNodeId] = useState<number | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [resultInfo, setResultInfo] = useState<string>("");

  useEffect(() => {
    async function loadRoads() {
      try {
        const data = await fetchOttawaRoads();
        buildGraphFromOverpass(data);
        console.log("Nodes loaded:", nodes.size);
        console.log("Graph entries:", graph.size);
      } catch (err) {
        console.error("Failed to load roads:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!hasFetched.current) {
      hasFetched.current = true;
      loadRoads();
    }

    const map = L.map("map").setView([45.4215, -75.6972], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    let selectingStart = true;

    map.on("click", (event) => {
      const nearest = findNearestNode(event.latlng.lat, event.latlng.lng);
      if (!nearest) return;

      if (selectingStart) {
        if (startMarkerRef.current) {
          map.removeLayer(startMarkerRef.current);
        }

        startMarkerRef.current = L.circleMarker([nearest.lat, nearest.lon], {
          radius: 8,
          color: "green",
          fillColor: "green",
          fillOpacity: 1,
        }).addTo(map);

        setStartNodeId(nearest.id);
        selectingStart = false;
      } else {
        if (targetMarkerRef.current) {
          map.removeLayer(targetMarkerRef.current);
        }

        targetMarkerRef.current = L.circleMarker([nearest.lat, nearest.lon], {
          radius: 8,
          color: "red",
          fillColor: "red",
          fillOpacity: 1,
        }).addTo(map);

        setTargetNodeId(nearest.id);
        selectingStart = true;
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  function handleRun() {
    if (startNodeId === null || targetNodeId === null) return;

    const map = mapRef.current;
    if (!map) return;

    // stop any animation already in progress
    if (animationTimerRef.current !== null) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    // clear previous visited dots and path
    visitedMarkersRef.current.forEach((m) => map.removeLayer(m));
    visitedMarkersRef.current = [];

    if (pathLineRef.current) {
      map.removeLayer(pathLineRef.current);
      pathLineRef.current = null;
    }

    let result;
    if (algorithm === "bfs") {
      result = bfs(startNodeId, targetNodeId);
    } else if (algorithm === "dfs") {
      result = dfs(startNodeId, targetNodeId);
    } else {
      result = dijkstra(startNodeId, targetNodeId);
    }

    setIsAnimating(true);
    setResultInfo("");

    const visitedOrder = result.visitedOrder;
    let i = 0;

    // draw a few nodes per tick so it doesn't take forever on large searches
    const nodesPerTick = 25;

    animationTimerRef.current = window.setInterval(() => {
      for (let step = 0; step < nodesPerTick && i < visitedOrder.length; step++, i++) {
        const node = nodes.get(visitedOrder[i]);
        if (!node) continue;

        const dot = L.circleMarker([node.lat, node.lon], {
          radius: 3,
          color: "#66b3ff",
          fillColor: "#66b3ff",
          fillOpacity: 0.8,
          weight: 0,
        }).addTo(map);

        visitedMarkersRef.current.push(dot);
      }

      if (i >= visitedOrder.length) {
        clearInterval(animationTimerRef.current!);
        animationTimerRef.current = null;
        setIsAnimating(false);

        // build the path's actual coordinates
        const pathCoords: [number, number][] = result.path
          .map((id) => nodes.get(id))
          .filter((n): n is NonNullable<typeof n> => n !== undefined)
          .map((n) => [n.lat, n.lon]);

        // create an empty line first, then reveal it point by point
        pathLineRef.current = L.polyline([], {
          color: "blue",
          weight: 4,
        }).addTo(map);

        let pathIndex = 0;
        const drawnCoords: [number, number][] = [];

        const pathTimer = window.setInterval(() => {
          if (pathIndex >= pathCoords.length) {
            clearInterval(pathTimer);

            const distanceMeters = calculatePathDistance(result.path);
            const distanceKm = (distanceMeters / 1000).toFixed(2);

            setResultInfo(
              `Visited ${result.visitedOrder.length} nodes — path has ${result.path.length} nodes — ${distanceKm} km`
            );
            return;
          }

          drawnCoords.push(pathCoords[pathIndex]);
          pathLineRef.current!.setLatLngs(drawnCoords);
          pathIndex++;
        }, 30);
      }
    }, 16); // ~60fps tick rate for the visited-node animation
  }

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div id="map" style={{ height: "100%", width: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "white",
          padding: "12px 16px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          fontFamily: "sans-serif",
          minWidth: 220,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>PATHFINDER</div>

        {isLoading && <div>Loading Ottawa road data...</div>}

        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", marginBottom: 4 }}>
            Algorithm:
          </label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
            style={{ width: "100%" }}
          >
            <option value="bfs">BFS</option>
            <option value="dfs">DFS</option>
            <option value="dijkstra">Dijkstra</option>
          </select>
        </div>

        <div style={{ fontSize: 14, marginBottom: 8 }}>
          <div>🟢 Start: {startNodeId !== null ? "set" : "click map"}</div>
          <div>🔴 Target: {targetNodeId !== null ? "set" : "click map"}</div>
        </div>

        <button
          onClick={handleRun}
          disabled={
            startNodeId === null || targetNodeId === null || isLoading || isAnimating
          }
          style={{ width: "100%", padding: "8px 0" }}
        >
          {isAnimating ? "Running..." : "RUN"}
        </button>

        {resultInfo && (
          <div style={{ fontSize: 13, marginTop: 8, color: "#333" }}>
            {resultInfo}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;