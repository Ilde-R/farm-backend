import { BaseRepository } from '../../../common/abstracts/base.repository';
import { CreateSensorDto } from '../dto/create-sensor.dto';
import { UpdateSensorDto } from '../dto/update-sensor.dto';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class SensorsRepository extends BaseRepository<any, CreateSensorDto, UpdateSensorDto> {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsertBlowerConfig(tenantId: string, blowerId: string, currentThreshold?: number): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    }>;
    updateBlowerThreshold(blowerConfigId: string, threshold: number): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    }>;
    getBlowerConfig(blowerId: string): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    } | null>;
    getFirstBlowerConfig(): Promise<{
        id: string;
        name: string | null;
        tenantId: string;
        blowerId: string;
        currentThreshold: number;
    } | null>;
    createReading(data: any): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        blowerConfigId: string | null;
        psi: number;
        isAlert: boolean;
    }>;
}
