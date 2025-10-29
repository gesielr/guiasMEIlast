from __future__ import annotations

import sys
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routes import inss, users, webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Espaço reservado para inicializações (ex.: verificar conexões)
    try:
        print("\n[OK] Aplicação iniciando...")
        yield
        print("\n[ERROR] Aplicação encerrando...")
    except Exception as e:
        print(f"\n[ERROR] Erro no lifespan: {e}")
        import traceback
        traceback.print_exc()
        raise


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

    # Add Starlette HTTP logger first
    import logging
    logging.basicConfig(level=logging.DEBUG)
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.DEBUG)
    
    print("[DEBUG] Logging configured")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware para logar todas as requisições
    print("[DEBUG] Adding middleware...")
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        print(f"\n[MIDDLEWARE] REQUEST {request.method} {request.url.path}")
        sys.stdout.flush()
        try:
            response = await call_next(request)
            print(f"[MIDDLEWARE] RESPONSE {response.status_code}")
            sys.stdout.flush()
            return response
        except Exception as e:
            print(f"[MIDDLEWARE] ERROR: {str(e)}")
            traceback.print_exc()
            sys.stdout.flush()
            raise

    app.include_router(inss.router)
    app.include_router(users.router)
    app.include_router(webhook.router)

    @app.get("/")
    async def root():
        return {"status": "ok", "message": "INSS Guias API em execução"}

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handler global para capturar todos os erros não tratados"""
        error_msg = str(exc)
        error_trace = traceback.format_exc()
        
        print(f"\n[ERROR] UNHANDLED ERROR:")
        print(f"   Path: {request.url.path}")
        print(f"   Method: {request.method}")
        print(f"   Error: {error_msg}")
        print(f"   Traceback:\n{error_trace}\n")
        
        return JSONResponse(
            status_code=500,
            content={
                "detail": error_msg,
                "type": "unhandled_exception",
                "path": request.url.path,
            }
        )

    return app


app = create_app()

