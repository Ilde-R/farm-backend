import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceTimeService {
  private offsets = new Map<string, number>();

  registrarDeviceInfo(blowerConfigId: string, uptimeMs: number) {
    const offset = Date.now() - uptimeMs;
    this.offsets.set(blowerConfigId, offset);
  }

  toRealTime(blowerConfigId: string, deviceTs: number): Date | undefined {
    const offset = this.offsets.get(blowerConfigId);
    if (offset == null) return undefined;
    return new Date(offset + deviceTs);
  }

  clearDeviceInfo(blowerConfigId: string) {
    this.offsets.delete(blowerConfigId);
  }
}
