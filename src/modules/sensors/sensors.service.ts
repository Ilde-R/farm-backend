import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';

@Injectable()
export class SensorsService extends BaseService<
  any,
  CreateSensorDto,
  UpdateSensorDto
> {
  constructor(private readonly sensorsRepository: SensorsRepository) {
    super(sensorsRepository);
  }

  async registerBlower(tenantId: string, blowerId: string) {
    const config = await this.sensorsRepository.upsertBlowerConfig(
      tenantId,
      blowerId,
    );
    console.log(`Soplador registrado: ${blowerId} -> configId: ${config.id}`);
    return config;
  }

  // Mapas para controlar la frecuencia de guardado en la base de datos
  private lastSaveTime: Map<string, number> = new Map();
  private lastAlertState: Map<string, boolean> = new Map();

  // Paso 2: El Arduino manda lecturas en TIEMPO REAL (ej. cada 2 segundos)
  async create(data: CreateSensorDto) {
    if (!data.blowerConfigId || !data.tenantId || !data.blowerId) {
      console.error('Faltan datos requeridos. Datos recibidos:', data);
      return null;
    }

    const currentThreshold = data.currentThreshold ?? 2.0;
    const isAlert = data.psi <= currentThreshold;

    if (isAlert) {
      console.log(`¡ALERTA! Soplador perdió presión: ${data.psi} PSI`);
    }

    // Actualizamos el umbral en la config si viene
    if (data.currentThreshold !== undefined) {
      await this.sensorsRepository.updateBlowerThreshold(
        data.blowerConfigId,
        data.currentThreshold,
      );
    }

    const now = Date.now();
    const blowerId = data.blowerId;
    const lastSave = this.lastSaveTime.get(blowerId) || 0;
    const lastAlert = this.lastAlertState.get(blowerId) ?? false;
    
    const alertChanged = isAlert !== lastAlert;
    
    // GUARDAR EN BASE DE DATOS SOLO SI:
    // 1. Pasaron 5 minutos desde el último guardado (300,000 ms)
    // 2. O el estado de alerta cambió (entró en alarma o se recuperó)
    if (now - lastSave >= 300000 || alertChanged) {
      this.lastSaveTime.set(blowerId, now);
      this.lastAlertState.set(blowerId, isAlert);

      return this.sensorsRepository.createReading({
        tenant: { connect: { id: data.tenantId } },
        blowerConfig: { connect: { id: data.blowerConfigId } },
        psi: data.psi,
        isAlert: isAlert,
      });
    }

    // Retornamos null para indicar que NO se guardó en BD, 
    // pero el Gateway igual lo va a retransmitir por WebSocket
    return null;
  }

  async getLatestThreshold(blowerId?: string): Promise<number> {
    if (blowerId) {
      const config = await this.sensorsRepository.getBlowerConfig(blowerId);
      return config?.currentThreshold ?? 2.0;
    } else {
      const config = await this.sensorsRepository.getFirstBlowerConfig();
      return config?.currentThreshold ?? 2.0;
    }
  }
}
