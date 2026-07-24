export interface CreateSensorDto {
    psi: number;
    blowerId?: string;
    tenantId?: string;
    blowerConfigId?: string;
    isAlert?: boolean;
    currentThreshold?: number;
}
