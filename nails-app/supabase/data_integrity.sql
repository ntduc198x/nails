-- Data integrity hardening (appointments + tickets)
-- Run this after schema.sql

-- 1) Appointment time range must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_time_range_check'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_time_range_check
      CHECK (end_at > start_at);
  END IF;
END $$;

-- 2) Status transition guard for appointments
CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- only validate when status actually changes
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'BOOKED' AND NEW.status IN ('CHECKED_IN', 'DONE', 'CANCELLED', 'NO_SHOW') THEN
    RETURN NEW;
  ELSIF OLD.status = 'CHECKED_IN' AND NEW.status IN ('DONE', 'CANCELLED', 'NO_SHOW') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_APPOINTMENT_STATUS_TRANSITION: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointment_status_transition ON public.appointments;

CREATE TRIGGER trg_enforce_appointment_status_transition
BEFORE UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_appointment_status_transition();

-- 3) Prevent duplicate closed tickets for same appointment
CREATE UNIQUE INDEX IF NOT EXISTS uq_closed_ticket_per_appointment
  ON public.tickets (appointment_id)
  WHERE appointment_id IS NOT NULL AND status = 'CLOSED';
