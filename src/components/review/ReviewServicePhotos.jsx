import React from 'react';
import { Image } from '@/components/ui/image';
export default function ReviewServicePhotos({ request }) {
  return <>{[['Fotos do início', request.start_photos], ['Fotos do serviço finalizado', request.end_photos]].map(([label, photos]) => photos?.length ? <div key={label}><p className="text-xs text-muted-foreground mb-2">{label}</p><div className="flex flex-wrap gap-2">{photos.map(url => <Image key={url} src={url} alt={label} className="w-20 h-20 rounded-lg" />)}</div></div> : null)}</>;
}