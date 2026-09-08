import React, { useRef, useState } from "react";
import { Camera, Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function ChatPhotoButton({ onUploaded, disabled = false }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUploaded(file_url);
    } catch {
      setError("Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={upload} className="hidden" />
      <Button type="button" variant="outline" size="icon" onClick={() => cameraRef.current?.click()} disabled={disabled || uploading} aria-label="Tirar foto" title="Câmera">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => galleryRef.current?.click()} disabled={disabled || uploading} aria-label="Escolher foto da galeria" title="Galeria">
        <Images className="w-4 h-4" />
      </Button>
      {error && <span className="sr-only" role="alert">{error}</span>}
    </div>
  );
}