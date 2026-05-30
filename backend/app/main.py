from importlib import import_module

import sentry_sdk
from fastapi import APIRouter, FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.config import settings
from app.constants import APP_PATH


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def automatically_import_routers() -> APIRouter:
    api_router = APIRouter()
    for router_file in APP_PATH.glob("*/router.py"):
        module_name = router_file.parent.name
        router = import_module(f"app.{module_name}.router").router

        if module_name == "private":
            if settings.ENVIRONMENT == "local":
                api_router.include_router(router)
        else:
            api_router.include_router(router)

    return api_router


def manually_import_routers() -> APIRouter:
    from app.auth.router import router as auth_router  # noqa: PLC0415
    from app.items.router import router as items_router  # noqa: PLC0415
    from app.private.router import router as private_router  # noqa: PLC0415
    from app.users.router import router as users_router  # noqa: PLC0415
    from app.utils.router import router as utils_router  # noqa: PLC0415

    api_router = APIRouter()
    api_router.include_router(auth_router)
    api_router.include_router(users_router)
    api_router.include_router(utils_router)
    api_router.include_router(items_router)

    if settings.ENVIRONMENT == "local":
        api_router.include_router(private_router)

    return api_router

# Change this to manually_import_routers() if you don't want to use the automatic router
# loader.
api_router = automatically_import_routers()

app.include_router(api_router, prefix=settings.API_V1_STR)
