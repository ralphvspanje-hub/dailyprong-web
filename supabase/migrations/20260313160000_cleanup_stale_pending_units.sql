UPDATE units
SET is_pending_feedback = false
WHERE is_pending_feedback = true
  AND cycle_id NOT IN (
    SELECT id FROM cycles WHERE status = 'active'
  );
