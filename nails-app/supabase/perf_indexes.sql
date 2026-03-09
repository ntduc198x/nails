-- Performance indexes cho truy vấn dashboard/reports/checkout

create index if not exists idx_tickets_org_created_at on tickets (org_id, created_at desc);
create index if not exists idx_tickets_org_status_created on tickets (org_id, status, created_at desc);
create index if not exists idx_appointments_org_start_at on appointments (org_id, start_at);
create index if not exists idx_appointments_org_status_start on appointments (org_id, status, start_at);
create index if not exists idx_ticket_items_ticket_id on ticket_items (ticket_id);
create index if not exists idx_payments_ticket_id on payments (ticket_id);
create index if not exists idx_receipts_ticket_id on receipts (ticket_id, created_at desc);
create index if not exists idx_time_entries_org_clockin on time_entries (org_id, clock_in desc);
