import { Controller, Post, Body } from '@nestjs/common';
import { SensorsService } from './sensors.service';

@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post('register-blower')
  async registerBlower(@Body() body: { tenantId: string; blowerId: string }) {
    const config = await this.sensorsService.registerBlower(
      body.tenantId,
      body.blowerId,
    );

    return {
      blowerConfigId: config.id,
      blowerId: config.blowerId,
      currentThreshold: config.currentThreshold,
    };
  }
}
