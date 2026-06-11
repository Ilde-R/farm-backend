import { PaginationQueryDto } from '../dto/pagination-query.dto';
export declare abstract class BaseRepository<T, CreateDto, UpdateDto> {
    protected readonly model: any;
    protected readonly defaultSelect?: any | undefined;
    constructor(model: any, defaultSelect?: any | undefined);
    create(data: CreateDto): Promise<T>;
    findAll(pagination: PaginationQueryDto, extraFilter?: any): Promise<{
        items: any;
        total: any;
    }>;
    findOne(id: string): Promise<T | null>;
    update(id: string, data: UpdateDto): Promise<T>;
    remove(id: string): Promise<T>;
}
