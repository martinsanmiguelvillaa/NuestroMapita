# Nuestro Mapita

Una app privada y romántica para dos. Guarda los lugares que visitaron, los que quieren visitar, fotos, cartitas, recetas, películas y un mapa interactivo con todos sus recuerdos compartidos.

---

## Funcionalidades

| Sección | Qué podés hacer |
|---------|----------------|
| **Ya hicimos** | Registrar lugares visitados con fecha, comentario, rating, fotos y coordenadas |
| **Por hacer** | Lista de planes pendientes con drag-and-drop para ordenar, reel/TikTok adjunto y sorteo aleatorio |
| **Mapa** | Ver todos los lugares con pines, filtrar por tipo, buscar y convertir pendientes en visitados |
| **Cartitas** | Escribir y guardar mensajes románticos con foto y fecha |
| **Recetas** | Guardar recetas propias con ingredientes, pasos, video y comentarios con rating |
| **Cine** | Lista de películas y series (vistas / por ver / favoritas) con búsqueda automática vía TMDB |
| **Recomendaciones** | Sistema de recomendación inteligente con OpenAI basado en sus gustos |
| **Rating** | Sistema de alas de hada (1–5) compartido entre lugares, recetas y cine |
| **Fotos** | Subida y gestión de fotos y videos por lugar, con foto de portada configurable |
| **PWA** | Instalable como app en iOS y Android, con soporte para compartir desde otras apps |
| **Notificaciones** | Push notifications cuando se agrega una cartita nueva |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | CSS propio (sin frameworks) |
| Backend | Python 3.12 + FastAPI |
| ORM | SQLAlchemy 2.0 |
| Base de datos | MySQL 8 |
| Migraciones | Alembic |
| Fotos / Videos | Cloudinary |
| Mapa | React Leaflet + OpenStreetMap |
| Geocodificación | Nominatim (gratuito, sin API key) |
| Películas | TMDB API (gratuito, opcional) |
| Recomendaciones | OpenAI API (opcional) |
| Notificaciones | Web Push API + VAPID |
| Auth | JWT en HttpOnly cookie (SameSite=none, Secure) |
| Contenedores | Docker Compose |

---

## Estructura de carpetas

```
nuestro-mapita/
├── backend/
│   ├── app/
│   │   ├── main.py              # Entrada de FastAPI
│   │   ├── config.py            # Variables de entorno (Pydantic Settings)
│   │   ├── database.py          # Conexión a MySQL
│   │   ├── dependencies.py      # Validación de sesión (cookie JWT)
│   │   ├── models/              # Tablas SQLAlchemy
│   │   ├── schemas/             # Schemas Pydantic (validación y respuesta)
│   │   ├── routers/             # Endpoints organizados por recurso
│   │   └── services/            # Cloudinary, OpenAI, TMDB, Web Push
│   ├── alembic/                 # Migraciones de base de datos
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── entrypoint.sh            # Aplica migraciones y levanta el servidor
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   ├── icons/               # Iconos de la app y rating
│   │   ├── manifest.json        # Configuración PWA
│   │   └── sw.js                # Service Worker
│   ├── src/
│   │   ├── api/                 # Funciones para llamar al backend
│   │   ├── components/          # Componentes por sección y UI compartida
│   │   │   ├── cine/
│   │   │   ├── letters/
│   │   │   ├── map/
│   │   │   ├── photos/
│   │   │   ├── places/
│   │   │   ├── recipes/
│   │   │   └── ui/              # Modal, Toast, ConfirmDialog, SearchBar
│   │   ├── context/             # AuthContext, ToastContext, ConfirmContext
│   │   ├── hooks/               # useDirtyForm, usePushNotifications, useClipboardImport
│   │   ├── pages/               # Una page por sección
│   │   ├── styles/              # CSS por sección + variables globales
│   │   └── utils/               # cloudinary.js (transformaciones de URL)
│   ├── nginx.conf               # Proxy al backend en Docker
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
└── .env.example
```

---

## Cómo levantar con Docker Compose

### 1. Clonar y configurar

```bash
cd nuestro-mapita
cp .env.example .env
```

Editar `.env`:

