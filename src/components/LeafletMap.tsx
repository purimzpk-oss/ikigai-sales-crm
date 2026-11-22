"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import { stageOf, baht } from "@/lib/crm";

export type Pin = { id: number; name: string; lat: number; lng: number; stage: string; value: number; phone: string | null };

const BANGKOK: [number, number] = [13.7563, 100.5018];
const COLORS: Record<string, string> = {
  lead: "#2d64a8", contact: "#7a67c4", quote: "#c7791f", nego: "#c4508a", won: "#2f8a4e", lost: "#b4423a",
};

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function LeafletMap({ pins, onPick, height = "100%" }: {
  pins: Pin[];
  onPick?: (lat: number, lng: number) => void;
  height?: string;
}) {
  const center: [number, number] = pins.length ? [pins[0].lat, pins[0].lng] : BANGKOK;
  const bounds = pins.length > 1 ? (pins.map((p) => [p.lat, p.lng]) as [number, number][]) : undefined;
  return (
    <MapContainer center={center} zoom={pins.length === 1 ? 15 : 11} bounds={bounds} boundsOptions={{ padding: [40, 40] }}
      style={{ height, width: "100%" }} scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {onPick && <ClickPicker onPick={onPick} />}
      {pins.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={7 + Math.min(12, Math.sqrt(p.value / 1000) * 0.6)}
          pathOptions={{ color: "#fff", weight: 2, fillColor: COLORS[p.stage] ?? "#2d64a8", fillOpacity: 0.85 }}>
          {p.id > 0 && (
            <Popup>
              <b>{p.name}</b><br />
              {stageOf(p.stage).label} · {baht(p.value)}<br />
              {p.phone && <>โทร {p.phone}<br /></>}
              <a href={`/customers/${p.id}`}>ดูรายละเอียด</a> ·{" "}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noopener">นำทาง</a>
            </Popup>
          )}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
