import React, { useId } from 'react';
import { useServiceAreas } from '@/lib/serviceAreas';
export default function ServiceAreaOverlay({ project, width, height }) {
  const { areas, loading, error } = useServiceAreas(); const id = useId().replace(/:/g, '');
  if (loading || error) return <div className="absolute bottom-7 left-2 z-10 rounded bg-card/95 px-2 py-1 text-xs text-muted-foreground">{loading ? 'Carregando cobertura…' : 'Cobertura indisponível'}</div>;
  const points = ring => ring.map(([lng,lat]) => { const p = project(lat,lng); return `${p.x},${p.y}`; }).join(' ');
  const shapes = areas.filter(a => a.active).flatMap(area => [
    ...(area.polygons || []).map((ring, i) => ({ path: [ring, ...(area.polygon_holes?.[i] || [])].map(r => `M${points(r).split(' ').join(' L')} Z`).join(' ') })),
    ...(area.lines || []).map(line => { const [lng,lat] = line[0]; const p = project(lat,lng), q = project(lat + (area.street_radius_m || 120) / 111200,lng); return { points: points(line), stroke: Math.abs(q.y - p.y) * 2 }; }),
  ]);
  return <>
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}><rect width={width} height={height} fill="white" />{shapes.map((s,i) => s.path ? <path key={i} d={s.path} fill="black" fillRule="evenodd" /> : <polyline key={i} points={s.points} fill="none" stroke="black" strokeWidth={s.stroke} strokeLinecap="round" strokeLinejoin="round" />)}</mask></defs>
      <rect width={width} height={height} className="fill-destructive" opacity="0.38" mask={`url(#${id})`} />
      {shapes.filter(s => s.path).map((s,i) => <path key={i} d={s.path} fill="none" className="stroke-success" strokeWidth="2" />)}
    </svg>
    <div className="pointer-events-none absolute bottom-7 left-2 z-10 rounded bg-card/95 px-2 py-1 text-[10px] text-foreground"><span className="text-success">Limite liberado</span> · <span className="text-destructive">Vermelho: sem atendimento</span></div>
  </>;
}