from simulator.topology import create_topology
from simulator.failures import fail_router, fail_link, restore_router
from simulator.routing import find_route


network = create_topology()

print("=" * 45)
print("NETHEAL ROUTING TEST")
print("=" * 45)


# Test 1: BFS routing
print("\nTEST 1: BFS ROUTING")

result = find_route(network, "R1", "R7", "bfs")
print(result)


# Test 2: Dijkstra routing
print("\nTEST 2: DIJKSTRA ROUTING")

result = find_route(network, "R1", "R7", "dijkstra")
print(result)


# Test 3: Fail a router
print("\nTEST 3: ROUTING AFTER ROUTER FAILURE")

print(fail_router(network, "R3"))

result = find_route(network, "R1", "R7", "bfs")
print(result)


# Test 4: Fail an important link
print("\nTEST 4: ROUTING AFTER LINK FAILURE")

print(fail_link(network, "R5", "R7"))

result = find_route(network, "R1", "R7", "bfs")
print(result)


# Test 5: Restore the router
print("\nTEST 5: ROUTING AFTER ROUTER RESTORATION")

print(restore_router(network, "R3"))

result = find_route(network, "R1", "R7", "dijkstra")
print(result)