```env
# Obligatorios
APP_PASSWORD=la_contraseña_que_van_a_usar   # mínimo 8 caracteres
SECRET_KEY=clave_larga_y_aleatoria           # mínimo 32 caracteres
# Generar con: python -c "import secrets; print(secrets.token_hex(32))"

# Cloudinary (fotos y videos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Opcionales — la app funciona sin estas, con funcionalidad reducida
TMDB_API_KEY=           # búsqueda automática de películas/series
OPENAI_API_KEY=         # recomendaciones inteligentes de cine
VAPID_PUBLIC_KEY=       # notificaciones push
VAPID_PRIVATE_KEY=
VAPID_CLAIMS_EMAIL=
```

> `APP_PASSWORD` y `SECRET_KEY` no pueden quedar vacíos ni con valores de ejemplo. El backend rechaza el inicio si detecta una configuración insegura.

### 2. Levantar

```bash
docker compose up --build
```

La primera vez descarga imágenes y construye el frontend — tarda unos minutos.

### 3. Acceder

| Servicio | URL |
|---------|-----|
| **App** | http://localhost |
| **API** | http://localhost:8000 |
| **Swagger docs** | http://localhost:8000/docs |
| **MySQL** | localhost:3306 |

### 4. Detener

```bash
docker compose down          # detener sin borrar datos
docker compose down -v       # detener y borrar base de datos
```

---

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env          # editar con tu MySQL local y Cloudinary

alembic upgrade head          # aplicar migraciones
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

El proxy de Vite ya apunta a `localhost:8000` automáticamente.

### Tests del backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

---

## Variables de entorno

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `APP_PASSWORD` | Contraseña de acceso a la app (mín. 8 caracteres) |
| `SECRET_KEY` | Clave para firmar los JWT (mín. 32 caracteres) |

### Base de datos (con Docker usan los defaults)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DB_HOST` | `db` | Host de MySQL |
| `DB_PORT` | `3306` | Puerto |
| `DB_USER` | `mapita` | Usuario |
| `DB_PASSWORD` | — | Contraseña |
| `DB_NAME` | `nuestro_mapita` | Nombre de la base |

### Cloudinary (fotos y videos)

| Variable | Descripción |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name del dashboard |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |

Crear cuenta gratuita en [cloudinary.com](https://cloudinary.com). El free tier incluye 25 GB de storage y 25 GB de bandwidth/mes.

### Opcionales

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `TMDB_API_KEY` | Búsqueda automática de películas y series con poster, sinopsis y tráiler | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — gratuito |
| `OPENAI_API_KEY` | Recomendaciones inteligentes de cine según los gustos guardados | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) — de pago |
| `VAPID_PUBLIC_KEY` | Notificaciones push (ver sección más abajo) | generadas localmente |
| `VAPID_PRIVATE_KEY` | — | — |
| `VAPID_CLAIMS_EMAIL` | Email de contacto para VAPID | cualquier email |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS | `http://localhost:5173` en dev, dominio de Vercel en prod |
| `COOKIE_SECURE` | `True` en producción HTTPS, `False` en dev HTTP | — |

---

## Notificaciones push (opcional)

Las notificaciones se envían cuando se crea una cartita nueva. Requieren HTTPS en producción.

### 1. Generar claves VAPID

```bash
pip install py-vapid
vapid --gen
```

Genera dos archivos: `private_key.pem` y `public_key.pem`.

```bash
# Extraer la clave pública en formato base64url
vapid --applicationServerKey
```

### 2. Configurar en el `.env`

```env
VAPID_PUBLIC_KEY=BD...  (clave pública en base64url)
VAPID_PRIVATE_KEY=...   (contenido de private_key.pem, sin saltos de línea)
VAPID_CLAIMS_EMAIL=tu@email.com
```

### 3. Activar en la app

En la app, ir a **Config → Activar notificaciones**. Cada dispositivo se suscribe de forma independiente.

---

## PWA y Share Target

La app es instalable como PWA en iOS y Android.

**iOS**: Safari → compartir → "Agregar a pantalla de inicio"
**Android**: Chrome → menú → "Instalar app"

Una vez instalada, podés compartir cualquier URL (Google Maps, Instagram, YouTube, TikTok) directamente desde otra app hacia Nuestro Mapita. La app detecta el tipo de URL y ofrece guardarlo como:
- lugar por visitar
- lugar visitado
- película/serie
- receta

