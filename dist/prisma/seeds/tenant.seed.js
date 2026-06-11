"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIN_TENANT_ID = void 0;
exports.seedTenants = seedTenants;
exports.MAIN_TENANT_ID = '11111111-1111-1111-1111-111111111111';
async function seedTenants(prisma) {
    await prisma.tenant.upsert({
        where: { id: exports.MAIN_TENANT_ID },
        update: {},
        create: {
            id: exports.MAIN_TENANT_ID,
            name: 'Granja Principal',
            isActive: true,
        },
    });
    console.log(`Tenant creado con ID: ${exports.MAIN_TENANT_ID}`);
}
//# sourceMappingURL=tenant.seed.js.map