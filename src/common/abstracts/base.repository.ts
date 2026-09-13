import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly model: any,
    protected readonly searchFields: string[] = [],
    protected readonly defaultSelect?: any,
  ) {}

  async create(data: CreateDto): Promise<T> {
    return this.model.create({
      data,
      select: this.defaultSelect,
    });
  }

  async findAll(pagination: PaginationQueryDto, extraFilter?: any) {
    const { page = 1, limit = 10, search, tenantId } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { ...extraFilter };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search && this.searchFields.length > 0) {
      where.OR = this.searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    const [items, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.defaultSelect,
      }),
      this.model.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string, tenantId: string): Promise<T | null> {
    return this.model.findFirst({
      where: { id, tenantId },
      select: this.defaultSelect,
    });
  }

  async update(id: string, tenantId: string, data: UpdateDto): Promise<T> {
    await this.model.updateMany({
      where: { id, tenantId },
      data,
    });
    return this.findOne(id, tenantId) as Promise<T>;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.model.deleteMany({
      where: { id, tenantId },
    });
  }
}
