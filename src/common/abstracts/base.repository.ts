import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly model: any,
    protected readonly defaultSelect?: any,
  ) {}

  async create(data: CreateDto): Promise<T> {
    return this.model.create({
      data,
      select: this.defaultSelect,
    });
  }

  async findAll(pagination: PaginationQueryDto, extraFilter?: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.defaultSelect,
      }),
      this.model.count({}),
    ]);

    return { items, total };
  }

  async findOne(id: string): Promise<T | null> {
    return this.model.findFirst({
      where: { id },
      select: this.defaultSelect,
    });
  }

  async update(id: string, data: UpdateDto): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      select: this.defaultSelect,
    });
  }

  async remove(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
    });
  }
}
