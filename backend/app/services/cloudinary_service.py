"""
Servicio de Cloudinary para subir y eliminar imágenes.

Flujo:
1. El frontend manda el archivo al backend (multipart/form-data).
2. El backend lee los bytes y llama a upload_image().
3. Cloudinary devuelve secure_url y public_id.
4. El backend guarda esos valores en MySQL.
5. Para borrar: se llama a delete_image(public_id).
"""
import cloudinary
import cloudinary.uploader
from app.config import settings

# Configurar Cloudinary con las credenciales del .env
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(file_bytes: bytes, folder: str = "nuestro-mapita") -> dict:
    """
    Sube una imagen a Cloudinary y devuelve su URL pública y su public_id.
    El public_id es necesario para poder borrarla después.
    """
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="image",
        # Transformación: máximo 1400px de ancho para no guardar imágenes enormes
        transformation=[{"width": 1400, "crop": "limit", "quality": "auto:good"}],
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def upload_video(file_bytes: bytes, folder: str = "nuestro-mapita") -> dict:
    """Sube un video a Cloudinary y devuelve su URL pública y su public_id."""
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type="video",
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"],
    }


def delete_media(public_id: str, resource_type: str = "image") -> None:
    """Elimina un recurso de Cloudinary (imagen o video)."""
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)


def delete_image(public_id: str) -> None:
    """Elimina una imagen de Cloudinary usando su public_id."""
    cloudinary.uploader.destroy(public_id, resource_type="image")
