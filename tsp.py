from typing import Dict, List, Tuple, Any
import math

def greedy_tsp(graph: Dict[Any, Dict[Any, int]], start: Any, allow_disconnected: bool = True) -> Tuple[List[Any], int]:
    """
    Greedy TSP algorithm that supports disconnected graphs.
    
    Args:
        graph: Dictionary representing the graph with costs
        start: Starting node
        allow_disconnected: If True, allows infinite costs for disconnected nodes
    
    Returns:
        Tuple of (route, total_cost)
    """
    if not graph:
        return [], 0

    if start not in graph:
        raise KeyError(f"Start node {start!r} not in graph")

    nodes = set(graph.keys())
    route = [start]
    total_cost = 0
    current = start
    unvisited = nodes - {start}

    if not unvisited:
        return [start, start], 0             

    while unvisited:
        neighbors = graph[current]
        candidates = []
        
        # Collect all candidates, including those with infinite cost
        for v in unvisited:
            if v in neighbors:
                cost = neighbors[v]
                # Treat very large numbers as infinity for disconnected nodes
                if cost == float('inf') or cost >= 999999:
                    if allow_disconnected:
                        candidates.append((v, cost))
                else:
                    candidates.append((v, cost))
            elif allow_disconnected:
                # If no direct connection and we allow disconnected graphs,
                # add with infinite cost
                candidates.append((v, float('inf')))
        
        if not candidates:
            if allow_disconnected:
                # If no candidates but we allow disconnected, pick any unvisited with inf cost
                next_node = next(iter(unvisited))
                edge_cost = float('inf')
            else:
                raise ValueError(f"Graph is disconnected from node {current}; cannot complete tour")
        else:
            # Find minimum cost candidate
            next_node, edge_cost = min(candidates, key=lambda x: x[1])

        route.append(next_node)
        total_cost += edge_cost
        unvisited.remove(next_node)
        current = next_node

    # Return to start
    return_cost = float('inf')
    if start in graph[current]:
        return_cost = graph[current][start]
        # Treat very large numbers as infinity
        if return_cost >= 999999:
            return_cost = float('inf')
    elif allow_disconnected:
        return_cost = float('inf')
    else:
        raise ValueError(f"No edge from {current} back to start {start}; cannot close tour")
    
    total_cost += return_cost
    route.append(start)

    return route, total_cost


def backtracking_tsp(graph: Dict[Any, Dict[Any, int]], start: Any) -> Tuple[List[Any], int, List[Dict]]:
    """Solve TSP using backtracking algorithm to find optimal solution."""
    if not graph:
        return [], 0, []

    if start not in graph:
        raise KeyError(f"Start node {start!r} not in graph")

    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 1:
        return [start, start], 0, []
    
    # Convert to matrix for easier processing
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    idx_to_node = {i: node for i, node in enumerate(nodes)}
    start_idx = node_to_idx[start]
    
    # Create distance matrix
    INF = float('inf')
    dist = [[INF for _ in range(n)] for _ in range(n)]
    
    for i, from_node in enumerate(nodes):
        for j, to_node in enumerate(nodes):
            if to_node in graph[from_node]:
                dist[i][j] = graph[from_node][to_node]
    
    # Variables for backtracking
    best_cost = INF
    best_path = []
    visited = [False] * n
    current_path = [start_idx]
    visited[start_idx] = True
    steps = []
    
    def backtrack(current_pos: int, current_cost: int, path: List[int], depth: int) -> None:
        nonlocal best_cost, best_path, steps
        
        # Record step
        steps.append({
            'depth': depth,
            'current_node': idx_to_node[current_pos],
            'current_cost': current_cost,
            'path': [idx_to_node[i] for i in path],
            'visited': visited.copy(),
            'is_backtrack': False
        })
        
        # Pruning: if current cost already exceeds best cost, backtrack
        if current_cost >= best_cost:
            steps.append({
                'depth': depth,
                'current_node': idx_to_node[current_pos],
                'current_cost': current_cost,
                'path': [idx_to_node[i] for i in path],
                'visited': visited.copy(),
                'is_backtrack': True,
                'reason': f'Pruning: cost {current_cost} >= best {best_cost}'
            })
            return
        
        # If all nodes visited, try to return to start
        if len(path) == n:
            return_cost = dist[current_pos][start_idx]
            if return_cost != INF:
                total_cost = current_cost + return_cost
                if total_cost < best_cost:
                    best_cost = total_cost
                    best_path = path + [start_idx]
                    steps.append({
                        'depth': depth,
                        'current_node': idx_to_node[start_idx],
                        'current_cost': total_cost,
                        'path': [idx_to_node[i] for i in best_path],
                        'visited': visited.copy(),
                        'is_backtrack': False,
                        'is_solution': True,
                        'reason': f'New best solution found: {total_cost}'
                    })
            else:
                steps.append({
                    'depth': depth,
                    'current_node': idx_to_node[current_pos],
                    'current_cost': current_cost,
                    'path': [idx_to_node[i] for i in path],
                    'visited': visited.copy(),
                    'is_backtrack': True,
                    'reason': 'Cannot return to start'
                })
            return
        
        # Try visiting each unvisited node
        for next_idx in range(n):
            if not visited[next_idx] and dist[current_pos][next_idx] != INF:
                # Visit next node
                visited[next_idx] = True
                new_path = path + [next_idx]
                new_cost = current_cost + dist[current_pos][next_idx]
                
                backtrack(next_idx, new_cost, new_path, depth + 1)
                
                # Backtrack
                visited[next_idx] = False
        
        # If no valid moves, record backtrack
        if depth > 0:  # Don't record for initial call
            steps.append({
                'depth': depth,
                'current_node': idx_to_node[current_pos],
                'current_cost': current_cost,
                'path': [idx_to_node[i] for i in path],
                'visited': visited.copy(),
                'is_backtrack': True,
                'reason': 'No more valid moves, backtracking'
            })
    
    # Start backtracking
    backtrack(start_idx, 0, [start_idx], 0)
    
    if best_cost == INF:
        return [], 0, steps
    
    # Convert result back to node names
    result_path = [idx_to_node[i] for i in best_path]
    
    return result_path, best_cost, steps


