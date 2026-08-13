-- Admin-generated invoice metadata and sequential invoice numbering.
ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS invoice_document_type TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_due_date DATE,
  ADD COLUMN IF NOT EXISTS invoice_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_company_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_branch_address TEXT,
  ADD COLUMN IF NOT EXISTS invoice_beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_iban TEXT,
  ADD COLUMN IF NOT EXISTS invoice_bic TEXT,
  ADD COLUMN IF NOT EXISTS invoice_description TEXT,
  ADD COLUMN IF NOT EXISTS invoice_quantity NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS invoice_unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS invoice_tax_rate NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS invoice_total_amount NUMERIC(10, 2);

CREATE UNIQUE INDEX IF NOT EXISTS revenue_invoice_number_unique
  ON public.revenue (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.revenue_invoice_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.next_revenue_invoice_number()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'INV-' || LPAD(nextval('public.revenue_invoice_number_seq')::TEXT, 4, '0');
$$;

REVOKE ALL ON FUNCTION public.next_revenue_invoice_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_revenue_invoice_number() TO service_role;
