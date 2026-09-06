-- CreateIndex
CREATE INDEX "device_key_blowerConfigId_idx" ON "device_key"("blowerConfigId");

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pressure_reading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blower_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_key" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions on public schema tables from public/anon/authenticated roles
-- to ensure they can ONLY be accessed by NestJS via the postgres master role.
REVOKE ALL ON "credentials" FROM anon, authenticated;
REVOKE ALL ON "device_key" FROM anon, authenticated;
REVOKE ALL ON "sessions" FROM anon, authenticated;
REVOKE ALL ON "users" FROM anon, authenticated;
REVOKE ALL ON "tenants" FROM anon, authenticated;
REVOKE ALL ON "blower_config" FROM anon, authenticated;
REVOKE ALL ON "pressure_reading" FROM anon, authenticated;
