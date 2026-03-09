-- Resolve duplicate CLOSED tickets by appointment before creating unique index
-- Keep newest CLOSED ticket per appointment_id, mark older ones as VOID.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    appointment_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.tickets
  WHERE appointment_id IS NOT NULL
    AND status = 'CLOSED'
), to_void AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE public.tickets t
SET status = 'VOID'
WHERE t.id IN (SELECT id FROM to_void);

COMMIT;

-- Verify no duplicates remain
SELECT appointment_id, COUNT(*) AS closed_count
FROM public.tickets
WHERE appointment_id IS NOT NULL
  AND status = 'CLOSED'
GROUP BY appointment_id
HAVING COUNT(*) > 1;
