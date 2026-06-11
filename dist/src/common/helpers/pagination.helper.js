"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginatedResponse = buildPaginatedResponse;
function buildPaginatedResponse(data, totalCount, page, limit) {
    return {
        data,
        meta: {
            totalItems: totalCount,
            itemCount: data.length,
            itemsPerPage: limit,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
        },
    };
}
//# sourceMappingURL=pagination.helper.js.map