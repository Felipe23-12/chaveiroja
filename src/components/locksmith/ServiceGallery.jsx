import React, { useState } from "react";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";

function Photo({ url, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
    >
      <Image src={url} alt="Foto do serviço" className="w-full h-full object-cover" />
    </button>
  );
}

function Section({ title, photos, onOpen }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, idx) => (
          <Photo key={idx} url={url} onClick={() => onOpen(url)} />
        ))}
      </div>
    </div>
  );
}

export default function ServiceGallery({ startPhotos = [], endPhotos = [] }) {
  const [lightbox, setLightbox] = useState(null);

  const allPhotos = [...(startPhotos || []), ...(endPhotos || [])];
  if (allPhotos.length === 0) return null;

  const closeLightbox = () => setLightbox(null);
  const currentIndex = lightbox ? allPhotos.indexOf(lightbox) : -1;
  const prev = (e) => {
    e.stopPropagation();
    setLightbox(allPhotos[(currentIndex - 1 + allPhotos.length) % allPhotos.length]);
  };
  const next = (e) => {
    e.stopPropagation();
    setLightbox(allPhotos[(currentIndex + 1) % allPhotos.length]);
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Camera className="w-3.5 h-3.5" /> Fotos do atendimento
      </div>
      <Section title="Início do serviço" photos={startPhotos} onOpen={setLightbox} />
      <Section title="Término do serviço" photos={endPhotos} onOpen={setLightbox} />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
          {allPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div className="max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} alt="Foto do serviço" className="w-full h-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}