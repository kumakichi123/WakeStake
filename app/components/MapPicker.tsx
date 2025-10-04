"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

const purple = L.divIcon({
  className: "",
  iconSize: [30, 42],
  iconAnchor: [15, 40],
  html: `<svg width="30" height="42" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 33c-1-2-9-12-9-18a9 9 0 1118 0c0 6-8 16-9 18z" fill="#A78BFA" stroke="rgba(0,0,0,.15)"/>
    <circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`
});

function Recenter({ pos }: { pos: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true });
  }, [pos, map]);
  return null;
}

function ClickToMove({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

export default function MapPicker({
  value,
  onChange,
  onAddress
}: {
  value?: LatLng | null;
  onChange: (lat: number, lng: number) => void;
  onAddress: (addr: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<LatLng | null>(null);
  const userMoved = useRef(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !value) return;
    const sameAsCurrent = pos && Math.abs(pos.lat - value.lat) < 1e-6 && Math.abs(pos.lng - value.lng) < 1e-6;
    if (sameAsCurrent) return;
    userMoved.current = true;
    setPos(value);
    reverse(value.lat, value.lng);
  }, [mounted, value]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  async function reverse(lat: number, lng: number) {
    try {
      console.debug("[map:reverse] request", { lat, lng });
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        console.warn("[map:reverse] non-ok response", response.status, response.statusText);
      }
      const json = await response.json().catch((error) => {
        console.error("[map:reverse] json parse error", error);
        return null;
      });
      if (json?.display_name) {
        onAddress(json.display_name);
      } else {
        console.warn("[map:reverse] missing display_name", json);
        onAddress("");
      }
    } catch (error) {
      console.error("[map:reverse] failed", error);
      onAddress("");
    }
  }

  useEffect(() => {
    if (!mounted || !("geolocation" in navigator)) return;
    const request = () =>
      navigator.geolocation.getCurrentPosition(
        position => {
          if (userMoved.current) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const next = { lat, lng };
          setPos(next);
          onChange(lat, lng);
          reverse(lat, lng);
        },
        error => {
          console.debug("[geo] fail", error?.message);
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 }
      );
    request();
  }, [mounted]);

  if (!mounted || !pos) {
    return (
      <div
        style={{
          height: 320,
          width: "100%",
          borderRadius: 12,
          background: "#F5F3FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #E9D5FF"
        }}
      >
        <span style={{ color: "#7C3AED" }}>Requesting your location...</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={[pos.lat, pos.lng]}
      zoom={17}
      scrollWheelZoom={false}
      style={{ height: 320, width: "100%", borderRadius: 12, overflow: "hidden" }}
      ref={mapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <Marker position={[pos.lat, pos.lng]} icon={purple} />
      <Recenter pos={pos} />
      <ClickToMove
        onPick={(lat, lng) => {
          userMoved.current = true;
          const next = { lat, lng };
          setPos(next);
          onChange(lat, lng);
          reverse(lat, lng);
        }}
      />
    </MapContainer>
  );
}

