import * as fs from 'node:fs'
import * as crypto from 'node:crypto'
import pc from 'picocolors'
import type { Config, Source, Rule } from './config'
import type { Connection } from './connect'
import { type Data, fromBuffer } from './data'
import { listFiles } from './files'
import { brotli, unbrotli } from './brotli'
import { isObject, normalizePath } from './util'

interface ExportableAsset {
  readonly size: number
  readonly mode: number
  readonly mtime: number
  readonly hash: string
}

interface RemoteAsset extends ExportableAsset {
  readonly diff?: 'remove'
  readonly content?: undefined
}

export interface LocalAsset {
  readonly localName: string
  readonly size: number
  readonly mode: number
  readonly mtime: number
  readonly diff?: 'update'
  readonly content: Readonly<URL>
  readonly source: Source
}

interface UnmodifiedAsset extends ExportableAsset {
  readonly diff: 'keep'
  readonly content?: undefined
}

export interface LoadedLocalAsset extends ExportableAsset {
  readonly localName: string
  readonly diff: 'update'
  readonly content: Readonly<URL> | Data
  readonly source: Source
}

export type UploadableAsset =
  | { readonly diff: 'keep' | 'remove' }
  | {
      readonly content: Readonly<URL> | Data
      readonly mode: number
      readonly diff: 'update'
    }

interface AssetIndexEntry {
  h: string // sha256
  s: number // size
  m: number // mode
  t: number // mtime
}

export const remoteAssets = async (
  config: Config,
  conn: Connection
): Promise<Map<string, RemoteAsset>> => {
  const assets = new Map<string, RemoteAsset>()
  let raw: Buffer
  try {
    raw = await conn.get(config.indexName)
  } catch (e) {
    console.warn(`${pc.bold(pc.red('WARN:'))} ${String(e)}`)
    return assets
  }
  let json: unknown
  try {
    json = JSON.parse((await unbrotli(raw)).toString('utf-8'))
  } catch (e) {
    console.warn(`${pc.bold(pc.red('WARN:'))} ${String(e)}`)
    return assets
  }
  if (json != null && typeof json === 'object') {
    for (const [remoteName, i] of Object.entries(json)) {
      if (!isObject(i)) continue
      if (typeof i['h'] !== 'string') continue
      if (typeof i['s'] !== 'number') continue
      if (typeof i['m'] !== 'number') continue
      if (typeof i['t'] !== 'number') continue
      const asset = { hash: i['h'], size: i['s'], mode: i['m'], mtime: i['t'] }
      assets.set(remoteName, asset)
    }
  }
  return assets
}

export const exportAssets = async (
  assets: Map<string, ExportableAsset>
): Promise<Data> => {
  const json: Record<string, AssetIndexEntry> = {}
  for (const [remoteName, asset] of assets) {
    const { hash, size, mode, mtime } = asset
    json[remoteName] = { h: hash, s: size, m: mode, t: mtime }
  }
  return fromBuffer(await brotli(Buffer.from(JSON.stringify(json))))
}

const getRemoteName = async (
  rules: readonly Rule[],
  localName: string
): Promise<string | undefined> => {
  let result = localName
  for (const rule of rules) {
    if (!rule.test(localName)) continue
    const name = await rule.remoteName(result)
    if (name == null) return undefined
    result = normalizePath(name)
  }
  return result
}

export const localAssets = async (
  config: Config
): Promise<Map<string, LocalAsset>> => {
  const assets = new Map<string, LocalAsset>()
  for (const source of config.sources) {
    for await (const i of listFiles(source.directory)) {
      const { localName, fileURL } = i
      const remoteName = await getRemoteName(source.rules, localName)
      if (remoteName == null) continue
      const size = i.stat.size
      const mode = i.stat.mode & 0o777
      const mtime = Math.floor(i.stat.mtimeMs)
      const content = fileURL
      assets.set(remoteName, { localName, content, size, mode, mtime, source })
    }
  }
  return assets
}

const hashAsset = async (asset: { content: Readonly<URL> }): Promise<string> =>
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(asset.content)
    const hash = crypto.createHash('sha256')
    hash.on('finish', () => {
      resolve(hash.digest('base64'))
    })
    stream.on('error', e => {
      reject(e)
    })
    stream.pipe(hash)
  })

export const diffAssets = async (
  localAssets: Map<string, LocalAsset>,
  remoteAssets: Map<string, RemoteAsset>
): Promise<{
  update: Map<string, LoadedLocalAsset>
  keep: Map<string, UnmodifiedAsset>
  remove: Map<string, RemoteAsset & { diff: 'remove' }>
}> => {
  const update = new Map<string, LoadedLocalAsset>()
  const keep = new Map<string, UnmodifiedAsset>()
  const remove = new Map<string, RemoteAsset & { diff: 'remove' }>()
  for (const [remoteName, localAsset] of localAssets) {
    const remoteAsset = remoteAssets.get(remoteName)
    const hash = await hashAsset(localAsset)
    if (
      remoteAsset == null ||
      remoteAsset.hash !== hash ||
      remoteAsset.mode !== localAsset.mode
    ) {
      update.set(remoteName, { ...localAsset, hash, diff: 'update' })
    } else {
      const mtime = remoteAsset.mtime
      const content = undefined
      const diff = 'keep'
      keep.set(remoteName, { ...localAsset, content, mtime, hash, diff })
    }
  }
  for (const [remoteName, remoteAsset] of remoteAssets) {
    if (!update.has(remoteName) && !keep.has(remoteName)) {
      remove.set(remoteName, { ...remoteAsset, diff: 'remove' })
    }
  }
  return { update, keep, remove }
}
