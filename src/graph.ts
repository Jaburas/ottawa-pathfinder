export interface GraphNode { 
    id: number;
    lat: number;
    lon: number;
    
    }
export interface Edge {
    to: number;// neightbour niode id 
    weight : number;//distance between nodes
}
//list of nodes and its edges
export const graph: Map <number, Edge[]> = new Map();
// node and its cords
export const nodes: Map< number, GraphNode> = new Map();

//find distance between the two lat/lon points in m 
export function haversineDistance ( 
    lat1: number, lon1: number, 
    lat2: number, lon2: number
): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;



}
export function findNearestNode(lat: number, lon: number): GraphNode | null {
    let nearest: GraphNode | null = null;
    let minDist = Infinity;

    for (const node of nodes.values()) {
        const dist = haversineDistance(lat, lon, node.lat, node.lon);
        if (dist < minDist) {
            minDist = dist;
            nearest = node;
        }
    }

    return nearest;
}
export interface BFSResult {
    visitedOrder: number[];
    path: number[]; // empty if no path found
}

export function bfs(startId: number, targetId: number): BFSResult {
    const visitedOrder: number[] = [];
    const visited = new Set<number>();
    const cameFrom = new Map<number, number>(); // child -> parent

    const queue: number[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
        const current = queue.shift()!; // dequeue from front
        visitedOrder.push(current);

        if (current === targetId) {
            break; // found it, stop searching
        }

        const neighbors = graph.get(current) || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                cameFrom.set(edge.to, current);
                queue.push(edge.to);
            }
        }
    }

    // reconstruct path by walking backward from target to start
    const path: number[] = [];
    if (visited.has(targetId)) {
        let node: number | undefined = targetId;
        while (node !== undefined) {
            path.unshift(node);
            node = cameFrom.get(node);
        }
    }

    return { visitedOrder, path };
}
export interface DFSResult {
    visitedOrder: number[];
    path: number[]; // empty if no path found
}

export function dfs(startId: number, targetId: number): DFSResult {
    const visitedOrder: number[] = [];
    const visited = new Set<number>();
    const cameFrom = new Map<number, number>(); // child -> parent

    const stack: number[] = [startId];
    visited.add(startId);

    while (stack.length > 0) {
        const current = stack.pop()!; // pull from the END, not the front
        visitedOrder.push(current);

        if (current === targetId) {
            break;
        }

        const neighbors = graph.get(current) || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                cameFrom.set(edge.to, current);
                stack.push(edge.to);
            }
        }
    }

    const path: number[] = [];
    if (visited.has(targetId)) {
        let node: number | undefined = targetId;
        while (node !== undefined) {
            path.unshift(node);
            node = cameFrom.get(node);
        }
    }

    return { visitedOrder, path };
}
class MinHeap {
    private heap: { id: number; dist: number }[] = [];

    push(id: number, dist: number) {
        this.heap.push({ id, dist });
        this.bubbleUp(this.heap.length - 1);
    }

    pop(): { id: number; dist: number } | undefined {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return top;
    }

    get size() {
        return this.heap.length;
    }

    private bubbleUp(index: number) {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.heap[parent].dist <= this.heap[index].dist) break;
            [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
            index = parent;
        }
    }

    private bubbleDown(index: number) {
        const length = this.heap.length;
        while (true) {
            const left = index * 2 + 1;
            const right = index * 2 + 2;
            let smallest = index;

            if (left < length && this.heap[left].dist < this.heap[smallest].dist) {
                smallest = left;
            }
            if (right < length && this.heap[right].dist < this.heap[smallest].dist) {
                smallest = right;
            }
            if (smallest === index) break;

            [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
            index = smallest;
        }
    }
}
export interface DijkstraResult {
    visitedOrder: number[];
    path: number[];
}

export function dijkstra(startId: number, targetId: number): DijkstraResult {
    const visitedOrder: number[] = [];
    const visited = new Set<number>();
    const cameFrom = new Map<number, number>();
    const dist = new Map<number, number>();

    const pq = new MinHeap();
    dist.set(startId, 0);
    pq.push(startId, 0);

    while (pq.size > 0) {
        const { id: current, dist: currentDist } = pq.pop()!;

        if (visited.has(current)) continue; // stale entry, skip
        visited.add(current);
        visitedOrder.push(current);

        if (current === targetId) break;

        const neighbors = graph.get(current) || [];
        for (const edge of neighbors) {
            const newDist = currentDist + edge.weight;
            const knownDist = dist.get(edge.to);

            if (knownDist === undefined || newDist < knownDist) {
                dist.set(edge.to, newDist);
                cameFrom.set(edge.to, current);
                pq.push(edge.to, newDist);
            }
        }
    }

    const path: number[] = [];
    if (visited.has(targetId)) {
        let node: number | undefined = targetId;
        while (node !== undefined) {
            path.unshift(node);
            node = cameFrom.get(node);
        }
    }

    return { visitedOrder, path };
}
export function calculatePathDistance(path: number[]): number {
    let total = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const a = nodes.get(path[i]);
        const b = nodes.get(path[i + 1]);
        if (!a || !b) continue;

        total += haversineDistance(a.lat, a.lon, b.lat, b.lon);
    }

    return total; // meters
}