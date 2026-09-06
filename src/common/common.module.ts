import { Global, Module } from '@nestjs/common';
import { DeviceConnectionRegistry } from './device-connection.registry';

@Global()
@Module({
  providers: [DeviceConnectionRegistry],
  exports: [DeviceConnectionRegistry],
})
export class CommonModule {}
