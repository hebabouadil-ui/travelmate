"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import type { GeoPoint, Place } from "@/lib/types";

const CATEGORY_COLOR: Record<string, string> = {
  restaurant: "#fb7185",
  cafe: "#f59e0b",
  museum: "#a78bfa",
  monument: "#6d7cff",
  attraction: "#2dd4bf",
  landmark: "#38bdf8",
  park: "#34d399",
  beach: "#22d3ee",
  viewpoint: "#facc15",
  nightlife: "#e879f9",
  shopping: "#f472b6",
  user: "#ffffff",
};

function pin(color: string, label?: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative">
      <div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 4px 14px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.85)"></div>
      ${
        label
          ? `<div style="position:absolute;top:3px;left:0;width:26px;text-align:center;color:#0a0c14;font-size:12px;font-weight:700">${label}</div>`
          : ""
      }
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
    popupAnchor: [0, -22],
  });
}

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useMemo(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, points]);
  return null;
}

export interface TripMapProps {
  center: GeoPoint;
  places: Place[];
  /** Ordered route to draw as a polyline. */
  route?: GeoPoint[];
  /** Number markers in order. */
  numbered?: boolean;
  userLocation?: GeoPoint | null;
  className?: string;
}

export default function TripMap({
  center,
  places,
  route,
  numbered,
  userLocation,
  className,
}: TripMapProps) {
  const fitPoints = useMemo(
    () => [...places, ...(userLocation ? [userLocation] : [])],
    [places, userLocation]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {route && route.length > 1 && (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#6d7cff", weight: 3, opacity: 0.7, dashArray: "6 8" }}
        />
      )}
      {places.map((p, i) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pin(CATEGORY_COLOR[p.category] || "#6d7cff", numbered ? String(i + 1) : undefined)}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            <span style={{ textTransform: "capitalize", opacity: 0.7 }}>
              {p.category}
              {p.hiddenGem ? " · hidden gem" : ""}
            </span>
          </Popup>
        </Marker>
      ))}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={pin("#ffffff")}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      <FitBounds points={fitPoints.length ? fitPoints : [center]} />
    </MapContainer>
  );
}
