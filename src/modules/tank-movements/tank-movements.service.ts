import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { CreateStockOutflowDto } from './dto/create-stock-outflow.dto';
import { TankMovementsQueryDto } from './dto/tank-movements-query.dto';
import { TankMovementsRepository } from './tank-movements.repository';

@Injectable()
export class TankMovementsService {
  constructor(
    private readonly tankMovementsRepository: TankMovementsRepository,
  ) {}

  async createTransfer(dto: CreateTransferDto, tenantId: string) {
    return this.tankMovementsRepository.createTransfer(dto, tenantId);
  }

  async createStockOutflow(dto: CreateStockOutflowDto, tenantId: string) {
    return this.tankMovementsRepository.createStockOutflow(dto, tenantId);
  }

  async findForTank(
    tankId: string,
    query: TankMovementsQueryDto,
    tenantId: string,
  ) {
    if ((query.from && !query.to) || (!query.from && query.to)) {
      throw new BadRequestException(
        'Debes proporcionar las fechas from y to juntas',
      );
    }

    if (query.from && query.to && query.from >= query.to) {
      throw new BadRequestException(
        'El inicio del intervalo debe ser anterior al final',
      );
    }

    const { tank, movements } = await this.tankMovementsRepository.findForTank(
      tankId,
      query,
      tenantId,
    );
    const incoming = new Map<
      string,
      {
        tankId: string;
        tankNumber: number;
        quantity: number;
        movements: typeof movements;
      }
    >();
    const outgoing = new Map<
      string,
      {
        tankId: string;
        tankNumber: number;
        quantity: number;
        movements: typeof movements;
      }
    >();
    const outgoingOther = new Map<
      string,
      {
        movementType: string;
        quantity: number;
        movements: typeof movements;
      }
    >();

    for (const movement of movements) {
      const isIncoming = movement.destinationTankId === tankId;
      if (!isIncoming && movement.movementType !== 'transfer') {
        const group = outgoingOther.get(movement.movementType) ?? {
          movementType: movement.movementType,
          quantity: 0,
          movements: [],
        };
        group.quantity += movement.quantity;
        group.movements.push(movement);
        outgoingOther.set(movement.movementType, group);
        continue;
      }

      const otherTank = isIncoming
        ? movement.sourceTank
        : movement.destinationTank;

      if (!otherTank) {
        continue;
      }

      const groups = isIncoming ? incoming : outgoing;
      const group = groups.get(otherTank.id) ?? {
        tankId: otherTank.id,
        tankNumber: otherTank.tankNumber,
        quantity: 0,
        movements: [],
      };

      group.quantity += movement.quantity;
      group.movements.push(movement);
      groups.set(otherTank.id, group);
    }

    const incomingGroups = [...incoming.values()];
    const outgoingGroups = [...outgoing.values()];
    const otherOutgoingGroups = [...outgoingOther.values()];

    return {
      tank,
      incoming: {
        totalQuantity: incomingGroups.reduce(
          (total, group) => total + group.quantity,
          0,
        ),
        fromTanks: incomingGroups,
      },
      outgoing: {
        totalQuantity:
          outgoingGroups.reduce((total, group) => total + group.quantity, 0) +
          otherOutgoingGroups.reduce(
            (total, group) => total + group.quantity,
            0,
          ),
        toTanks: outgoingGroups,
        otherMovements: otherOutgoingGroups,
      },
    };
  }
}
