"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const common_1 = require("@nestjs/common");
class BaseService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async create(createDto) {
        return this.userRepository.create(createDto);
    }
    async findAll(pagination) {
        return this.userRepository.findAll(pagination);
    }
    async findOne(id) {
        const record = await this.userRepository.findOne(id);
        if (!record) {
            throw new common_1.NotFoundException();
        }
        return record;
    }
    async update(id, updateDto) {
        try {
            return await this.userRepository.update(id, updateDto);
        }
        catch (error) {
            if (error?.code === 'P2025') {
                throw new common_1.NotFoundException();
            }
            throw error;
        }
    }
    async remove(id) {
        try {
            return await this.userRepository.remove(id);
        }
        catch (error) {
            if (error?.code === 'P2025') {
                throw new common_1.NotFoundException();
            }
            throw error;
        }
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map