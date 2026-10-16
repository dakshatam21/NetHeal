from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from simulator.topology import create_topology
from simulator.failures import (
    fail_router,
    restore_router,
    fail_link,
    restore_link,
    get_network_status,
)
from simulator.routing import find_route


app = FastAPI(
    title="NetHeal API",
    description="API for the AI-Powered Self-Healing Network Simulator",
    version="1.0.0",
)


# Allow requests from the React development server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create one in-memory network when the application starts.
network = create_topology()


class LinkRequest(BaseModel):
    router_a: str
    router_b: str


class RouteRequest(BaseModel):
    source: str = "R1"
    destination: str = "R7"
    method: str = "bfs"


@app.get("/")
def home():
    return {
        "message": "Welcome to NetHeal API",
        "status": "running",
    }


@app.get("/api/network/status")
def network_status():
    return get_network_status(network)


@app.get("/api/network/topology")
def network_topology():
    routers = [
        {
            "id": router,
            **attributes,
        }
        for router, attributes in network.nodes(data=True)
    ]

    links = [
        {
            "source": router_a,
            "target": router_b,
            **attributes,
        }
        for router_a, router_b, attributes in network.edges(data=True)
    ]

    return {
        "routers": routers,
        "links": links,
    }


@app.post("/api/network/fail/router/{router}")
def api_fail_router(router: str):
    message = fail_router(network, router)

    if router not in network:
        raise HTTPException(status_code=404, detail=message)

    return {
        "message": message,
        "network_status": get_network_status(network),
    }


@app.post("/api/network/restore/router/{router}")
def api_restore_router(router: str):
    message = restore_router(network, router)

    if router not in network:
        raise HTTPException(status_code=404, detail=message)

    return {
        "message": message,
        "network_status": get_network_status(network),
    }


@app.post("/api/network/fail/link")
def api_fail_link(request: LinkRequest):
    message = fail_link(network, request.router_a, request.router_b)

    if not network.has_edge(request.router_a, request.router_b):
        raise HTTPException(status_code=404, detail=message)

    return {
        "message": message,
        "network_status": get_network_status(network),
    }


@app.post("/api/network/restore/link")
def api_restore_link(request: LinkRequest):
    message = restore_link(network, request.router_a, request.router_b)

    if not network.has_edge(request.router_a, request.router_b):
        raise HTTPException(status_code=404, detail=message)

    return {
        "message": message,
        "network_status": get_network_status(network),
    }


@app.post("/api/routes/analyze")
def analyze_route(request: RouteRequest):
    try:
        return find_route(
            network,
            request.source,
            request.destination,
            request.method,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/network/reset")
def reset_network():
    global network

    network = create_topology()

    return {
        "message": "Network reset successfully.",
        "network_status": get_network_status(network),
    }