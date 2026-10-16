from simulator.topology import create_topology
from simulator.failures import (
    fail_router,
    restore_router,
    fail_link,
    restore_link,
    get_network_status,
)


# Create the network
network = create_topology()

print("INITIAL NETWORK STATUS")
print(get_network_status(network))


# Test router failure
print("\n--- Router Failure Test ---")
print(fail_router(network, "R3"))
print(get_network_status(network))


# Test router restoration
print("\n--- Router Restoration Test ---")
print(restore_router(network, "R3"))
print(get_network_status(network))


# Test link failure
print("\n--- Link Failure Test ---")
print(fail_link(network, "R1", "R2"))
print(get_network_status(network))


# Test link restoration
print("\n--- Link Restoration Test ---")
print(restore_link(network, "R1", "R2"))
print(get_network_status(network))