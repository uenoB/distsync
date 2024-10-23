export type Null = null | undefined
export type Awaitable<X> = Promise<X> | X
export type Arrayable<X> = readonly X[] | X | Null

export const isObject = (x: unknown): x is Record<string, unknown> =>
  x != null && typeof x === 'object'

export const toArray = (x: unknown): readonly unknown[] =>
  Array.isArray(x) ? x : x == null ? [] : [x]

export const mergeMap = <K, A extends readonly unknown[]>(
  ...maps: { [X in keyof A]: Map<K, A[X]> }
): Map<K, A[number]> => {
  const ret = new Map<K, A[number]>()
  for (const m of maps) {
    for (const [k, v] of m) ret.set(k, v as A[number])
  }
  return ret
}

export const normalizePath = (path: string): string => {
  let r = path
  r = r.replace(/\/+/g, '/')
  r = r.replace(/(^|\/)\.(?=\/|$)/g, '')
  r = r.replace(/^\/+/, '')
  while (/(?:^|\/)\.\.(?:\/|$)/.test(r)) {
    r = r.replace(/(^|\/(?!\.\.(?:\/|$)))(?:^|[^/]+\/)\.\.(?:\/|$)/g, '$1')
  }
  return r
}
