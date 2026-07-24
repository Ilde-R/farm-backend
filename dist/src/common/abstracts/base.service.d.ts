import { BaseRepository } from './base.repository';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
export declare abstract class BaseService<T, CreateDto, UpdateDto> {
    protected readonly userRepository: BaseRepository<T, CreateDto, UpdateDto>;
    constructor(userRepository: BaseRepository<T, CreateDto, UpdateDto>);
    create(createDto: CreateDto): Promise<T>;
    findAll(pagination: PaginationQueryDto): Promise<{
        items: any;
        total: any;
    }>;
    findOne(id: string): Promise<T>;
    update(id: string, updateDto: UpdateDto): Promise<T>;
    remove(id: string): Promise<T>;
}
