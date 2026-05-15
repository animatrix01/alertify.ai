import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { severityColor, type DisasterAlert } from "@/hooks/use-disaster-alerts";

// Default Leaflet markers fail in Vite — provide custom DivIcons.
const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:oklch(0.55 0.2 250);
    box-shadow:0 0 0 6px oklch(0.55 0.2 250 / 0.25), 0 0 0 14px oklch(0.55 0.2 250 / 0.12);
    border:2px solid white;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const alertIcon = (sev: DisasterAlert["severity"]) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;
      background:${severityColor(sev)};
      border:2px solid white;
      box-shadow:0 0 0 4px ${severityColor(sev)}33, 0 6px 14px rgba(0,0,0,0.18);
      animation: alertPing 1.6s ease-out infinite;"></div>
      <style>@keyframes alertPing{0%{box-shadow:0 0 0 0 ${severityColor(sev)}66}70%{box-shadow:0 0 0 18px ${severityColor(sev)}00}100%{box-shadow:0 0 0 0 ${severityColor(sev)}00}}</style>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef<string>("");
  useEffect(() => {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (last.current === key) return;
    last.current = key;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

export function DisasterMap({
  alerts,
  user,
  userRadiusKm,
}: {
  alerts: DisasterAlert[];
  user: { lat: number; lng: number } | null;
  userRadiusKm?: number | null;
}) {
  const center = useMemo<[number, number]>(() => {
    if (user) return [user.lat, user.lng];
    if (alerts[0]) return [alerts[0].latitude, alerts[0].longitude];
    return [19.076, 72.8777];
  }, [user, alerts]);

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ background: "oklch(0.97 0.01 85)" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {user && <Recenter lat={user.lat} lng={user.lng} />}
      {user && userRadiusKm ? (
        <Circle
          center={[user.lat, user.lng]}
          radius={userRadiusKm * 1000}
          pathOptions={{
            color: "oklch(0.55 0.2 250)",
            fillColor: "oklch(0.55 0.2 250)",
            fillOpacity: 0.05,
            weight: 1,
            dashArray: "4 6",
          }}
        />
      ) : null}
      {user && (
        <Marker position={[user.lat, user.lng]} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      {alerts.map((a) => (
        <div key={a.id}>
          <Circle
            center={[a.latitude, a.longitude]}
            radius={Number(a.radius_km) * 1000}
            pathOptions={{
              color: severityColor(a.severity),
              fillColor: severityColor(a.severity),
              fillOpacity: 0.12,
              weight: 1.5,
            }}
          />
          <Marker
            position={[a.latitude, a.longitude]}
            icon={alertIcon(a.severity)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{a.title}</strong>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  {a.type.toUpperCase()} · {a.severity}
                </div>
                {a.description && (
                  <p style={{ fontSize: 12, marginTop: 6 }}>{a.description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
}
