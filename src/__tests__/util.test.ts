import { test, expect } from 'vitest'
import * as M from '../util'

test.each([
  ['foo/bar', 'foo/bar'],
  ['/foo/bar', 'foo/bar'],
  ['foo/bar/', 'foo/bar/'],
  ['foo//bar', 'foo/bar'],
  ['.', ''],
  ['./', ''],
  ['././', ''],
  ['..', ''],
  ['../', ''],
  ['../../', ''],
  ['././foo/bar', 'foo/bar'],
  ['/././foo/bar', 'foo/bar'],
  ['../foo/bar', 'foo/bar'],
  ['../foo/..', ''],
  ['../foo/../', ''],
  ['foo/../bar', 'bar'],
  ['foo/bar/..', 'foo/'],
  ['foo/bar/../', 'foo/'],
  ['foo/../bar/../baz', 'baz'],
  ['foo/../../../bar', 'bar'],
  ['foo/./././bar', 'foo/bar'],
  ['foo/bar?x/baz', 'foo/bar?x/baz'],
  ['foo/bar?x/../baz', 'foo/baz'],
  ['foo/bar#x/baz', 'foo/bar#x/baz'],
  ['foo/bar#x/../baz', 'foo/baz'],
  ['あ/い/う', 'あ/い/う'],
  ['あ/../い/../う', 'う']
])('normalizePath(%o)', (arg, expected) => {
  expect(M.normalizePath(arg)).toBe(expected)
})
