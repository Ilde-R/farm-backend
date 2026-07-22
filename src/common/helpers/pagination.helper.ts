import { PaginatedResult } from '../interface/paginated-result.interface';

export function buildPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
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
