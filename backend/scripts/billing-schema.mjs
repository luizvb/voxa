export const REQUIRED_BILLING_COLUMNS = [
  'subscription_period_start',
  'subscription_period_end',
  'subscription_cancel_at_period_end',
  'subscription_grace_until',
  'subscription_provider_updated_at',
  'subscription_provider_event_id',
  'billing_reconciliation_required',
  'checkout_pending_until',
  'checkout_pending_token',
];

export async function missingBillingSchema(client) {
  const columns = await client.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'users'
        AND column_name = ANY($1::text[])`,
    [REQUIRED_BILLING_COLUMNS],
  );
  const found = new Set(columns.rows.map((row) => row.column_name));
  const missing = REQUIRED_BILLING_COLUMNS
    .filter((column) => !found.has(column))
    .map((column) => `users.${column}`);

  const receipts = await client.query(
    `SELECT to_regclass(current_schema() || '.stripe_event_receipts') IS NOT NULL AS present`,
  );
  if (!receipts.rows[0]?.present) missing.push('stripe_event_receipts');
  return missing;
}
