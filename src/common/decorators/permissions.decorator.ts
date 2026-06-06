import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (module: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, { module, action });
