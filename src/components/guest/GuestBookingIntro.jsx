import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, KeyRound, ShieldCheck, X } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
import { SERVICE_CATALOG } from '@/lib/pricing';
import '@/components/guest/guestBooking.css';
export default function GuestBookingIntro({ value, onChange, onContinue }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const ready = value.name.trim().length >= 2 && value.phone.replace(/\D/g, '').length >= 10 && value.service && value.terms;
  return <section className="guest-booking bg-muted text-foreground font-body">
    <Link to="/login/cliente" aria-label="Fechar e entrar na minha conta" className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-lg border bg-card"><X className="h-4 w-4" /></Link>
    <div className="guest-booking-card"><h1 className="guest-booking-title font-heading font-bold">Precisa de um chaveiro?</h1>
      <div className="guest-booking-row"><div className="guest-booking-content">
        <p className="text-sm text-muted-foreground">Primeiro chamado pela web sem login. Cadastre-se ao final do atendimento, antes de confirmar e pagar.</p>
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (ready) onContinue(); }}>
          <div className="space-y-2">
            <Input aria-label="Seu nome" placeholder="Seu nome" autoComplete="name" value={value.name} maxLength={100} onChange={e => update('name', e.target.value)} className="h-11 bg-card" required />
            <Input aria-label="Telefone com DDD" placeholder="Telefone com DDD" type="tel" autoComplete="tel" value={value.phone} maxLength={20} onChange={e => update('phone', e.target.value)} className="h-11 bg-card" required />
            <NativeSelectDrawer label="Qual serviço você precisa?" value={value.service} onChange={next => update('service', next)} options={[{ value: '', label: 'Selecione o serviço', disabled: true }, ...SERVICE_CATALOG.filter(s => s.id.startsWith('abertura_')).map(s => ({ value: s.id, label: s.label }))]} />
            <NativeSelectDrawer label="Urgência do atendimento" value={value.urgency} onChange={next => update('urgency', next)} options={[{ value: 'normal', label: 'Atendimento normal' }, { value: 'urgent', label: 'Atendimento urgente' }]} />
          </div>
          <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={value.terms} onChange={e => update('terms', e.target.checked)} /><span>Concordo com os <Link to="/termos-privacidade" target="_blank" className="underline">termos e a privacidade</Link> e com a <Link to="/politica-reembolso" target="_blank" className="underline">política de cancelamento</Link>.</span></label>
          <Button disabled={!ready} className="guest-booking-continue relative h-11 w-full" type="submit"><span className="guest-booking-mask"><span className="guest-booking-label"><span aria-hidden="true">Continuar sem login</span><span>Continuar sem login</span></span></span><ArrowUpRight className="absolute right-3" /></Button>
        </form>
        <Link to="/login/cliente" className="text-sm underline underline-offset-4">Já tenho conta ou preciso de confecção de chave</Link>
        <p className="text-xs text-muted-foreground">Guarde este navegador para retomar o chamado. O telefone é um contato, não uma verificação de identidade.</p>
      </div><div className="guest-booking-scene" aria-hidden="true">
        <div className="guest-booking-photo-float"><div className="guest-booking-photo bg-card"><Image src="https://media.base44.com/images/public/6a975d266a8000184833026a/5e354d72c_generated_image.png" alt="Profissional realizando abertura de fechadura residencial" className="h-full w-full" /></div></div>
        <div className="guest-booking-corner bg-foreground text-background"><KeyRound className="h-7 w-7" /></div>
        <div className="guest-booking-badge bg-primary"><Image src="https://media.base44.com/images/public/6a975d266a8000184833026a/9d94c733b_ChatGPTImage4desetde202604_02_01.png" alt="ChaveiroJá" fittingType="fit" className="h-full w-full" /></div>
        <div className="guest-booking-caption bg-primary text-primary-foreground"><ShieldCheck className="h-7 w-7 shrink-0" /><p className="text-sm font-medium">Peça ajuda agora.<br />Cadastre-se ao final.</p></div>
      </div></div>
    </div>
  </section>;
}