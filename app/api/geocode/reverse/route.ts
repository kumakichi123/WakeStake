import { NextRequest, NextResponse } from "next/server";

const USER_AGENT = "WakeStake/1.0 (+https://wakestake.com)";
const CONTACT_EMAIL = "contact@wakestake.com";

function parseNumber(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const lat = parseNumber(req.nextUrl.searchParams.get("lat"));
  const lng = parseNumber(req.nextUrl.searchParams.get("lng"));
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("email", CONTACT_EMAIL);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.8,ja;q=0.5",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[geocode:reverse] non-ok response", response.status, text);
      return NextResponse.json({ error: "upstream_error", status: response.status }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[geocode:reverse] fetch failed", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
