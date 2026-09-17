const cents = (value) => Math.round(Number(value) * 100);

// Derive the credit on the payment itself: repeated notifications never add balance.
export function pendingCreditUpdate(localPayment, providerPayment) {
  if (localPayment.collection_mode !== "platform_pending") return {};
  const status = providerPayment.status;
  const gross = cents(providerPayment.transaction_amount);
  const refunded = cents(providerPayment.transaction_amount_refunded || 0);
  if (["refunded", "cancelled", "rejected", "charged_back"].includes(status)) {
    return { pending_transfer_amount: 0, transfer_status: "reversed" };
  }
  if (refunded > 0 || status === "in_mediation") {
    return { pending_transfer_amount: 0, transfer_status: "under_review" };
  }
  if (status !== "approved") return { pending_transfer_amount: 0, transfer_status: "awaiting_payment" };
  const net = providerPayment.transaction_details?.net_received_amount;
  if (net === undefined || net === null || !Number.isFinite(Number(net)) || cents(net) < 0 || cents(net) > gross) {
    return { pending_transfer_amount: 0, transfer_status: "under_review" };
  }
  const fee = gross - cents(net);
  return {
    provider_fee_amount: fee / 100,
    pending_transfer_amount: Math.max(0, cents(localPayment.net_amount) - fee) / 100,
    transfer_status: "pending",
  };
}

export async function readPendingCredits(base44, user, page) {
  const filter = { provider: "mercado_pago", collection_mode: "platform_pending", transfer_status: { $in: ["pending", "under_review"] } };
  if (user.role !== "admin") {
    if (user.account_type !== "chaveiro") return null;
    const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id }, "id", 1);
    if (!profiles[0]) return { total: 0, count: 0, review_count: 0, items: [], page, has_more: false };
    filter.locksmith_id = profiles[0].id;
  }
  let cursor = "", totalCents = 0, count = 0, reviewCount = 0, seen = 0;
  const items = [];
  while (true) {
    const rows = await base44.asServiceRole.entities.Payment.filter({ ...filter, ...(cursor ? { id: { $gt: cursor } } : {}) }, "id", 200);
    for (const p of rows) {
      if (p.transfer_status === "pending" && p.status !== "paid") continue;
      if (p.transfer_status === "pending") { totalCents += cents(p.pending_transfer_amount || 0); count += 1; }
      else reviewCount += 1;
      if (seen >= page * 20 && items.length < 20) items.push({ id: p.id, locksmith_id: p.locksmith_id, service_request_id: p.service_request_id, locksmith_name: p.locksmith_name, amount: p.pending_transfer_amount || 0, gross: p.amount, commission: p.commission_amount, fee: p.provider_fee_amount, date: p.captured_at || p.created_date, status: p.transfer_status });
      seen += 1;
    }
    if (rows.length < 200) break;
    cursor = rows[rows.length - 1].id;
  }
  return { total: totalCents / 100, count, review_count: reviewCount, items, page, has_more: seen > (page + 1) * 20 };
}