/**
 * Shared API utilities: pagination parsing, standard error responses.
 */

import { NextRequest, NextResponse } from 'next/server'

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200

export interface PaginationParams {
  skip: number
  take: number
  page: number
  pageSize: number
}

export function parsePagination(req: NextRequest): PaginationParams {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10))
  )
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
  /** Legacy key for backward compatibility (e.g. 'appointments', 'leads') */
  legacyKey?: string,
  /** Extra fields to include in response (e.g. { canCreateNew: true }) */
  extra?: Record<string, unknown>
) {
  const body: Record<string, unknown> = {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  }
  if (legacyKey) body[legacyKey] = data
  if (extra) Object.assign(body, extra)
  return NextResponse.json(body)
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
