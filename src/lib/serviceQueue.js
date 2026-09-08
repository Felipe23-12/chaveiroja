import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

export const SECOND_JOB_MAX_DISTANCE_KM = 20;

export async function getLocksmithQueueState(locksmithId) {
  const jobs = await base44.entities.ServiceRequest.filter({ locksmith_id: locksmithId }, "accepted_at", 20);
  return {
    active: jobs.find((r) => r.status === "accepted" || r.status === "on_the_way") || null,
    queued: jobs.find((r) => r.status === "queued") || null,
  };
}

export function canReceiveWhileBusy(request, state) {
  if (!state.active) return true;
  if (state.queued || request.urgency === "urgent") return false;
  if (!state.active.customer_lat || !request.customer_lat) return false;
  return haversineKm(
    { lat: state.active.customer_lat, lng: state.active.customer_lng },
    { lat: request.customer_lat, lng: request.customer_lng }
  ) <= SECOND_JOB_MAX_DISTANCE_KM;
}

export function filterRingableWhileBusy(requests, state) {
  return requests.filter((request) => canReceiveWhileBusy(request, state));
}

export async function startNextQueuedRequest(locksmithId, location) {
  const queued = await base44.entities.ServiceRequest.filter(
    { locksmith_id: locksmithId, status: "queued" },
    "accepted_at",
    1
  );
  if (!queued[0]) return null;
  return base44.entities.ServiceRequest.update(queued[0].id, {
    status: "on_the_way",
    locksmith_lat: location?.lat,
    locksmith_lng: location?.lng,
  });
}