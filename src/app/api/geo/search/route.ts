import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode, searchPlaces } from "@/lib/geo";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  try {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const place = await reverseGeocode(lat, lng);
      return NextResponse.json({ places: [place] });
    }
    const places = await searchPlaces(q);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json(
      { error: "Could not look up that place. Click the map to drop a pin instead." },
      { status: 502 },
    );
  }
}