---

## API — Endpoints principales

Todos los endpoints (excepto `/auth/login` y `/health`) requieren sesión activa vía cookie HttpOnly.

### Autenticación
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| POST | `/auth/login` | Iniciar sesión con `APP_PASSWORD` |
| POST | `/auth/logout` | Cerrar sesión |

### Lugares visitados
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/places/visited` | Listar (`sort`, `search`, `revisit`) |
| POST | `/places/visited` | Crear |
| PUT | `/places/visited/{id}` | Editar |
| DELETE | `/places/visited/{id}` | Eliminar (borra fotos de Cloudinary) |
| POST | `/places/visited/{id}/photos` | Subir fotos/videos |
| POST | `/places/visited/{id}/convert-back` | Devolver a la lista de pendientes |

### Lugares por visitar
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/places/wishlist` | Listar (`search`) |
| POST | `/places/wishlist` | Agregar |
| PUT | `/places/wishlist/{id}` | Editar |
| DELETE | `/places/wishlist/{id}` | Eliminar |
| POST | `/places/wishlist/reorder` | Reordenar en bulk (drag-and-drop) |
| POST | `/places/wishlist/{id}/convert` | Pasar a visitado |
| GET | `/places/wishlist/random` | Elegir uno al azar |
| POST | `/places/wishlist/{id}/photos` | Subir fotos |

### Fotos
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| DELETE | `/photos/{id}` | Eliminar foto (de Cloudinary y DB) |
| PATCH | `/photos/{id}/cover` | Marcar como portada |
| PATCH | `/photos/{id}/position` | Actualizar posición (x, y) de recorte |

### Cartitas
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/letters` | Listar |
| POST | `/letters` | Crear (dispara push notification) |
| PUT | `/letters/{id}` | Editar |
| DELETE | `/letters/{id}` | Eliminar |
| POST | `/letters/{id}/photo` | Subir/reemplazar foto |
| DELETE | `/letters/{id}/photo` | Eliminar foto |

### Recetas
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/recipes` | Listar (`category`, `search`) |
| POST | `/recipes` | Crear |
| GET | `/recipes/{id}` | Ver una receta con comentarios |
| PUT | `/recipes/{id}` | Editar |
| DELETE | `/recipes/{id}` | Eliminar |
| POST | `/recipes/{id}/photo` | Subir/reemplazar foto |
| POST | `/recipes/{id}/comments` | Agregar comentario con rating opcional |
| DELETE | `/recipes/{id}/comments/{comment_id}` | Eliminar comentario |

### Cine
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/cine` | Listar (`type`, `status`, `is_favorite`, `search`) |
| POST | `/cine` | Agregar película/serie |
| GET | `/cine/{id}` | Ver detalle con comentarios |
| PUT | `/cine/{id}` | Editar |
| DELETE | `/cine/{id}` | Eliminar |
| GET | `/cine/tmdb/search?q=texto` | Buscar en TMDB (requiere `TMDB_API_KEY`) |
| GET | `/cine/tmdb/detail?type=movie&tmdb_id=123` | Detalle completo de TMDB |
| POST | `/cine/{id}/comments` | Agregar comentario |
| DELETE | `/cine/{id}/comments/{comment_id}` | Eliminar comentario |

### Recomendaciones de cine
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| POST | `/recommendations/generate` | Generar recomendación con OpenAI |
| GET | `/recommendations/history` | Historial de recomendaciones |
| GET | `/recommendations/blocked` | Títulos bloqueados |
| POST | `/recommendations/blocked` | Bloquear un título |
| DELETE | `/recommendations/blocked/{id}` | Desbloquear |

### Mapa, Búsqueda y otros
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/map/pins` | Todos los pines con coordenadas |
| GET | `/search?q=texto` | Búsqueda global |
| GET | `/push/vapid-public-key` | Clave pública VAPID |
| POST | `/push/subscribe` | Registrar dispositivo |
| DELETE | `/push/unsubscribe` | Desuscribir |
| GET | `/health` | Health check |

---

## Base de datos

### Tablas

**places_visited** — Lugares visitados
- `id`, `name`, `address`, `visit_date`, `comment`, `rating` (1–5)
- `would_revisit` (bool nullable), `google_maps_url`
- `latitude`, `longitude`, `created_at`, `updated_at`

