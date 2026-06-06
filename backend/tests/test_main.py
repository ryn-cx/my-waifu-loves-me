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
    assert "GET /utils/health-check/" in paths


def test_manually_import_routers_returns_apirouter() -> None:
    router = manually_import_routers()
    assert isinstance(router, APIRouter)
    paths = _route_set(router)
    assert "GET /utils/health-check/" in paths


def test_loaders_produce_equivalent_routes() -> None:
    auto = _route_set(automatically_import_routers())
    manual = _route_set(manually_import_routers())
    assert auto == manual
