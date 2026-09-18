import { base44 } from "@/api/base44Client";

// Busca as avaliações de um chaveiro (mais recentes primeiro)
export async function getReviews(locksmithId) {
  return base44.entities.Review.filter({ locksmith_id: locksmithId }, "-created_date");
}

// Cria uma avaliação e recalcula a nota média do chaveiro (validação server-side)
export async function submitReview({
  locksmithId,
  locksmithName,
  rating,
  comment,
  serviceType,
  workMode,
  customerName,
  serviceRequestId,
}) {
  try {
    await base44.functions.invoke("serviceTrust", {
      action: "submit_review",
      locksmith_id: locksmithId,
      locksmith_name: locksmithName,
      rating,
      comment,
      service_type: serviceType,
      work_mode: workMode,
      customer_name: customerName,
      service_request_id: serviceRequestId,
    });
  } catch (err) {
    const data = err?.response?.data || err?.data || err;
    throw new Error(data?.error || err?.message || "Não foi possível enviar a avaliação.");
  }
}