-- Add checked_in_at column to track when customer actually checked in
alter table public.appointments
  add column if not exists checked_in_at timestamptz;

-- Create index for faster queries on checked_in_at
create index if not exists idx_appointments_checked_in_at
  on appointments (org_id, checked_in_at)
  where checked_in_at is not null;

-- Update trigger to set checked_in_at when status changes to CHECKED_IN
CREATE OR REPLACE FUNCTION set_appointment_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CHECKED_IN' AND OLD.status != 'CHECKED_IN' THEN
    NEW.checked_in_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS set_appointment_timestamps_trigger ON public.appointments;

CREATE TRIGGER set_appointment_timestamps_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_timestamps();