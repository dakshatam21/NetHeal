import sys
print("=== Python test runner starting ===", flush=True)

import time
import inspect
from fastapi.testclient import TestClient

print("Importing main and simulator...", flush=True)
from main import app, reset_network
from simulator.topology import create_topology
print("Importing test modules...", flush=True)


import tests.test_topology as t_topo
import tests.test_failures as t_fail
import tests.test_routing as t_route
import tests.test_ml as t_ml
import tests.test_api as t_api
import tests.test_experiments as t_exp


def run_all_tests():
    print("=" * 65, flush=True)
    print("NETHEAL AUTOMATED BACKEND TEST SUITE", flush=True)
    print("=" * 65, flush=True)

    modules = [
        ("Topology Creation & Attributes", t_topo),
        ("Failure & Restoration Mutations", t_fail),
        ("Routing Algorithms (BFS/Dijkstra/ML)", t_route),
        ("Machine Learning Quality Inference", t_ml),
        ("FastAPI REST Endpoints", t_api),
        ("Experiment Suite Runner", t_exp),
    ]

    total_passed = 0
    total_failed = 0
    failed_details = []

    # Initialize a shared TestClient
    client = TestClient(app)

    suite_start = time.time()

    for module_name, mod in modules:
        print(f"\n[Test Module] {module_name}", flush=True)
        print("-" * 50, flush=True)

        for attr_name in dir(mod):
            if attr_name.startswith("test_"):
                fn = getattr(mod, attr_name)
                if callable(fn):
                    sig = inspect.signature(fn)
                    t0 = time.time()
                    try:
                        # Inject fixtures as needed
                        if "fresh_network" in sig.parameters:
                            fn(create_topology())
                        elif "api_client" in sig.parameters:
                            reset_network()
                            fn(client)
                            reset_network()
                        else:
                            fn()
                        elapsed = (time.time() - t0) * 1000
                        print(f"  [PASS] {attr_name} ({elapsed:.1f}ms)", flush=True)
                        total_passed += 1
                    except Exception as exc:
                        elapsed = (time.time() - t0) * 1000
                        print(f"  [FAIL] {attr_name} ({elapsed:.1f}ms): {exc}", flush=True)
                        total_failed += 1
                        failed_details.append((attr_name, str(exc)))

    total_time = time.time() - suite_start

    print("\n" + "=" * 65, flush=True)
    print("TEST SUITE EXECUTION SUMMARY", flush=True)
    print("=" * 65, flush=True)
    print(f"Total Tests Executed: {total_passed + total_failed}", flush=True)
    print(f"Passed:              {total_passed}", flush=True)
    print(f"Failed:              {total_failed}", flush=True)
    print(f"Total Duration:      {total_time:.2f}s", flush=True)

    if total_failed > 0:
        print("\nFailures Detail:", flush=True)
        for name, err in failed_details:
            print(f"  - {name}: {err}", flush=True)
        return 1

    print("\nALL BACKEND UNIT & INTEGRATION TESTS PASSED CLEANLY!", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(run_all_tests())
