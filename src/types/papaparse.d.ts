declare module 'papaparse' {
  export interface ParseConfig<T = unknown> {
    delimiter?: string
    newline?: string
    quoteChar?: string
    escapeChar?: string
    header?: boolean
    transformHeader?: (header: string, index: number) => string
    dynamicTyping?: boolean
    preview?: number
    encoding?: string
    step?: (results: ParseStepResult<T>, parser: unknown) => void
    complete?: (results: ParseResult<T>, file?: unknown) => void
    error?: (error: unknown, file?: unknown) => void
    download?: boolean
    downloadRequestHeaders?: Record<string, string>
    skipEmptyLines?: boolean | 'greedy'
    fastMode?: boolean
    withCredentials?: boolean
  }

  export interface ParseError {
    type: string
    code: string
    message: string
    row: number
  }

  export interface ParseMeta {
    delimiter: string
    linebreak: string
    aborted: boolean
    fields?: string[]
    truncated: boolean
    cursor: number
  }

  export interface ParseResult<T = unknown> {
    data: T[]
    errors: ParseError[]
    meta: ParseMeta
  }

  export interface ParseStepResult<T = unknown> {
    data: T
    errors: ParseError[]
    meta: ParseMeta
  }

  export function parse<T = unknown>(
    input: string | File | NodeJS.ReadableStream,
    config?: ParseConfig<T>
  ): ParseResult<T>

  export function unparse(
    data: unknown[] | Record<string, unknown>,
    config?: Record<string, unknown>
  ): string

  const Papa: {
    parse: typeof parse
    unparse: typeof unparse
  }

  export default Papa
}
