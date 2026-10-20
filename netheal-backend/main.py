import threading
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulator.topology import create_topology
from simulator.failures import (
    fail_router,
    restore_router,
    fail_link,
    restore_link,
    get_network_status,
)
from simulator.routing import find_route, compare_routes
from services.ml_service import load_model
from services.experiment_service import get_experiment_results, run_all_experiments


# Thread-safe lock for in-memory graph mutations
network_lock = threading.Lock()

# Global in-memory network topology
network = create_topology()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload the ML model in memory at startup so all subsequent requests are instantaneous
    try:
        load_model()
    except Exception as e:
        print(f"[Warning] ML model pre-loading encountered: {e}")

    # Ensure baseline experiment suite results exist
    try:
        get_experiment_results()
    except Exception as e:
        print(f"[Warning] Experiment suite pre-computation encountered: {e}")

    yield


app = FastAPI(
    title="NetHeal API",
    description="API for the AI-Powered Self-Healing Network Simulator",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration supporting standard Vite and local dev environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LinkRequest(BaseModel):
    router_a: str = Field(..., description="First endpoint router identifier (e.g., 'R1')")
    router_b: str = Field(..., description="Second endpoint router identifier (e.g., 'R2')")


class RouteRequest(BaseModel):
    source: str = Field(default="R1", description="Source router identifier")
    destination: str = Field(default="R7", description="Destination router identifier")
    method: str = Field(default="bfs", description="Routing algorithm: 'bfs', 'dijkstra', or 'ml'")


class RouteCompareRequest(BaseModel):
    source: str = Field(default="R1", description="Source router identifier")
    destination: str = Field(default="R7", description="Destination router identifier")


@app.get("/")
def home():
    return {
        "message": "Welcome to NetHeal API",
        "status": "running",
        "docs_url": "/docs",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health_check():
    ml_ready = False
    ml_error = None
    try:
        load_model()
        ml_ready = True
    except Exception as e:
        ml_error = str(e)

    network_ready = network is not None
    status = "healthy" if (network_ready and ml_ready) else ("degraded" if network_ready else "unhealthy")

    return {
        "status": status,
        "network_initialized": network_ready,
        "ml_model_loaded": ml_ready,
        "ml_error": ml_error,
        "routers_count": network.number_of_nodes() if network else 0,
        "links_count": network.number_of_edges() if network else 0,
    }


@app.get("/api/network/status")
def network_status():
    with network_lock:
        return get_network_status(network)


@app.get("/api/network/topology")
def network_topology():
    with network_lock:
        routers = [
            {
                "id": router,
                **attributes,
            }
            for router, attributes in network.nodes(data=True)
        ]

        links = [
            {
                "id": f"{router_a}-{router_b}",
                "source": router_a,
                "target": router_b,
                **attributes,
            }
            for router_a, router_b, attributes in network.edges(data=True)
        ]

        return {
            "routers": routers,
            "links": links,
            "status": get_network_status(network),
        }


@app.post("/api/network/fail/router/{router}")
def api_fail_router(router: str):
    with network_lock:
        if router not in network:
            raise HTTPException(status_code=404, detail=f"Router '{router}' does not exist.")

        message = fail_router(network, router)
        return {
            "success": True,
            "message": message,
            "network_status": get_network_status(network),
        }


@app.post("/api/network/restore/router/{router}")
def api_restore_router(router: str):
    with network_lock:
        if router not in network:
            raise HTTPException(status_code=404, detail=f"Router '{router}' does not exist.")

        message = restore_router(network, router)
        return {
            "success": True,
            "message": message,
            "network_status": get_network_status(network),
        }


@app.post("/api/network/fail/link")
def api_fail_link(request: LinkRequest):
    with network_lock:
        if not network.has_edge(request.router_a, request.router_b):
            raise HTTPException(
                status_code=404,
                detail=f"Link '{request.router_a}-{request.router_b}' does not exist.",
            )

        message = fail_link(network, request.router_a, request.router_b)
        return {
            "success": True,
            "message": message,
            "network_status": get_network_status(network),
        }


@app.post("/api/network/restore/link")
def api_restore_link(request: LinkRequest):
    with network_lock:
        if not network.has_edge(request.router_a, request.router_b):
            raise HTTPException(
                status_code=404,
                detail=f"Link '{request.router_a}-{request.router_b}' does not exist.",
            )

        message = restore_link(network, request.router_a, request.router_b)
        return {
            "success": True,
            "message": message,
            "network_status": get_network_status(network),
        }


@app.post("/api/routes/analyze")
def analyze_route(request: RouteRequest):
    with network_lock:
        if request.source not in network:
            raise HTTPException(status_code=404, detail=f"Source router '{request.source}' does not exist.")
        if request.destination not in network:
            raise HTTPException(status_code=404, detail=f"Destination router '{request.destination}' does not exist.")
        if request.method.lower() not in {"bfs", "dijkstra", "ml"}:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported routing method '{request.method}'. Choose 'bfs', 'dijkstra', or 'ml'.",
            )

        try:
            return find_route(
                network,
                request.source,
                request.destination,
                request.method,
            )
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Internal routing calculation error: {str(error)}")


@app.post("/api/routes/compare")
def compare_all_routes(request: RouteCompareRequest):
    with network_lock:
        if request.source not in network:
            raise HTTPException(status_code=404, detail=f"Source router '{request.source}' does not exist.")
        if request.destination not in network:
            raise HTTPException(status_code=404, detail=f"Destination router '{request.destination}' does not exist.")

        try:
            return compare_routes(
                network,
                request.source,
                request.destination,
            )
        except Exception as error:
            raise HTTPException(status_code=500, detail=f"Routing comparison error: {str(error)}")


@app.post("/api/network/reset")
def reset_network():
    global network
    with network_lock:
        network = create_topology()
        return {
            "success": True,
            "message": "Network topology reset to initial default state successfully.",
            "network_status": get_network_status(network),
        }


@app.get("/api/experiments/results")
def get_experiments():
    try:
        return get_experiment_results()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to load experiment results: {str(error)}")


@app.post("/api/experiments/run")
def run_experiments():
    try:
        return run_all_experiments()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to execute experiment suite: {str(error)}")