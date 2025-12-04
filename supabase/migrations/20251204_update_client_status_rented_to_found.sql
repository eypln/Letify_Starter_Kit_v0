-- Migration: Update client status from "Rented" to "Found"
-- Date: 2025-12-04
-- Purpose: Rename status value from "Rented" to "Found" for better clarity

-- Step 1: Drop the existing check constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Step 2: Update existing clients with status "Rented" to "Found"
UPDATE clients
SET status = 'Found'
WHERE status = 'Rented';

-- Step 3: Add new check constraint with updated values
ALTER TABLE clients
ADD CONSTRAINT clients_status_check
CHECK (status IN ('Urgent', 'Looking', 'Found'));

-- Step 4: Add comment to explain the status values
COMMENT ON COLUMN clients.status IS 'Client status: Urgent, Looking, or Found';