**photos** — Fotos y videos de lugares (N:1)
- `id`, `place_visited_id` / `place_wishlist_id` (FK con cascade delete)
- `cloudinary_url`, `cloudinary_public_id`, `resource_type` (image/video)
- `is_cover`, `position_x`, `position_y`, `sort_order`

**places_wishlist** — Planes pendientes
- `id`, `name`, `description`, `address`
- `google_maps_url`, `social_url` (Reel/TikTok/IG)
- `latitude`, `longitude`, `order_index`

**letters** — Cartitas
- `id`, `title`, `body`, `letter_date`
- `photo_url`, `photo_public_id`

**recipes** — Recetas
- `id`, `title`, `category` (salado/dulce)
- `ingredients`, `steps`, `notes`, `video_url`, `image_url`

**recipe_comments** — Comentarios de recetas (N:1)
- `id`, `recipe_id`, `author`, `text`, `rating` (1–5 nullable)

**cine_items** — Películas y series
- `id`, `title`, `type` (movie/series), `status` (to_watch/watched)
- `poster_url`, `synopsis`, `genres` (JSON), `platform`, `trailer_url`, `year`
- `rating` (1–5), `is_favorite`, `external_source`, `external_id`

**cine_comments** — Comentarios de cine (N:1)
- `id`, `cine_item_id`, `author`, `text`

**recommendation_history** — Historial de recomendaciones
- `id`, `request_type`, `request_moods`, `request_extra`
- `main_title`, `recommendations` (JSON), `created_at`

**blocked_recommendations** — Títulos que no se vuelven a sugerir
- `id`, `title`, `created_at`

**push_subscriptions** — Dispositivos suscritos a notificaciones
- `id`, `endpoint`, `p256dh`, `auth`, `created_at`

### Migraciones

El backend aplica las migraciones automáticamente al iniciar.

Para generar una nueva migración después de cambiar un modelo:
```bash
cd backend
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

---

## Cómo usar la app

1. **Entrar**: escribir la contraseña configurada en `APP_PASSWORD`

2. **Agregar lugar visitado**: "Ya hicimos" → "+ Agregar lugar"
   - Usar el mapa integrado para marcar la ubicación
   - Las fotos se pueden subir después desde la tarjeta del lugar

3. **Agregar lugar pendiente**: "Por hacer" → "+ Agregar"
   - Pegar el link del Reel o Google Maps que lo motivó
   - Arrastrar las tarjetas para reordenar la lista

4. **Pasar a visitado**: en la tarjeta → "Ya fuimos" → completar fecha y rating

5. **Cine**: "Cine" → "+ Agregar" → buscar el título automáticamente con TMDB
   - Filtrar por Películas / Series / Favoritas / Por ver / Ya vimos
   - "🎲 ¿Qué miramos hoy?" para elegir algo al azar de los pendientes
   - "✨ Recomendación inteligente" para que OpenAI sugiera algo según sus gustos

6. **Recetas**: "Recetas" → "+ Nueva receta"
   - Agregar ingredientes (uno por línea), pasos y foto
   - Dejar comentarios con rating desde el detalle

7. **Compartir desde otra app**: abrir cualquier URL en Instagram, Maps o YouTube → Compartir → Nuestro Mapita → elegir dónde guardarla

8. **Sorteo**: "Por hacer" → "Elegir al azar" para decidir el próximo plan

---

## Cómo cambiar la contraseña

```bash
# Editar .env
APP_PASSWORD=nueva_contraseña

# Reiniciar el backend
docker compose restart backend
```

Los tokens existentes siguen siendo válidos 30 días. Para invalidarlos inmediatamente, también cambiar `SECRET_KEY`.

---

## Personalización

### Colores y fuentes

Todos los valores están centralizados en `frontend/src/styles/variables.css`.

```css
--color-brown: #A0745A;     /* color primario */
--color-cream: #FDF6EE;     /* fondo general */
--font-heading: 'Playfair Display', serif;
--font-body: 'Lato', sans-serif;
```

Las fuentes se cargan desde Google Fonts en `frontend/index.html`.

### Centro y zoom del mapa

`frontend/src/components/map/MapView.jsx` → `defaultCenter` y `defaultZoom`.

### Tiles del mapa

```jsx
// CartoDB (minimalista):
url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"

