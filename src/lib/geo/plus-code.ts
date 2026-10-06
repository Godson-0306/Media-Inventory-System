import { OpenLocationCode } from "open-location-code";
import { NIGERIA_CENTER } from "@/lib/geo/config";

const codec = new OpenLocationCode();

const PLUS_CODE_TOKEN = /^[2-9CFGHJMPQRVWX]{2,8}\+[2-9CFGHJMPQRVWX]{2,3}$/i;

export function looksLikePlusCode(value: string) {
  const token = value.trim().split(/\s+/)[0] ?? "";
  return PLUS_CODE_TOKEN.test(token);
}

export function decodePlusCode(
  value: string,
  refLat = NIGERIA_CENTER.latitude,
  refLng = NIGERIA_CENTER.longitude,
) {
  const token = value.trim().split(/\s+/)[0]?.toUpperCase();
  if (!token) return null;
  try {
    let code = token;
    if (codec.isShort(code)) {
      code = codec.recoverNearest(code, refLat, refLng);
    }
    if (!codec.isFull(code)) return null;
    const area = codec.decode(code);
    const latitude = area.latitudeCenter;
    const longitude = area.longitudeCenter;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
