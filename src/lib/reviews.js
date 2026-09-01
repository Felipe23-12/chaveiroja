import { base44 } from "@/api/base44Client";

// Busca as avaliações de um chaveiro (mais recentes primeiro)
export async function getReviews(locksmithId) {
  return base44.entities.Review.filter({ locksmith_id: locksmithId }, "-created_date");
}

// Cria uma avaliação e recalcula a nota média do chaveiro
export async function submitReview({
  locksmithId,
  locksmithName,
  rating,
  comment,
  serviceType,
  workMode,
  customerName,
}) {
  await base44.entities.Review.create({
    locksmith_id: locksmithId,
    locksmith_name: locksmithName,
    customer_name: customerName || "Cliente",
    rating,
    comment,
    service_type: serviceType,
    work_mode: workMode,
  });

  const reviews = await base44.entities.Review.filter({ locksmith_id: locksmithId });
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  await base44.entities.Locksmith.update(locksmithId, {
    rating: Math.round(avg * 10) / 10,
    reviews_count: reviews.length,
  });
}