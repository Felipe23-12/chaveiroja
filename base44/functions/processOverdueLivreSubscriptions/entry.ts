import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyInternalCall } from '../../shared/internalCall.ts';

function dateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function previousDueDate(todayKey, dueDay) {
  const [year, month] = todayKey.split('-').map(Number);
  let due = new Date(Date.UTC(year, month - 1, dueDay));
  const today = new Date(`${todayKey}T00:00:00Z`);
  if (due >= today) due = new Date(Date.UTC(year, month - 2, dueDay));
  return due.toISOString().slice(0, 10);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyInternalCall(req, body)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = dateKey();
    const profiles = await base44.asServiceRole.entities.Locksmith.filter({ work_mode: 'livre' }, '-created_date', 500);
    const changed = [];

    for (const profile of profiles) {
      const dueDate = previousDueDate(today, Number(profile.monthly_fee_due_day) || 1);
      const createdDate = dateKey(profile.created_date);
      if (createdDate >= dueDate) continue;

      const lastPaid = profile.monthly_fee_last_paid || '';
      const covered = profile.monthly_fee_paid === true && (
        lastPaid >= dueDate || lastPaid.slice(0, 7) === dueDate.slice(0, 7)
      );
      if (covered) continue;

      changed.push({ id: profile.id, name: profile.name, due_date: dueDate });
      if (!body.dry_run) {
        await base44.asServiceRole.entities.Locksmith.update(profile.id, {
          work_mode: 'app',
          monthly_fee_paid: false,
          receive_app_requests: true,
        });
      }
    }

    return Response.json({ checked: profiles.length, changed, dry_run: body.dry_run === true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}