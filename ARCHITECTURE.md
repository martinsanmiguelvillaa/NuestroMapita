# NuestroMapita — Arquitectura

App de memoria compartida para dos personas. Registra lugares visitados, recetas, películas, cartitas y más. Stack: FastAPI + React 18 + MySQL en Docker.

## Estructura del proyecto

```
nuestro-mapita/
├── backend/          # FastAPI (Python 3.12)
│   └── app/
│       ├── main.py           # Entry point, registra routers y CORS
│       ├── config.py         # Pydantic settings (variables de entorno)
│       ├── database.py       # SQLAlchemy engine + session factory
│       ├── dependencies.py   # JWT auth middleware (HttpOnly cookie)
│       ├── models/           # ORM models (16 tablas)
│       ├── schemas/          # Pydantic schemas (request/response)
│       ├── routers/          # 17 módulos de endpoints
│       └── services/         # Integraciones externas (Cloudinary, OpenAI, TMDB, Push, Outfits, Schedulers)
├── frontend/         # React 18 + Vite
│   └── src/
│       ├── App.jsx           # Router + Providers (Auth, Toast, Confirm)
│       ├── api/              # 18 módulos cliente (fetch nativo)
│       ├── components/       # Componentes organizados por feature + layout + ui
│       ├── context/          # AuthContext, ToastContext, ConfirmContext
│       ├── hooks/            # Custom hooks
│       ├── pages/            # 14 páginas (rutas)
│       └── styles/           # CSS por feature + variables.css
└── docker-compose.yml        # MySQL + backend + frontend (Nginx)
```

## Comandos

### Docker (modo principal)
```bash
docker compose up --build          # Primera vez
docker compose up                  # Iniciar servicios
docker compose down                # Detener
docker compose logs backend -f     # Ver logs del backend
```

### Backend (desarrollo local)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head               # Aplicar migraciones
uvicorn app.main:app --reload --port 8000
```

### Frontend (desarrollo local)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build
```

### Migraciones de base de datos
```bash
cd backend
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic downgrade -1
```

### Tests del backend
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Arquitectura

### Backend
- **Patrón:** Router → Service → Database (dependency injection)
- **Auth:** JWT en HttpOnly cookie (`SameSite=none`, `Secure` en prod)
- **ORM:** SQLAlchemy 2.0 con cascade deletes
- **Validación:** Pydantic v2 en schemas y config

**Routers activos en `main.py`:**
| Módulo | Prefijo | Descripción |
|--------|---------|-------------|
| auth | /auth | Login/logout |
| places_visited | /places/visited | CRUD lugares visitados |
| places_wishlist | /places/wishlist | Lista de deseos con orden drag-drop |
| photos | /photos | Cloudinary upload/delete/crop |
| letters | /letters | Cartitas con fotos |
| recipes | /recipes | Recetas + comentarios |
| cine | /cine | Películas/series + TMDB + comentarios |
| recommendations | /recommendations | Sugerencias OpenAI |
| push | /push | Web Push (VAPID) |
| search | /search | Búsqueda global |
| map | /map | Pins del mapa |
| trips | /trips | Viajes pendientes con drag-drop |
| outfits | /outfits | Outfit del día con clima |
| names | /names | Nombres con puntuación entre los dos |
| outfit_notifications | /outfit_notifications | Notificaciones push de outfits |
| emotional | /emocionario | Registro diario de emociones |
| calendar | /calendario | Eventos del calendario compartido |

### Frontend
- **State global:** React Context (no Redux/Zustand)
  - `AuthContext` — `isAuthenticated`, `login()`, `logout()`
  - `ToastContext` — `toast(message, type, duration)`
  - `ConfirmContext` — `confirm(title, message, onConfirm)`
- **Routing:** React Router v6, todo protegido salvo `/login`
- **HTTP:** Fetch nativo con wrapper custom (`withCredentials` para cookies JWT)
- **Mapas:** React Leaflet + OpenStreetMap (Nominatim para geocoding)
- **Estilos:** CSS puro con custom properties en `styles/variables.css`, sin framework CSS

