import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode, resolveMapsShortLink, searchPlaces } from "@/lib/geo";
import { GEO_MIN_QUERY_LENGTH } from "@/lib/geo/config";
import { parseGoogleMapsUrl } from "@/lib/geo/parse-location";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const mapsUrl = request.nextUrl.searchParams.get("url") ?? "";
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  try {
    if (mapsUrl) {
      const direct = parseGoogleMapsUrl(mapsUrl);
      if (direct) {
        const place = await reverseGeocode(direct.latitude, direct.longitude, request.signal);
        return NextResponse.json({ places: [place] });
      }
      const place = await resolveMapsShortLink(mapsUrl, request.signal);
      if (!place) {
        return NextResponse.json({
          places: [],
          error:
            "That short Maps link could not be resolved. Paste the full Google Maps URL or lat,lng instead.",
        });
      }
      return NextResponse.json({ places: [place] });
    }
    if (latParam != null && lngParam != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      const place = await reverseGeocode(lat, lng, request.signal);
      return NextResponse.json({ places: [place] });
    }
    if (q.trim().length < GEO_MIN_QUERY_LENGTH) {
      return NextResponse.json({ places: [] });
    }
    const places = await searchPlaces(q, request.signal);
    return NextResponse.json({ places });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ places: [] });
    }
    return NextResponse.json(
      { error: "Could not look up that place. Drop a pin on the map instead." },
      { status: 502 },
    );
  }
}
