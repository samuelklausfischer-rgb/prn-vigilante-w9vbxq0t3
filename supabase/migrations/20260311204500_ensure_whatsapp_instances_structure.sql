-- Ensure the whatsapp_instances table structure is ready for webhook synchronization
-- and guarantees slot_id remains the unique identifier constraint.

DO $$ 
BEGIN
    -- Verify and enforce unique constraint on slot_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'whatsapp_instances_slot_id_key'
    ) THEN
        ALTER TABLE public.whatsapp_instances ADD CONSTRAINT whatsapp_instances_slot_id_key UNIQUE (slot_id);
    END IF;
END $$;
