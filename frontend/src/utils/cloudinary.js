/**
 * Helpers para optimizar URLs de Cloudinary insertando transformaciones.
 * Solo afecta imágenes; las URLs de video se devuelven sin cambios.
 */

const isVideo = (url) =>
  url && (url.includes('/video/upload/') || /\.(mp4|mov|webm|avi)/i.test(url));

/**
 * Inserta `transforms` en una URL de imagen de Cloudinary.
 * Si la URL ya tiene transformaciones (algo después de /upload/) las reemplaza
 * solo si NO es un video y sí contiene /image/upload/.
 */
export function imgUrl(url, transforms = 'w_800,q_auto,f_auto') {
  if (!url || isVideo(url)) return url;
  // Insertar transforms después de /upload/
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transforms}/`);
  }
  return url;
}

/** Miniatura para grillas y tiras de fotos (~300 px ancho) */
export const thumbUrl = (url) => imgUrl(url, 'w_300,c_fill,q_auto,f_auto');

/** Portada de tarjeta (~700 px ancho) */
export const coverUrl = (url) => imgUrl(url, 'w_700,c_fill,q_auto,f_auto');

/** Polaroid de la galería del home (~400 px ancho) */
export const polaroidUrl = (url) => imgUrl(url, 'w_400,c_fill,q_auto,f_auto');

/** Lightbox / vista ampliada (max ~1200 px) */
export const fullUrl = (url) => imgUrl(url, 'w_1200,q_auto,f_auto');

/** Thumbnail de video: convierte la URL de video en un poster JPG via Cloudinary */
export function videoThumbUrl(url, transforms = 'w_300,c_fill,q_auto,f_jpg') {
  if (!url) return url;
  // /video/upload/... → /video/upload/transforms/.../poster.jpg
  return url
    .replace('/video/upload/', `/video/upload/${transforms}/`)
    .replace(/\.[^.]+$/, '.jpg');
}
