-- Fix clients table ID sequence to continue from the highest existing ID + 1
-- This ensures new clients get the next sequential ID

-- First, check the current maximum ID in the clients table
SELECT MAX(id) as max_id FROM clients;

-- Reset the sequence to start from the maximum ID + 1
-- This ensures that the next inserted record gets the correct sequential ID
SELECT setval(pg_get_serial_sequence('clients', 'id'), 
              (SELECT COALESCE(MAX(id), 0) + 1 FROM clients), 
              false);

-- Simple verification query (doesn't rely on currval)
SELECT pg_get_serial_sequence('clients', 'id') as sequence_name,
       last_value as current_last_value 
FROM clients_id_seq;