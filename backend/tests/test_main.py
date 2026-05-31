from unittest.mock import patch

from fastapi import APIRouter, FastAPI

from app.main import automatically_import_routers, manually_import_routers


def _route_set(router: APIRouter) -> set[str]:
    app = FastAPI()
    app.include_router(router)
    return {
        f"{method} {route.path}"
        for route in app.routes
        for method in getattr(route, "methods", ())
    }


def test_automatically_import_routers_returns_apirouter() -> None:
    router = automatically_import_routers()
    assert isinstance(router, APIRouter)
    paths = _route_set(router)
    assert "POST /login/access-token" in paths
    assert "GET /items/" in paths


def test_manually_import_routers_returns_apirouter() -> None:
    router = manually_import_routers()
    assert isinstance(router, APIRouter)
    paths = _route_set(router)
    assert "POST /login/access-token" in paths
    assert "GET /items/" in paths


def test_loaders_produce_equivalent_routes_in_local() -> None:
    with patch("app.main.settings.ENVIRONMENT", "local"):
        auto = _route_set(automatically_import_routers())
        manual = _route_set(manually_import_routers())
    assert auto == manual


def test_loaders_produce_equivalent_routes_in_production() -> None:
    with patch("app.main.settings.ENVIRONMENT", "production"):
        auto = _route_set(automatically_import_routers())
        manual = _route_set(manually_import_routers())
    assert auto == manual


def test_private_in_local() -> None:
    with patch("app.main.settings.ENVIRONMENT", "local"):
        auto = _route_set(automatically_import_routers())
    assert any("/private" in r for r in auto)


def test_private_not_in_production() -> None:
    with patch("app.main.settings.ENVIRONMENT", "production"):
        auto = _route_set(automatically_import_routers())
    assert not any("/private" in r for r in auto)
