# Nuestro Mapita

Una página privada y romántica para guardar los lugares que visitamos, los que queremos visitar, fotos, cartitas y un mapa interactivo con nuestros recuerdos compartidos.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Estilos | CSS propio (sin Tailwind) |
| Backend | Python + FastAPI |
| ORM | SQLAlchemy 2.0 |
| Base de datos | MySQL 8 |
| Migraciones | Alembic |
| Fotos | Cloudinary (free tier) |
| Mapa | React Leaflet + OpenStreetMap |
| Contenedores | Docker Compose |

---

## Estructura de carpetas

```
nuestro-mapita/
├── backend/
│   ├── app/
│   │   ├── main.py          # Entrada de FastAPI
│   │   ├── config.py        # Variables de entorno
│   │   ├── database.py      # Conexión a MySQL
│   │   ├── dependencies.py  # Validación JWT
│   │   ├── models/          # Tablas SQLAlchemy
│   │   ├── schemas/         # Schemas Pydantic (validación)
│   │   ├── routers/         # Endpoints por recurso
│   │   └── services/        # Cloudinary
│   ├── alembic/             # Migraciones de DB
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── entrypoint.sh        # Script de inicio (migra + levanta)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Funciones para llamar al backend
│   │   ├── components/      # Componentes reutilizables
│   │   ├── context/         # AuthContext (sesión)
│   │   ├── pages/           # Una page por sección
│   │   └── styles/          # CSS organizado por sección
│   ├── nginx.conf           # Proxy al backend en Docker
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

# Crear el archivo .env en la raíz
cp .env.example .env
```

Abrir `.env` y editar:

```env
APP_PASSWORD=la_contraseña_que_van_a_usar

# Generar con: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=una_clave_larga_y_aleatoria

CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

> Importante: `APP_PASSWORD` y `SECRET_KEY` no pueden quedar vacíos ni con valores de ejemplo. El backend falla al iniciar si detecta una configuración insegura.

### 2. Levantar todo

```bash
docker compose up --build
```

La primera vez tarda unos minutos mientras baja las imágenes y construye el frontend.

### 3. Acceder

| Servicio | URL |
|---------|-----|
| **App (frontend)** | http://localhost |
| **API (backend)** | http://localhost:8000 |
| **Docs automáticos** | http://localhost:8000/docs |
| **MySQL** | localhost:3306 (user: mapita) |

La app empieza vacía. Entrar con la contraseña configurada en `APP_PASSWORD`.

### 4. Detener

```bash
docker compose down
```

Para también borrar los datos de la base de datos:

```bash
docker compose down -v
```

---

## Cómo levantar en desarrollo local (sin Docker)

Útil para hacer cambios y ver hot-reload inmediato.

### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

pip install -r requirements.txt

# Crear .env en backend/
cp .env.example .env
# Editar el .env con los datos de tu MySQL local y Cloudinary

# Aplicar migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

### Tests del backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

### Frontend

```bash
cd frontend

npm install

# El proxy de Vite ya apunta a localhost:8000
npm run dev
```

Entrar en http://localhost:5173

---

## Endpoints principales de la API

Todos los endpoints (excepto `/auth/login` y `/health`) requieren el header:
```
Authorization: Bearer <token>
```

### Autenticación
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| POST | `/auth/login` | Iniciar sesión con la contraseña compartida |

### Lugares visitados
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/places/visited?sort=newest&search=texto` | Listar |
| POST | `/places/visited` | Crear |
| GET | `/places/visited/{id}` | Ver uno |
| PUT | `/places/visited/{id}` | Editar |
| DELETE | `/places/visited/{id}` | Eliminar |
| POST | `/places/visited/{id}/photos` | Subir fotos |

### Fotos
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| DELETE | `/photos/{id}` | Eliminar una foto |

### Lugares por visitar
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/places/wishlist?search=texto` | Listar |
| POST | `/places/wishlist` | Agregar |
| PUT | `/places/wishlist/{id}` | Editar |
| DELETE | `/places/wishlist/{id}` | Eliminar |
| PATCH | `/places/wishlist/{id}/order?direction=up` | Reordenar (up/down/top/bottom) |
| POST | `/places/wishlist/{id}/convert` | Pasar a visitado |
| GET | `/places/wishlist/random` | Elegir uno al azar |

### Cartitas
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/letters` | Listar |
| POST | `/letters` | Crear |
| PUT | `/letters/{id}` | Editar |
| DELETE | `/letters/{id}` | Eliminar |
| POST | `/letters/{id}/photo` | Subir/reemplazar foto |
| DELETE | `/letters/{id}/photo` | Eliminar foto |

### Mapa y Búsqueda
| Método | Endpoint | Descripción |
|--------|---------|-------------|
| GET | `/map/pins` | Todos los pines del mapa |
| GET | `/search?q=texto` | Búsqueda global |
| GET | `/health` | Health check |