### Base de datos (MySQL 8)
| Tabla | Descripción |
|-------|-------------|
| places_visited | Lugares visitados con rating y coordenadas |
| places_wishlist | Lista de deseos (Por hacer) con order_index para drag-drop |
| place_trips | Viajes pendientes con order_index para drag-drop |
| photos | Imágenes/videos en Cloudinary (múltiples por lugar/receta/cartita) |
| letters | Cartitas con cuerpo de texto y foto opcional |
| recipes | Recetas con ingredientes, pasos, video e imagen |
| recipe_comments | Comentarios de recetas con rating |
| cine_items | Películas/series con integración TMDB |
| cine_comments | Comentarios de películas |
| recommendation_history | Historial de sugerencias OpenAI |
| blocked_recommendations | Títulos bloqueados para recomendaciones |
| emotional_entries | Emocionario diario por usuario |
| calendar_events | Eventos del calendario compartido con recurrencia |
| event_types | Tipos de evento personalizables con color |
| names | Nombres con puntuación 1–10 de cada uno |
| device_subscriptions | Suscripciones push unificadas por dispositivo |
| outfit_cache | Cache del outfit del día por usuario |
| outfit_notification_subscriptions | Suscripciones legacy de notificaciones de outfit |

## Variables de entorno

**Requeridas:**
```env
MYSQL_ROOT_PASSWORD=   # Contraseña del root de MySQL
DB_PASSWORD=           # Contraseña del usuario mapita en MySQL
APP_PASSWORD=          # Contraseña única de acceso a la app (mín. 8 chars)
SECRET_KEY=            # Clave secreta para JWT (mín. 32 chars)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Opcionales:**
```env
TMDB_API_KEY=          # Búsqueda de películas
OPENAI_API_KEY=        # Recomendaciones AI
VAPID_PUBLIC_KEY=      # Web Push
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_EMAIL=
```

## Patrones de código

### Agregar un nuevo router (backend)
1. Crear `backend/app/routers/nuevo.py` con `APIRouter`
2. Registrar en `main.py`: `app.include_router(nuevo.router, prefix="/nuevo", tags=["nuevo"])`
3. Agregar schema en `schemas/` y model en `models/` si hace falta
4. Crear migración con alembic si hay cambios en DB

### Agregar una nueva página (frontend)
1. Crear `frontend/src/pages/NuevaPagina.jsx`
2. Agregar ruta en `App.jsx` dentro de `<ProtectedRoute>`
3. Crear módulo API en `frontend/src/api/nuevo.js` usando el cliente de `api/client.js`
4. Agregar estilos en `frontend/src/styles/nueva-pagina.css`

### Usar el toast
```jsx
const { toast } = useToast();
toast("Guardado exitosamente", "success");
toast("Error al guardar", "error");
```

### Usar el confirm
```jsx
const { confirm } = useConfirm();
confirm("Eliminar lugar", "¿Estás segura?", () => handleDelete(id));
```

## Servicios externos

| Servicio | Uso | Archivo |
|----------|-----|---------|
| **Cloudinary** | Fotos y videos de lugares, recetas, cartitas | `services/cloudinary_service.py` |
| **TMDB API** | Búsqueda y metadata de películas/series | `services/tmdb_service.py` |
| **OpenAI API** | Recomendaciones de cine inteligentes | `services/openai_service.py` |
| **Web Push (VAPID)** | Notificaciones push en el browser | `services/push_service.py` |
| **OpenStreetMap/Nominatim** | Geocoding para el mapa (frontend) | Sin costo, sin key |

## PWA

El frontend tiene soporte PWA:
- `public/manifest.json` — Configuración de instalación
- `public/sw.js` — Service Worker
- `public/icons/` — Iconos de la app
- `/share-target` — Ruta para recibir contenido compartido desde el SO

## Consideraciones importantes

- **Dos usuarios únicos:** La app usa una sola contraseña compartida, no hay sistema de usuarios individuales. El JWT identifica una sesión autenticada, sin roles.
- **Cloudinary es requerido** para cualquier feature que involucre imágenes. Sin credenciales, las subidas fallan.
- **TMDB y OpenAI son opcionales** — el backend lo maneja gracefully si no están configurados.
- **Cascade deletes activos:** Borrar un `place_visited` elimina todas sus `photos` en cascada (DB + Cloudinary).
- **Estilos sin framework:** CSS propio con custom properties en `variables.css`. No usar Tailwind ni librerías CSS.
