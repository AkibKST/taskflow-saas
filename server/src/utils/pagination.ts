import { PAGINATION } from "@taskflow/shared";

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

/** Parse & clamp `page`/`limit` query params into safe pagination bounds. */
export const parsePagination = (query: {
  page?: unknown;
  limit?: unknown;
}): Pagination => {
  const page = Math.max(1, Number(query.page) || PAGINATION.DEFAULT_PAGE);
  const rawLimit = Number(query.limit) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const buildMeta = (total: number, p: Pagination) => ({
  total,
  page: p.page,
  limit: p.limit,
  totalPages: Math.ceil(total / p.limit),
});
