import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { BaseService } from '../../common/abstracts/base.service';
import { SensorsRepository } from './repositories/sensors.repository';
export declare class SensorsService extends BaseService<any, CreateSensorDto, UpdateSensorDto> {
    private readonly sensorsRepository;
    constructor(sensorsRepository: SensorsRepository);
    checkBlowerPressure(data: CreateSensorDto): Promise<any>;
}
