'use client';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const LocationPickerInner = dynamic(() => import('./location-picker-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

export type LocationValue = { lat: number; lng: number } | null;

export function LocationPicker(props: ComponentProps<typeof LocationPickerInner>) {
  return <LocationPickerInner {...props} />;
}
