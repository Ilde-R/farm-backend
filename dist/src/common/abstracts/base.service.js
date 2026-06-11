"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const common_1 = require("@nestjs/common");
class BaseService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async create(createDto) {
        return this.repository.create(createDto);
    }
    async findAll(pagination) {
        return this.repository.findAll(pagination);
    }
    async findOne(id) {
        const record = await this.repository.findOne(id);
        if (!record) {
            throw new common_1.NotFoundException();
        }
        return record;
    }
    async update(id, updateDto) {
        await this.findOne(id);
        return this.repository.update(id, updateDto);
    }
    async remove(id) {
        await this.findOne(id);
        return this.repository.remove(id);
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map