---

## Base de datos y modelos

### Tablas

**places_visited** — Lugares que ya visitaron
- `id`, `name`, `address`, `visit_date`
- `comment`, `rating` (1-5), `google_maps_url`
- `latitude`, `longitude`
- `created_at`, `updated_at`

**photos** — Fotos de lugares visitados (N:1)
- `id`, `place_visited_id` (FK cascade delete)
- `cloudinary_url`, `cloudinary_public_id`

**places_wishlist** — Lugares por visitar
- `id`, `name`, `description`, `address`
- `google_maps_url`, `social_url` (Reel/TikTok/IG)
- `latitude`, `longitude`, `order_index`

**letters** — Cartitas
- `id`, `title`, `body`, `letter_date`
- `photo_url`, `photo_public_id`

### Migraciones

El backend aplica las migraciones automáticamente al iniciar con `alembic upgrade head`.

Para generar una nueva migración después de cambiar un modelo:
```bash
cd backend
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

---

## Cloudinary (fotos)

1. Crear cuenta gratis en https://cloudinary.com
2. Ir al **Dashboard** → copiar Cloud Name, API Key y API Secret
3. Pegar en el `.env`

El free tier incluye 25 GB de storage y 25 GB de bandwidth/mes, más que suficiente.

Las fotos se guardan en Cloudinary y solo sus URLs quedan en MySQL. Al eliminar una foto, se borra tanto de Cloudinary como de la base de datos.

---

## Mapa

- **Motor**: React Leaflet + OpenStreetMap (100% gratuito, sin API key)
- **Geocodificación**: Nominatim (servicio público de OpenStreetMap) — el botón "Buscar" en los formularios obtiene las coordenadas automáticamente
- **Pines**: marrones para visitados, rosas para por visitar
- Los lugares sin coordenadas aparecen en las listas pero no en el mapa

---

## Cómo usar la app

1. **Entrar**: escribir la contraseña configurada en `APP_PASSWORD`
2. **Agregar lugar visitado**: ir a "Visitados" → "+ Agregar lugar"
   - Al ingresar la dirección, tocar "📍 Buscar" para obtener coordenadas automáticamente
   - Las fotos se pueden subir después de crear el lugar (expandir la tarjeta)
3. **Agregar lugar por visitar**: ir a "Por visitar" → "+ Agregar"
   - Pegar el link del Reel o TikTok que lo motivó
4. **Pasar a visitado**: en la tarjeta del lugar, tocar "Ya fuimos" y completar fecha + rating
5. **Mapa**: ver todos los lugares con pines, filtrar por tipo, tocar para ver detalles
6. **Cartitas**: escribir un mensaje romántico desde "Cartitas" → "+ Escribir cartita"
7. **Sorteo**: en "Por visitar" → "Elegir al azar" para elegir el próximo plan

---

## Cómo cambiar la contraseña

1. Editar el `.env` en la raíz del proyecto
2. Cambiar el valor de `APP_PASSWORD`
3. Reiniciar el backend: `docker compose restart backend`

Los tokens existentes seguirán siendo válidos hasta que expire (30 días). Si querés invalidarlos inmediatamente, también cambiá `SECRET_KEY`.

---

## Cómo modificar colores, fuentes y estilos

Todos los valores están centralizados en:
```
frontend/src/styles/variables.css
```

Cambiar por ejemplo el color primario:
```css
--color-brown: #A0745A;  /* Cambiar este valor */
```

El cambio se aplica automáticamente en toda la app.

Las fuentes se cargan desde Google Fonts en `frontend/index.html`. Para cambiarlas, reemplazar la URL de Google Fonts y actualizar las variables `--font-heading` y `--font-body` en `variables.css`.

---

## Cómo agregar categorías

Los lugares no tienen categorías por ahora. Para agregarlas:

1. **Backend**: agregar columna `category` en el modelo correspondiente:
```python
category = Column(String(100), nullable=True)
```

2. **Migración**: `alembic revision --autogenerate -m "add category"`

3. **Schema**: agregar el campo en el schema Pydantic

4. **Frontend**: agregar el selector de categoría en el formulario y filtro en la lista

---

## Cómo agregar nuevos campos

1. Agregar la columna en el modelo SQLAlchemy (`app/models/`)
2. Generar migración: `alembic revision --autogenerate -m "descripción"`
3. Aplicar: `alembic upgrade head`
4. Agregar el campo en el schema Pydantic (`app/schemas/`)
5. Agregar el campo en el formulario del frontend (`src/components/places/PlaceForm.jsx`)
6. Mostrar el campo en la tarjeta del frontend (`src/pages/Visited.jsx`)

---

## Cómo modificar el mapa

El mapa está en `frontend/src/components/map/MapView.jsx`.

- **Cambiar el centro por defecto**: modificar `defaultCenter` (latitud, longitud)
- **Cambiar el zoom**: modificar `defaultZoom`
- **Cambiar los tiles (diseño del mapa)**: reemplazar la URL del `<TileLayer>`. Opciones gratuitas:
  - CartoDB (mapa minimalista): `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
  - OpenStreetMap estándar: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (actual)
