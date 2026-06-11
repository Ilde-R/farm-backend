import { PaginatedResult } from "../interface/paginated-result.interface";
export declare function buildPaginatedResponse<T>(data: T[], totalCount: number, page: number, limit: number): PaginatedResult<T>;
