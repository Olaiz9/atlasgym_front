export async function obtenerCiudadPorCoordenadas(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`,
      { signal }
    )
    if (!res.ok) return 'Ubicación no disponible'
    const data = await res.json()
    const ciudad = data.city || data.locality || data.principalSubdivision
    return ciudad ? `${ciudad}, ${data.countryCode}` : 'Ubicación no disponible'
  } catch {
    return 'Ubicación no disponible'
  }
}