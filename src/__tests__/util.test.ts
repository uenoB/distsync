import { test, expect } from 'vitest'
import * as M from '../util'

test.each([
  ['foo/bar', 'foo/bar'],
  ['/foo/bar', 'foo/bar'],
  ['foo/bar/', 'foo/bar/'],
  ['foo//bar', 'foo/bar'],
  ['foo/../bar', 'bar'],
  ['foo/../../../bar', 'bar'],
  ['foo/./././bar', 'foo/bar'],
  ['foo/bar?x/baz', 'foo/bar?x/baz'],
  ['foo/bar?x/../baz', 'foo/baz'],
  ['foo/bar#x/baz', 'foo/bar#x/baz'],
  ['foo/bar#x/../baz', 'foo/baz']
])('normalizePath(%o)', (arg, expected) => {
  expect(M.normalizePath(arg)).toBe(expected)
})

test.each([
  ['file:///', 'foo/bar', 'file:///foo/bar'],
  ['file:///foo', 'bar', 'file:///foo/bar'],
  ['file:///foo', '', 'file:///foo/'],
  ['file:///foo', '/bar', 'file:///bar']
])('joinURL(%o, %o)', (arg1, arg2, expected) => {
  expect(M.joinURL(new URL(arg1), arg2).href).toBe(expected)
})
