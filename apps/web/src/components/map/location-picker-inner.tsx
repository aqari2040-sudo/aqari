'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths (Leaflet's default setup breaks with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DUBAI: [number, number] = [25.2048, 55.2708];

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

export default function LocationPickerInner({
  value,
  onChange,
  readOnly = false,
  height = 320,
}: {
  value: { lat: number; lng: number } | null;
  onChange?: (val: { lat: number; lng: number }) => void;
  readOnly?: boolean;
  height?: number;
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null,
  );

  useEffect(() => {
    if (value) setPosition([value.lat, value.lng]);
  }, [value?.lat, value?.lng]);

  const handlePick = (lat: number, lng: number) => {
    if (readOnly) return;
    setPosition([lat, lng]);
    onChange?.({ lat, lng });
  };

  const center: [number, number] = position ?? DUBAI;

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={position ? 16 : 11}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && <ClickHandler onPick={handlePick} />}
        {position && <Marker position={position} />}
        <RecenterOnChange position={position} />
      </MapContainer>
    </div>
  );
}
