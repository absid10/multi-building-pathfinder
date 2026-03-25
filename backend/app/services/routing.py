from collections import defaultdict
import heapq
from math import hypot

from ..models import Edge, Node


def _build_graph(edges: list[Edge], accessible_only: bool):
    graph = defaultdict(list)

    for edge in edges:
        if accessible_only and not edge.is_accessible:
            continue

        graph[edge.from_node_id].append((edge.to_node_id, edge.distance_m))
        if edge.bidirectional:
            graph[edge.to_node_id].append((edge.from_node_id, edge.distance_m))

    return graph


def _heuristic(a: Node, b: Node) -> float:
    return hypot(a.x - b.x, a.y - b.y)


def find_route(start: Node, end: Node, nodes: list[Node], edges: list[Edge]) -> dict:
    node_lookup = {node.id: node for node in nodes}
    graph = _build_graph(edges, accessible_only=False)

    g_score = {start.id: 0.0}
    came_from: dict[int, int] = {}
    open_set = [(0.0, start.id)]

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == end.id:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()

            distance = 0.0
            for idx in range(len(path) - 1):
                current_id = path[idx]
                next_id = path[idx + 1]
                for neighbor_id, weight in graph[current_id]:
                    if neighbor_id == next_id:
                        distance += weight
                        break

            return {
                "node_ids": [node_lookup[node_id].external_id for node_id in path],
                "distance_m": round(distance, 2),
            }

        current_node = node_lookup[current]
        for neighbor_id, edge_weight in graph[current]:
            tentative = g_score[current] + edge_weight
            if tentative < g_score.get(neighbor_id, float("inf")):
                came_from[neighbor_id] = current
                g_score[neighbor_id] = tentative
                priority = tentative + _heuristic(node_lookup[neighbor_id], end)
                heapq.heappush(open_set, (priority, neighbor_id))

    return {"node_ids": [], "distance_m": 0.0}
