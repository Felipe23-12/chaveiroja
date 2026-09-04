import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import AvatarPicker from "@/components/profile/AvatarPicker";

/** Modal para o usuário definir sua foto de perfil (câmera ou galeria). */
export default function UserPhotoModal({ open, onOpenChange, onSaved }) {
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then((u) => setAvatar(u?.avatar_url || "")).catch(() => {});
  }, [open]);

  const handleChange = async (url) => {
    await base44.auth.updateMe({ avatar_url: url });
    setAvatar(url);
    onSaved?.(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sua foto de perfil</DialogTitle>
          <DialogDescription>
            Tire uma foto agora com a câmera ou escolha uma imagem da galeria.
          </DialogDescription>
        </DialogHeader>
        <AvatarPicker value={avatar} onChange={handleChange} size={88} label="Minha foto" />
      </DialogContent>
    </Dialog>
  );
}