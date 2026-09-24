import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

export const SECOND_JOB_MAX_DISTANCE_KM = 20;

export async function getLocksmithQueueState(locksmithId) {
  if (!locksmithId) return { active: null, queued: null };
  const jobs = await base44.entities.ServiceRequest.filter({ locksmith_id: locksmithId, status: { $in: ["accepted", "on_the_way", "queued"] } }, "accepted_at", 20);
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
  if (!locksmithId) return null;
  const { data } = await base44.functions.invoke("serviceTrust", {
    action: "start_next_queued",
    locksmith_id: locksmithId,
  });
  return data?.request || null;
}