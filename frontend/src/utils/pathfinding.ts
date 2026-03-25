// A* Pathfinding Algorithm for Hospital Navigation

export interface Node {
  id: string;
  x: number;
  y: number;
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
}

export interface POI {
  id: string;
  name: string;
  node: string;
  icon?: string;
}

class PriorityQueue<T> {
  private items: Array<{ element: T; priority: number }> = [];

  enqueue(element: T, priority: number) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

function heuristic(node1: Node, node2: Node): number {
  // Euclidean distance
  return Math.sqrt(
    Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
  );
}

export function findPath(
  startNode: Node,
  endNode: Node,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  console.log("=== Pathfinding Start ===");
  console.log("Start Node:", startNode);
  console.log("End Node:", endNode);
  
  const nodeMap = new Map<string, Node>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  // Build adjacency list with bidirectional edges
  const adjacency = new Map<string, Array<{ node: string; weight: number }>>();
  
  // Initialize adjacency list for all nodes
  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });
  
  // Add edges (bidirectional)
  edges.forEach((edge) => {
    adjacency.get(edge.from)!.push({ node: edge.to, weight: edge.weight });
    adjacency.get(edge.to)!.push({ node: edge.from, weight: edge.weight });
  });

  console.log("Adjacency for start:", adjacency.get(startNode.id));
  console.log("Adjacency for end:", adjacency.get(endNode.id));

  // A* Algorithm with closed set
  const openSet = new PriorityQueue<string>();
  const closedSet = new Set<string>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  // Initialize all gScores to Infinity
  nodes.forEach((node) => {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
  });

  gScore.set(startNode.id, 0);
  fScore.set(startNode.id, heuristic(startNode, endNode));
  openSet.enqueue(startNode.id, fScore.get(startNode.id)!);

  let iterations = 0;
  const maxIterations = 1000; // Safety limit

  while (!openSet.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = openSet.dequeue()!;

    if (closedSet.has(current)) {
      continue; // Skip if already processed
    }

    console.log(`Iteration ${iterations}: Processing node ${current}`);

    if (current === endNode.id) {
      console.log("=== Path Found! ===");
      // Reconstruct path
      const path: Node[] = [];
      let temp: string | undefined = current;
      while (temp) {
        path.unshift(nodeMap.get(temp)!);
        temp = cameFrom.get(temp);
      }
      console.log("Final path:", path.map(n => n.id));
      return path;
    }

    closedSet.add(current);

    const neighbors = adjacency.get(current) || [];
    console.log(`  Neighbors of ${current}:`, neighbors.map(n => n.node));

    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.node)) {
        continue; // Skip already processed nodes
      }

      const tentativeGScore = gScore.get(current)! + neighbor.weight;

      if (tentativeGScore < gScore.get(neighbor.node)!) {
        cameFrom.set(neighbor.node, current);
        gScore.set(neighbor.node, tentativeGScore);
        const h = heuristic(nodeMap.get(neighbor.node)!, endNode);
        const newFScore = tentativeGScore + h;
        fScore.set(neighbor.node, newFScore);
        openSet.enqueue(neighbor.node, newFScore);
        console.log(`    Updated ${neighbor.node}: g=${tentativeGScore}, f=${newFScore}`);
      }
    }
  }

  console.log("=== No Path Found ===");
  console.log(`Iterations: ${iterations}, Closed set size: ${closedSet.size}`);
  return []; // No path found
}

export function findNearestNode(
  point: { x: number; y: number },
  nodes: Node[]
): Node {
  let nearest = nodes[0];
  let minDist = Infinity;

  for (const node of nodes) {
    const dist = Math.sqrt(
      Math.pow(node.x - point.x, 2) + Math.pow(node.y - point.y, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}
