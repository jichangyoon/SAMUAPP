export async function geocodeAddress(
  zip: string,
  country: string,
  city?: string
): Promise<{ lat: number; lng: number } | null> {
  const headers = {
    "User-Agent": "SAMU-App/1.0 (samu.ink)",
    Accept: "application/json",
  };

  try {
    const zipUrl = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(zip)}&countrycodes=${encodeURIComponent(country.toLowerCase())}&limit=1`;
    const zipRes = await fetch(zipUrl, { headers });
    if (zipRes.ok) {
      const data = await zipRes.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch {}

  if (city) {
    try {
      const cityUrl = `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(city)}&countrycodes=${encodeURIComponent(country.toLowerCase())}&limit=1`;
      const cityRes = await fetch(cityUrl, { headers });
      if (cityRes.ok) {
        const data = await cityRes.json();
        if (data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }
    } catch {}
  }

  return null;
}
