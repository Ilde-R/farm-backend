import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DeviceTimeService } from './services/device-time.service';
import { IngestReadingDto } from './dto/ingest-reading.dto';
import { AerationsService } from './services/aeration.service';

@Injectable()
export class AerationsEventListener {
  private readonly logger = new Logger(AerationsEventListener.name);

  constructor(
    private readonly aerationsService: AerationsService,
    private readonly deviceTimeService: DeviceTimeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('device.reading_received')
  async processReading(payload: { data: any; clientInfo: any }) {

    const { data, clientInfo } = payload;

    try {
      // 2. Tipamos con IngestReadingDto
      const enriched: IngestReadingDto = {
        psi: data.psi ?? 0,
        blowerConfigId: clientInfo.blowerConfigId,
        tenantId: clientInfo.tenantId,
        blowerId: clientInfo.blowerId,
        deviceTs: data.ts,
        deviceTime: data.ts !== undefined && clientInfo?.blowerConfigId
            ? this.deviceTimeService.toRealTime(clientInfo.blowerConfigId, data.ts)
            : undefined,
      };

      // 3. Validamos usando IngestReadingDto
      const dto = plainToInstance(IngestReadingDto, enriched);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        this.logger.warn(`Invalid ESP32 data: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`);
        return; 
      }

      await this.aerationsService.createReading(dto);

      this.eventEmitter.emit('database.reading_saved', {
        tenantId: dto.tenantId,
        reading: dto
      });

    } catch (error) {
      this.logger.error(`Error saving reading: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}