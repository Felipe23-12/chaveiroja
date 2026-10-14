import { isAppleReviewRequest } from './appleReviewPolicy.ts';

export const UNANSWERED_REQUEST_MS = 10 * 60000;
export const UNANSWERED_REQUEST_REASON = 'Nenhum chaveiro aceitou em 10 minutos. O chamado foi encerrado automaticamente, sem taxa.';

export function unansweredRequestExpired(request, now = Date.now()) {
  return !isAppleReviewRequest(request) && ['searching', 'ringing'].includes(request?.status) &&
    !request.accepted_at && Date.parse(request.created_date) + UNANSWERED_REQUEST_MS <= now;
}

export async function expireUnansweredRequest(base44, requestId, dryRun = false) {
  const entity = base44.asServiceRole.entities.ServiceRequest;
  const request = await entity.get(requestId);
  if (!request) return { skipped: true, reason: 'not_found' };
  // A retry completes publication if the atomic close succeeded earlier.
  if (request.status === 'cancelled' && request.cancelled_by === 'sistema' && !request.cancellation_reason && !isAppleReviewRequest(request)) {
    if (!dryRun) await entity.update(requestId, { cancellation_reason: UNANSWERED_REQUEST_REASON });
    return { expired: true, dry_run: dryRun };
  }
  if (!unansweredRequestExpired(request)) return { skipped: true, reason: 'not_due_or_already_accepted' };
  if (dryRun) return { dry_run: true, would_expire: true };
  const result = await entity.updateMany({
    id: requestId, status: { $in: ['searching', 'ringing'] },
    created_date: { $lte: new Date(Date.now() - UNANSWERED_REQUEST_MS).toISOString() },
    accepted_at: { $in: [null, ''] }, apple_review: { $ne: true },
  }, { $set: {
    status: 'cancelled', cancelled_by: 'sistema',
    cancellation_fee: 0, cancellation_locksmith_amount: 0, cancellation_app_fee: 0,
    ringing_locksmith_ids: [], ringing_locksmith_user_ids: [],
  } });
  if (result.updated !== 1) return { skipped: true, reason: 'request_changed' };
  // Bulk operations do not publish events; publish the reason separately so
  // realtime screens and the existing notification workflow see the closure.
  await entity.update(requestId, { cancellation_reason: UNANSWERED_REQUEST_REASON });
  return { expired: true };
}