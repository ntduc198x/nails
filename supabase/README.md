# Supabase SQL layout

## Canonical deploy

- `deploy.sql`
  - file deploy chuẩn duy nhất
  - chứa schema, RLS, RPC, indexes, invite codes, landing booking, storage setup

## Legacy

Các file trong `legacy/` chỉ để tham chiếu lịch sử, backfill, smoke test, hoặc patch tạm.
Không dùng như bộ deploy chuẩn mới.

## Ghi chú

- `remove_dev_role.sql` đã được chạy xong và đã bỏ khỏi bộ chuẩn.
- Nếu cần setup môi trường mới, ưu tiên chạy `deploy.sql`.
