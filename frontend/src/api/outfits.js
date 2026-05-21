const OUTFITS_API = 'https://clima-en-outfits.up.railway.app';

async function outfitFetch(path) {
  const response = await fetch(`${OUTFITS_API}${path}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.detail || `Error ${response.status}`;
    throw new Error(Array.isArray(message) ? message[0]?.msg || 'Error' : message);
  }
  return data;
}

export function getOutfitByCity(city) {
  return outfitFetch(`/outfit/${encodeURIComponent(city)}`);
}

export function getOutfitByLocation(lat, lon) {
  return outfitFetch(`/outfit/location?lat=${lat}&lon=${lon}`);
}
