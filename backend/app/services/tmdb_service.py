"""
Servicio de integración con TMDb (The Movie Database).
Documentación: https://developer.themoviedb.org/docs

Las llamadas se hacen desde el backend para no exponer el API key en el frontend.
"""
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

TMDB_BASE = "https://api.themoviedb.org/3"
POSTER_BASE = "https://image.tmdb.org/t/p/w500"


def _get(path: str, params: dict) -> dict:
    url = f"{TMDB_BASE}{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=8) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"TMDb error {e.code}: {e.reason}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"No se pudo conectar a TMDb: {e.reason}")


def search(query: str, api_key: str) -> list[dict]:
    """
    Busca películas y series por título.
    Devuelve hasta 10 resultados simplificados para que el usuario elija.
    """
    data = _get(
        "/search/multi",
        {
            "api_key": api_key,
            "query": query,
            "language": "es-ES",
            "include_adult": "false",
            "page": 1,
        },
    )
    results = []
    for item in data.get("results", [])[:10]:
        media_type = item.get("media_type")
        if media_type not in ("movie", "tv"):
            continue
        is_movie = media_type == "movie"
        title = item.get("title") if is_movie else item.get("name")
        date = item.get("release_date") if is_movie else item.get("first_air_date")
        year = date[:4] if date else None
        poster = f"{POSTER_BASE}{item['poster_path']}" if item.get("poster_path") else None
        results.append({
            "tmdb_id": item["id"],
            "type": "movie" if is_movie else "series",
            "title": title,
            "year": year,
            "poster_url": poster,
            "overview": item.get("overview") or "",
        })
    return results


def get_detail(tmdb_id: int, media_type: str, api_key: str) -> dict:
    """
    Obtiene detalle completo: géneros, sinopsis, tráiler.
    media_type debe ser 'movie' o 'series'.
    """
    endpoint = "movie" if media_type == "movie" else "tv"

    detail = _get(f"/{endpoint}/{tmdb_id}", {"api_key": api_key, "language": "es-ES"})

    title = detail.get("title") if media_type == "movie" else detail.get("name")
    date = detail.get("release_date") if media_type == "movie" else detail.get("first_air_date")
    year = date[:4] if date else None
    poster = f"{POSTER_BASE}{detail['poster_path']}" if detail.get("poster_path") else None
    genres = [g["name"] for g in detail.get("genres", [])]
    synopsis = detail.get("overview") or ""

    trailer_url = _find_trailer(tmdb_id, endpoint, api_key)

    return {
        "tmdb_id": tmdb_id,
        "type": media_type,
        "title": title,
        "year": year,
        "poster_url": poster,
        "synopsis": synopsis,
        "genres": genres,
        "trailer_url": trailer_url,
    }


def _find_trailer(tmdb_id: int, endpoint: str, api_key: str) -> Optional[str]:
    """Busca el tráiler en YouTube (primero en español, luego en inglés)."""
    for lang in ("es", "en"):
        try:
            videos = _get(
                f"/{endpoint}/{tmdb_id}/videos",
                {"api_key": api_key, "language": lang},
            )
        except RuntimeError:
            continue
        for v in videos.get("results", []):
            if v.get("type") == "Trailer" and v.get("site") == "YouTube":
                return f"https://www.youtube.com/watch?v={v['key']}"
    return None
