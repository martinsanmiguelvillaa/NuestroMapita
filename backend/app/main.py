from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, places_visited, places_wishlist, photos, letters, search, map

app = FastAPI(
    title="Nuestro Mapita API",
    description="Backend de la app de recuerdos compartidos.",
    version="1.0.0",
)

# --- CORS ---
# Permite que el frontend (React) se comunique con este backend.
# En producción, reemplazar con el dominio real de Vercel.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(places_visited.router)
app.include_router(places_wishlist.router)
app.include_router(photos.router)
app.include_router(letters.router)
app.include_router(search.router)
app.include_router(map.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint para verificar que el backend está funcionando."""
    return {"status": "ok", "app": "Nuestro Mapita"}
