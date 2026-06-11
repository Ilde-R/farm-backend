import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MAIN_TENANT_ID } from './tenant.seed';

export async function seedUsers(prisma: PrismaClient) {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { tenantId: MAIN_TENANT_ID },
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      tenantId: MAIN_TENANT_ID,
    },
  });
  
  console.log('Usuario admin creado y enlazado al tenant principal.');
}
