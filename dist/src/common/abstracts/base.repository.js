"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    model;
    defaultSelect;
    constructor(model, defaultSelect) {
        this.model = model;
        this.defaultSelect = defaultSelect;
    }
    async create(data) {
        return this.model.create({
            data,
            select: this.defaultSelect,
        });
    }
    async findAll(pagination, extraFilter) {
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
    async findOne(id) {
        return this.model.findFirst({
            where: { id },
            select: this.defaultSelect,
        });
    }
    async update(id, data) {
        return this.model.update({
            where: { id },
            data,
            select: this.defaultSelect,
        });
    }
    async remove(id) {
        return this.model.delete({
            where: { id },
        });
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base.repository.js.map