export declare class CreateSensorDto {
    psi: number;
    blowerId?: string;
    tenantId?: string;
    blowerConfigId?: string;
    isAlert?: boolean;
    currentThreshold?: number;
    deviceTs?: number;
    deviceTime?: Date;
    source?: string;
}