// OpenStreetMap estándar (actual):
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
```

### Autores en comentarios de cine

`frontend/src/components/cine/CineDetail.jsx` → array `['Martín', 'Van', 'Ambos']`.

---

## Deploy gratuito

### Frontend → Vercel

1. Pushear el código a GitHub
2. Importar el repositorio en [vercel.com](https://vercel.com), seleccionar `frontend/` como root
3. Variable de entorno en Vercel:
   ```
   VITE_API_URL=https://tu-backend.railway.app
   ```

### Backend → Railway

1. Nuevo proyecto en [railway.app](https://railway.app) → "Deploy from GitHub" → carpeta `backend/`
2. Agregar un servicio MySQL en el mismo proyecto
3. Variables de entorno (todas las del `.env`, más las de DB del servicio MySQL):
   ```
   DB_HOST=tu-mysql.railway.internal
   DB_PORT=3306
   DB_USER=...
   DB_PASSWORD=...
   DB_NAME=nuestro_mapita
   APP_PASSWORD=...
   SECRET_KEY=...
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ALLOWED_ORIGINS=https://tu-app.vercel.app
   COOKIE_SECURE=True
   TMDB_API_KEY=...          (opcional)
   OPENAI_API_KEY=...        (opcional)
   VAPID_PUBLIC_KEY=...      (opcional)
   VAPID_PRIVATE_KEY=...     (opcional)
   VAPID_CLAIMS_EMAIL=...    (opcional)
   ```

Railway ejecuta `entrypoint.sh` automáticamente (aplica migraciones + inicia el servidor).

### Alternativa: Render

- Backend en [render.com](https://render.com) (free tier, se duerme tras 15 min de inactividad)
- MySQL: [Supabase](https://supabase.com) o [PlanetScale](https://planetscale.com)

### Servicios gratuitos — resumen

| Servicio | Limitaciones |
|---------|-------------|
| Vercel (frontend) | Ninguna para proyectos personales |
| Railway (backend) | $5/mes de crédito; suficiente para uso personal |
| Cloudinary (fotos) | 25 GB storage, 25 GB bandwidth/mes |
| TMDB (películas) | Gratuito con registro |
| OpenAI (recomendaciones) | De pago; ~$0.01–0.03 por recomendación |
| Nominatim (geocodificación) | Gratuito; máx 1 req/seg |

---

## Debugging

### MySQL no conecta

```bash
docker compose ps                    # verificar que el servicio db esté corriendo
docker compose logs db               # ver logs de MySQL
```

Verificar `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en el `.env`.

### El backend no levanta

```bash
docker compose logs backend
```

Causas comunes:
- `.env` no creado o con valores placeholder en `APP_PASSWORD` / `SECRET_KEY`
- Puerto 8000 ocupado (cambiar en `docker-compose.yml`)
- Error de sintaxis (ver el log completo)

### Error de CORS

Síntoma: `CORS policy: No 'Access-Control-Allow-Origin'` en la consola del navegador.

Verificar `ALLOWED_ORIGINS` en el `.env` del backend (incluir el dominio exacto con `https://`) y reiniciar el backend.

### Las fotos no se suben

Verificar las tres variables de Cloudinary en el `.env` y probar el endpoint en `http://localhost:8000/docs`.

### Los pines no aparecen en el mapa

Los pines solo aparecen si el lugar tiene coordenadas. Editar el lugar y usar el mapa integrado para marcarlas.

### La búsqueda de películas no funciona

Verificar que `TMDB_API_KEY` esté configurada. Sin ella, el formulario de cine funciona igual pero sin autocompletado (los datos se cargan manualmente).

### Las recomendaciones no funcionan

Verificar que `OPENAI_API_KEY` esté configurada. Sin ella, el panel de recomendaciones muestra error 503.

### Limpiar y reconstruir

```bash
docker compose down
docker builder prune -f
docker compose up --build
```

### Ver variables de entorno activas

```bash
docker compose exec backend python -c "from app.config import settings; print(settings.DATABASE_URL)"
```

### Puerto ocupado

```bash
lsof -i :8000    # encontrar el proceso
kill -9 <PID>
```

O cambiar el puerto en `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"
```
