import { PrismaClient } from '@prisma/client';

export const MAIN_TENANT_ID = '11111111-1111-1111-1111-111111111111';

export async function seedTenants(prisma: PrismaClient) {
  await prisma.tenant.upsert({
    where: { id: MAIN_TENANT_ID },
    update: {},
    create: {
      id: MAIN_TENANT_ID,
      name: 'Granja Principal',
      isActive: true,
    },
  });
  console.log(`Tenant creado con ID: ${MAIN_TENANT_ID}`);
}
