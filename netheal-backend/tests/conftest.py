import pytest
from fastapi.testclient import TestClient

from main import app, reset_network
from simulator.topology import create_topology


@pytest.fixture
def fresh_network():
    """Returns a newly initialized 7-router, 11-link NetworkX topology."""
    return create_topology()


@pytest.fixture(scope="session")
def session_client():
    """Session-scoped TestClient to avoid repeated lifespan startup/shutdown overhead."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def api_client(session_client):
    """Function-scoped fixture resetting the network state before each test."""
    reset_network()
    yield session_client
    reset_network()
