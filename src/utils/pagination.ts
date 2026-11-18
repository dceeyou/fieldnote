export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  startIndex: number
  endIndex: number
  hasPrevious: boolean
  hasNext: boolean
}

/**
 * Pure, deterministic pagination helper.
 * Clamps page bounds safely so out-of-range page numbers never yield blank slices when data exists.
 */
export function paginateItems<T>(
  allItems: T[],
  requestedPage: number,
  requestedPageSize: number
): PaginatedResult<T> {
  const totalItems = allItems.length
  const pageSize = Math.max(1, Math.floor(requestedPageSize) || 25)
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(Math.max(1, Math.floor(requestedPage) || 1), totalPages)

  const startOffset = (page - 1) * pageSize
  const items = allItems.slice(startOffset, startOffset + pageSize)

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    startIndex: totalItems === 0 ? 0 : startOffset + 1,
    endIndex: startOffset + items.length,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  }
}
