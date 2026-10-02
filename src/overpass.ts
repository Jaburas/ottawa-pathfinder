import { graph, nodes, haversineDistance } from "./graph";
import type { GraphNode, Edge } from "./graph";
export async function fetchOttawaRoads() {
    const response = await fetch(`${import.meta.env.BASE_URL}ottawa-roads.json`);

    if (!response.ok) {
        throw new Error(`Failed to load local road data (${response.status})`);
    }

    const data = await response.json();
    return data;
}
export function buildGraphFromOverpass(data: any) {
    // pass 1: store all nodes
    for (const el of data.elements) {
        if (el.type === "node") {
            const node: GraphNode = { id: el.id, lat: el.lat, lon: el.lon };
            nodes.set(el.id, node);
        }
    }

    // pass 2: walk each way, connect consecutive nodes
    for (const el of data.elements) {
        if (el.type === "way") {
            const wayNodes: number[] = el.nodes;

            for (let i = 0; i < wayNodes.length - 1; i++) {
                const fromId = wayNodes[i];
                const toId = wayNodes[i + 1];

                const fromNode = nodes.get(fromId);
                const toNode = nodes.get(toId);

                if (!fromNode || !toNode) continue; // skip if missing data

                const dist = haversineDistance(
                    fromNode.lat, fromNode.lon,
                    toNode.lat, toNode.lon
                );

                addEdge(fromId, toId, dist);
                addEdge(toId, fromId, dist); // two-way for now
            }
        }
    }
}

function addEdge(from: number, to: number, weight: number) {
    if (!graph.has(from)) {
        graph.set(from, []);
    }
    graph.get(from)!.push({ to, weight });
}