- **Colores de los pines**: modificar en `frontend/src/styles/map.css`

---

## Guía de deploy gratuito

### Frontend → Vercel

1. Pushear el código a GitHub
2. Crear cuenta en https://vercel.com
3. Importar el repositorio → seleccionar la carpeta `frontend` como root
4. Variables de entorno en Vercel:
   ```
   VITE_API_URL=https://tu-backend.railway.app
   ```
5. Vercel detecta Vite automáticamente

### Backend → Railway

1. Crear cuenta en https://railway.app
2. Nuevo proyecto → "Deploy from GitHub repo" → seleccionar la carpeta `backend`
3. Agregar servicio MySQL en el mismo proyecto
4. Variables de entorno en Railway:
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
   ```
5. Railway ejecuta `entrypoint.sh` automáticamente (aplica migraciones + inicia servidor)

### Alternativa gratuita: Render

- Backend en https://render.com (free tier, duerme después de 15 min de inactividad)
- MySQL: usar https://planetscale.com (tienen free tier) o Supabase con SQLite driver

### CORS en producción

En el `.env` del backend, actualizar:
```
ALLOWED_ORIGINS=https://tu-app.vercel.app
```

### Fotos → Cloudinary (ya gratuito)

No requiere configuración adicional para deploy.

---

## Guía de debugging

### MySQL no conecta

```
Error: Can't connect to MySQL server
```

Verificar:
- Que MySQL esté corriendo: `docker compose ps`
- Variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en el `.env`
- Si es local (sin Docker): verificar que MySQL esté iniciado con `mysql.server start` o `brew services start mysql`

### El backend no levanta

```bash
docker compose logs backend
```

Causas comunes:
- Variable de entorno faltante (revisar que el `.env` esté creado)
- Error de sintaxis en Python (ver el log completo)
- Puerto 8000 ocupado: cambiar en `docker-compose.yml`

### El frontend no carga

```bash
docker compose logs frontend
```

Si en desarrollo local:
```bash
cd frontend && npm install && npm run dev
```

Verificar que la URL del backend esté bien configurada en `vite.config.js` (para dev) o en `nginx.conf` (para Docker).

### Error de CORS

Síntoma: en la consola del navegador aparece `CORS policy: No 'Access-Control-Allow-Origin'`

Solución:
- Verificar `ALLOWED_ORIGINS` en el `.env` del backend
- En producción, incluir el dominio exacto de Vercel (con https://)
- Reiniciar el backend después de cambiar el `.env`

### Variables de entorno mal configuradas

Si el backend carga pero la app no funciona:
```bash
# Ver qué variables tiene el backend
docker compose exec backend python -c "from app.config import settings; print(settings.DATABASE_URL)"
```

### Cloudinary no sube fotos

Síntoma: error al intentar subir una imagen

Verificar:
1. Que `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` estén correctos
2. Probar en http://localhost:8000/docs → endpoint de upload
3. Verificar que la cuenta de Cloudinary esté activa

### No se ven los pines del mapa

Los pines solo aparecen si el lugar tiene **latitud y longitud** cargadas.

Solución: editar el lugar y usar el botón "📍 Buscar" para obtener coordenadas automáticamente a partir de la dirección.

### Docker Compose falla al buildear el frontend

```bash
# Limpiar cache de Docker y reintentar
docker compose down
docker builder prune -f
docker compose up --build
```

### Puerto ocupado

Error: `address already in use`

```bash
# Ver qué proceso usa el puerto (ej: 8000)
lsof -i :8000
kill -9 <PID>
```

O cambiar el puerto en `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Cambiar 8001 por cualquier puerto libre
```

### Problemas con URLs del frontend/backend en producción

Si el frontend no puede comunicarse con el backend:
1. Verificar `VITE_API_URL` en las variables de entorno de Vercel
2. Verificar que el backend en Railway/Render esté corriendo (`/health` debe devolver `{"status": "ok"}`)
3. Verificar CORS en el backend

---

## Notas sobre los servicios gratuitos

| Servicio | Limitaciones |
|---------|-------------|
| Vercel (frontend) | Ninguna para proyectos personales |
| Railway (backend) | $5/mes de crédito gratuito; después requiere tarjeta |
| Render (backend, alternativa) | Se "duerme" después de 15 min sin tráfico; tarda ~30 seg en despertar |
| Cloudinary (fotos) | 25 GB storage, 25 GB bandwidth/mes |
| Nominatim (geocodificación) | Máx 1 request/segundo; para uso personal es más que suficiente |

Para uso personal de pareja, todos estos free tiers son más que suficientes.
