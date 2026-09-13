import { ApiProperty } from "@nestjs/swagger";
import { TanksStatus } from "@prisma/client";
import { IsNumber } from "class-validator";

export class CreateTankDto {
    @ApiProperty()
    @IsNumber()
    tankNumber!: number;

    @ApiProperty ({ enum: TanksStatus })
    tankStatus!: TanksStatus;
}
