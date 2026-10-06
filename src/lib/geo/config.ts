export const GEO_USER_AGENT =
  process.env.GEO_USER_AGENT?.trim() ||
  "AssetOperations/1.0 (https://media-inventory-system.vercel.app; equipment checkout geocoding)";

/** Override to self-host Photon later. Public Komoot instance is fair-use only. */
export const PHOTON_BASE_URL =
  process.env.PHOTON_BASE_URL?.trim() || "https://photon.komoot.io";

export const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL?.trim() || "https://nominatim.openstreetmap.org";

/** Approximate Nigeria bounding box: minLon, minLat, maxLon, maxLat */
export const NIGERIA_BBOX = {
  minLon: 2.668,
  minLat: 4.24,
  maxLon: 14.678,
  maxLat: 13.892,
} as const;

export const NIGERIA_CENTER = {
  latitude: 9.082,
  longitude: 8.6753,
} as const;

export const GEO_SEARCH_LIMIT = 8;
export const GEO_MIN_QUERY_LENGTH = 3;
export const GEO_DEBOUNCE_MS = 400;
export const NOMINATIM_MIN_INTERVAL_MS = 1100;
export const GEO_FETCH_TIMEOUT_MS = 8000;

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Satellite tiles. Esri's documented path is the keyed World Imagery service
 * (`ibasemaps-api.arcgis.com` + token). The keyless `server.arcgisonline.com`
 * endpoint still serves tiles and is fine for light use, but it is legacy:
 * Esri may throttle or require auth later, and commercial apps should use a
 * free ArcGIS Location Platform key with HTTP-referrer restriction.
 *
 * TODO: Set NEXT_PUBLIC_ESRI_API_KEY (no other files need to change). Restrict
 * the key to this app's domains in the ArcGIS dashboard.
 */
const ESRI_KEYLESS_IMAGERY_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_KEYED_IMAGERY_TILE_URL =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export const ESRI_API_KEY = process.env.NEXT_PUBLIC_ESRI_API_KEY?.trim() ?? "";

export const ESRI_IMAGERY_TILE_URL = ESRI_API_KEY
  ? `${ESRI_KEYED_IMAGERY_TILE_URL}?token=${encodeURIComponent(ESRI_API_KEY)}`
  : ESRI_KEYLESS_IMAGERY_TILE_URL;

export const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export const RECENT_JOB_SITES_KEY = "aop_recent_job_sites";
export const RECENT_JOB_SITES_LIMIT = 5;
