from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, places_visited, places_wishlist, photos, letters, search, map, recipes, cine, recommendations, push, trips, outfits, names, outfit_notifications, emotional, calendar, notifications
from app.services.outfit_notification_scheduler import start_scheduler as start_outfit_scheduler, stop_scheduler as stop_outfit_scheduler
from app.services.calendar_notification_scheduler import start_scheduler as start_calendar_scheduler, stop_scheduler as stop_calendar_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_outfit_scheduler()
    start_calendar_scheduler()
    yield
    stop_outfit_scheduler()
    stop_calendar_scheduler()


app = FastAPI(
    title="Nuestro Mapita API",
    description="Backend de la app de recuerdos compartidos.",
    version="1.0.0",
    redirect_slashes=False,  # Evita redirects 307 que rompen CORS en POST
    lifespan=lifespan,
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
app.include_router(recipes.router)
app.include_router(cine.router)
app.include_router(recommendations.router)
app.include_router(push.router)
app.include_router(search.router)
app.include_router(map.router)
app.include_router(trips.router)
app.include_router(outfits.router)
app.include_router(names.router)
app.include_router(outfit_notifications.router)
app.include_router(emotional.router)
app.include_router(calendar.router)
app.include_router(notifications.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint para verificar que el backend está funcionando."""
    return {"status": "ok", "app": "Nuestro Mapita"}
