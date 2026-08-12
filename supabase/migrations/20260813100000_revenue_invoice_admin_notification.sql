-- Store invoice details and admin notification state on revenue records.
ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS inform_admin_for_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_owner_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_owner_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_client_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_client_id TEXT,
  ADD COLUMN IF NOT EXISTS admin_invoice_notified BOOLEAN NOT NULL DEFAULT FALSE;