def build_dynamic_graph() -> Dict[str, Dict[str, int]]:
    """Build graph dynamically with edge costs entered manually."""
    n = int(input("Masukkan jumlah node: "))
    nodes = []
    for i in range(n):
        name = input(f"Nama node {i+1}: ")
        nodes.append(name)

    graph: Dict[str, Dict[str, int]] = {node: {} for node in nodes}

    print("\nMasukkan cost antar node:")
    print("- Gunakan 0 untuk node ke dirinya sendiri")
    print("- Gunakan 'inf' atau angka sangat besar (999999) untuk node yang tidak terhubung")
    
    for i in range(n):
        for j in range(n):
            if i == j:
                graph[nodes[i]][nodes[j]] = 0
                print(f"Cost {nodes[i]} -> {nodes[j]}: 0 (diagonal)")
            else:
                cost_input = input(f"Cost {nodes[i]} -> {nodes[j]} (atau 'inf' untuk tidak terhubung): ")
                
                if cost_input.lower() in ['inf', 'infinity', '∞']:
                    cost = float('inf')
                elif cost_input.isdigit():
                    cost = int(cost_input)
                else:
                    try:
                        cost = float(cost_input)
                        if cost >= 999999:
                            cost = float('inf')
                    except ValueError:
                        print("Input tidak valid, menggunakan infinity")
                        cost = float('inf')
                
                graph[nodes[i]][nodes[j]] = cost

    return graph


def format_cost(cost: float) -> str:
    """Format cost for display, handling infinity values."""
    if cost == float('inf'):
        return "∞ (Infinite)"
    return str(cost)

def main() -> None:
    graph = build_dynamic_graph()
    start = input("Masukkan node awal: ")
    
    print(f"\n=== Menjalankan TSP dengan support untuk graph non-connected ===")
    route, cost = greedy_tsp(graph, start, allow_disconnected=True)
    
    print(f"\nGreedy TSP route starting at {start}: {' -> '.join(route)}")
    print(f"Total cost: {format_cost(cost)}")
    
    if cost == float('inf'):
        print("\n⚠️  PERINGATAN: Graph tidak sepenuhnya terhubung!")
        print("   Beberapa node memerlukan jalur tidak langsung dengan cost infinite.")
        print("   Dalam implementasi nyata, Anda mungkin perlu algoritma pathfinding tambahan.")


if __name__ == '__main__':
    main()
