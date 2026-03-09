-- Robust remediation for duplicate CLOSED tickets per appointment_id
-- Keeps 1 latest CLOSED ticket and converts the rest to VOID.

-- 0) Inspect duplicates before fixing
SELECT appointment_id, COUNT(*) AS closed_count
FROM public.tickets
WHERE appointment_id IS NOT NULL
  AND status = 'CLOSED'
GROUP BY appointment_id
HAVING COUNT(*) > 1;

-- 1) Preview exactly which rows will be voided
WITH ranked AS (
  SELECT
    id,
    appointment_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id
      ORDER BY created_at DESC, id::text DESC
    ) AS rn
  FROM public.tickets
  WHERE appointment_id IS NOT NULL
    AND status = 'CLOSED'
)
SELECT id, appointment_id, created_at
FROM ranked
WHERE rn > 1
ORDER BY appointment_id, created_at DESC;

-- 2) Apply fix
WITH ranked AS (
  SELECT
    id,
    appointment_id,
    ROW_NUMBER() OVER (
      PARTITION BY appointment_id
      ORDER BY created_at DESC, id::text DESC
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
WHERE t.id IN (SELECT id FROM to_void)
RETURNING t.id, t.appointment_id, t.status;

-- 3) Verify result must be empty
SELECT appointment_id, COUNT(*) AS closed_count
FROM public.tickets
WHERE appointment_id IS NOT NULL
  AND status = 'CLOSED'
GROUP BY appointment_id
HAVING COUNT(*) > 1;
