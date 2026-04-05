-- Backfill: create profile rows for any existing auth.users who don't have one yet.
-- The first migration only seeded the earliest user; this catches everyone else.
-- All existing users get super_admin since they were manually created before RBAC.

INSERT INTO profiles (id, role, display_name)
SELECT
  u.id,
  'super_admin',
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'Admin')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);
