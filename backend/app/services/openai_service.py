"""OpenAI-powered recommendation service.

Uses urllib (no extra dependency) to call the OpenAI chat completions API
with JSON mode, returning a structured {main, similar} recommendation object.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional


_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_MODEL = "gpt-4o-mini"


def _call_openai(api_key: str, messages: list[dict]) -> dict:
    payload = json.dumps(
        {
            "model": _MODEL,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.85,
            "max_tokens": 1200,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        _OPENAI_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI HTTP {exc.code}: {body}") from exc

    raw_content = data["choices"][0]["message"]["content"]
    return json.loads(raw_content)


def _build_prompt(
    watched: list[dict],
    favorites: list[dict],
    blocked_titles: list[str],
    req_type: Optional[str],
    moods: list[str],
    extra_text: Optional[str],
    include_watchlist: bool,
    watchlist: list[dict],
) -> str:
    lines: list[str] = []

    # Taste profile
    if watched:
        lines.append("**Historial visto (con puntaje si tienen):**")
        for item in watched[:25]:
            rating_str = f" — {item['rating']}/5" if item.get("rating") else ""
            genres_str = f" ({', '.join(item['genres'][:2])})" if item.get("genres") else ""
            lines.append(f"- {item['title']}{genres_str}{rating_str}")
    else:
        lines.append("Todavía no vieron nada registrado.")

    if favorites:
        lines.append("\n**Sus favoritas:**")
        for item in favorites[:10]:
            lines.append(f"- {item['title']}")

    if include_watchlist and watchlist:
        lines.append("\n**Lista de pendientes (pueden incluir alguna de estas):**")
        for item in watchlist[:15]:
            lines.append(f"- {item['title']}")

    # Session preferences
    lines.append("\n**Para esta sesión quieren:**")
    type_label = {"movie": "Película", "series": "Serie"}.get(req_type or "", "Cualquiera (película o serie)")
    lines.append(f"- Tipo: {type_label}")

    if moods:
        lines.append(f"- Estado de ánimo / género deseado: {', '.join(moods)}")
    else:
        lines.append("- Sin estado de ánimo específico")

    if extra_text:
        lines.append(f"- Contexto extra: {extra_text}")

    if blocked_titles:
        lines.append(f"\n**No recomendar (ya bloqueados):** {', '.join(blocked_titles)}")

    return "\n".join(lines)


def generate_recommendations(
    api_key: str,
    watched: list[dict],
    favorites: list[dict],
    watchlist: list[dict],
    blocked_titles: list[str],
    req_type: Optional[str],
    moods: list[str],
    extra_text: Optional[str],
    include_watchlist: bool,
) -> dict:
    """Return a dict with keys 'main' and 'similar' (list of 3)."""
    profile = _build_prompt(
        watched, favorites, blocked_titles, req_type, moods, extra_text, include_watchlist, watchlist
    )

    system_msg = (
        "Sos un recomendador experto de películas y series para una pareja argentina llamada "
        "Martín y Van. Tu objetivo es recomendar exactamente 1 título principal y 3 alternativos "
        "similares, eligiendo títulos que probablemente les encanten basándote en su historial y "
        "las preferencias de esta sesión.\n\n"
        "Devolvé ÚNICAMENTE un JSON con esta estructura (sin texto extra):\n"
        "{\n"
        '  "main": {\n'
        '    "title": "Nombre original del título",\n'
        '    "type": "movie" | "series",\n'
        '    "year": "2023",\n'
        '    "genres": ["Drama", "Romance"],\n'
        '    "synopsis_short": "Descripción muy breve en español (máx 120 caracteres)",\n'
        '    "reason": "Por qué les va a gustar, mencionando sus gustos (máx 150 caracteres)"\n'
        "  },\n"
        '  "similar": [ { misma estructura x3 } ]\n'
        "}\n\n"
        "Usá títulos reales que existan. Priorizá títulos en español latinoamericano cuando sea "
        "relevante. Si piden películas, solo películas. Si piden series, solo series."
    )

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": profile},
    ]

    result = _call_openai(api_key, messages)

    # Basic validation
    if "main" not in result or "similar" not in result:
        raise ValueError("Respuesta de OpenAI con formato inesperado")

    return result
