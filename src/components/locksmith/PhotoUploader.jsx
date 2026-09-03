import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Camera, Image as ImageIcon } from "lucide-react";
import { Image } from "@/components/ui/image";
import CameraCapture from "@/components/locksmith/CameraCapture";

export default function PhotoUploader({ photos = [], onChange, label }) {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const uploadOne = async (file) => {
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res?.file_url) onChange([...photos, res.file_url]);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) urls.push(res.file_url);
      }
      onChange([...photos, ...urls]);
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx) => onChange(photos.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-foreground">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {photos.map((url, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
            <Image src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={uploading}
          className={`w-20 h-20 rounded-lg border-2 border-primary/40 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:border-primary text-primary ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          <span className="text-[10px] mt-0.5 font-medium">Tirar foto</span>
        </button>
        <label
          className={`w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary text-muted-foreground ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          <span className="text-[10px] mt-0.5">Galeria</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
        </label>
      </div>

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            uploadOne(file);
          }}
        />
      )}
    </div>
  );
}