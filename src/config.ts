import * as path from 'node:path'
import * as url from 'node:url'
import * as child from 'node:child_process'
import { cosmiconfig } from 'cosmiconfig'
import micromatch from 'micromatch'
import { type Data, fromBuffer, fromString } from './data'
import { gzip } from './gzip'
import { brotli } from './brotli'
import type { Arrayable, Awaitable, Null } from './util'
import { isObject, toArray } from './util'

export type Transform = (
  data: Data,
  localName: string
) => Awaitable<Buffer | string>
export type RemoteName = (remoteName: string) => Awaitable<string | Null>

export interface UserRule {
  readonly files?: Arrayable<string | RegExp>
  readonly exclude?: Arrayable<string | RegExp>
  readonly transform?: Transform | 'gzip' | 'brotli' | Null
  readonly remoteName?: RemoteName | string | Null
  readonly ignore?: boolean | Null
}

export interface Rule {
  readonly test: (fileName: string) => boolean
  readonly transform: ((data: Data, name: string) => Promise<Data>) | undefined
  readonly remoteName: (name: string) => Promise<string | Null>
}

export interface UserSource {
  readonly directory?: string | Null
  readonly rules?: Arrayable<UserRule>
}

export interface Source {
  readonly directory: string
  readonly rules: readonly Rule[]
}

export interface UserConfig {
  readonly remote?: Readonly<URL> | string | Null
  readonly passwordCommand?: string | Null
  readonly indexName?: string | Null
  readonly sources?: Arrayable<UserSource | string>
}

export interface AppConfig extends UserConfig {
  readonly config: string | Null
}

export interface Config {
  readonly remote: Readonly<URL>
  readonly password: (() => Promise<string>) | undefined
  readonly indexName: string
  readonly sources: readonly Source[]
  readonly info: ((message: string) => void) | undefined
  readonly dryRun: boolean
}

export const distsyncConfig = (config: UserConfig): UserConfig => config

const getFilter = (
  filter: Record<string, unknown>
): ((fileName: string) => boolean) => {
  const matcher = (pat: unknown): ((fileName: string) => boolean) => {
    if (typeof pat === 'string') return micromatch.matcher(pat, { posix: true })
    if (pat instanceof RegExp) return pat.test.bind(pat)
    throw Error('filename pattern must be either a string or RegExp')
  }
  const files = toArray(filter['files']).map(matcher)
  const exclude = toArray(filter['exclude']).map(matcher)
  return (fileName: string): boolean => {
    if (exclude.some(i => i(fileName))) return false
    if (files.length > 0 && !files.some(i => i(fileName))) return false
    return true
  }
}

const getTransform = (
  transform: unknown
): ((data: Data, name: string) => Promise<Data>) | undefined => {
  if (transform == null) {
    return undefined
  } else if (typeof transform === 'function') {
    return async (data, localName) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result: unknown = await transform(data, localName)
      if (typeof result === 'string') {
        return fromString(result)
      } else if (Buffer.isBuffer(result)) {
        return fromBuffer(result)
      } else {
        throw Error('result of transform must be either a string or Buffer')
      }
    }
  } else if (transform === 'brotli') {
    return async data => fromBuffer(await brotli(data.buffer))
  } else if (transform === 'gzip') {
    return async data => fromBuffer(await gzip(data.buffer))
  } else {
    throw Error('transform must be either a function or "gzip"')
  }
}

const getRemoteName = (
  rule: Record<string, unknown>
): ((name: string) => Promise<string | Null>) => {
  // eslint-disable-next-line @typescript-eslint/require-await
  if (rule['ignore'] === true) return async () => undefined
  const remoteName = rule['remoteName']
  if (remoteName == null) {
    // eslint-disable-next-line @typescript-eslint/require-await
    return async name => name
  } else if (typeof remoteName === 'function') {
    return async name => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const result: unknown = await remoteName(name)
      if (typeof result === 'string' || result == null) return result
      throw Error('result of remoteName must be a string')
    }
  } else if (typeof remoteName === 'string') {
    // eslint-disable-next-line @typescript-eslint/require-await
    return async name => remoteName.replace('*', () => name)
  } else {
    throw Error('remoteName must be either a function or string')
  }
}

const getRule = (rule: unknown): Rule => {
  if (!isObject(rule)) throw Error('rule must be an object')
  return {
    test: getFilter(rule),
    transform: getTransform(rule['transform']),
    remoteName: getRemoteName(rule)
  }
}

const getSource = (basePath: string, source: unknown): Source => {
  if (typeof source === 'string') {
    return { directory: path.resolve(basePath, source), rules: [] }
  } else if (isObject(source)) {
    const directory = source['directory'] ?? 'dist'
    if (typeof directory !== 'string') throw Error('directory must be a string')
    return {
      directory: path.resolve(basePath, directory),
      rules: toArray(source['rules']).map(getRule)
    }
  } else {
    throw Error('source must be either a string or object')
  }
}

const getRemote = (basePath: string, dest: unknown): Readonly<URL> => {
  if (dest == null || dest === '') {
    return url.pathToFileURL(path.resolve(basePath, 'distsync'))
  } else if (typeof dest === 'string' || dest instanceof URL) {
    return new URL(dest)
  } else {
    throw Error('remote must be either a string or URL')
  }
}

const getPassword = (
  basePath: string,
  command: unknown
): (() => Promise<string>) | undefined => {
  if (typeof command === 'string') {
    const dir = path.resolve(basePath)
    return async () =>
      await new Promise((resolve, reject) => {
        const proc = child.spawn(command, {
          shell: true,
          cwd: dir,
          stdio: ['ignore', 'pipe', 'inherit']
        })
        const stdout: Buffer[] = []
        proc.stdout.on('data', (data: Buffer) => {
          stdout.push(data)
        })
        proc.on('close', code => {
          if (code === 0) {
            resolve(Buffer.concat(stdout).toString('utf-8').trim())
          } else {
            reject(Error(`password command exited with status ${code}`))
          }
        })
      })
  } else if (command == null) {
    return undefined
  } else {
    throw Error('passwordCommand must be a string')
  }
}

const getIndexName = (indexName: unknown): string => {
  if (typeof indexName === 'string' || indexName == null) {
    return indexName ?? '.htdistsync'
  } else {
    throw Error('indexName must be a string')
  }
}

const getSources = (basePath: string, sources: unknown): readonly Source[] => {
  if (sources == null) {
    return [getSource(basePath, 'dist')]
  } else {
    return toArray(sources).map(i => getSource(basePath, i))
  }
}

const getConfig = (
  basePath: string,
  config: Record<string, unknown>
): Config => ({
  remote: getRemote(basePath, config['remote']),
  password: getPassword(basePath, config['passwordCommand']),
  indexName: getIndexName(config['indexName']),
  sources: getSources(basePath, config['sources']),
  info: config['quiet'] === true ? undefined : console.info,
  dryRun: config['dryRun'] === true
})

export const readConfig = async (options: object = {}): Promise<Config> => {
  let basePath: string
  let config: unknown
  const configFile = 'config' in options ? options.config : undefined
  if (configFile === '') {
    basePath = process.cwd()
    config = {}
  } else if (typeof configFile === 'string' || configFile == null) {
    const explorer = cosmiconfig('distsync')
    const result =
      configFile == null
        ? await explorer.search()
        : await explorer.load(configFile)
    basePath = result != null ? path.dirname(result.filepath) : process.cwd()
    config = result == null || result.isEmpty === true ? {} : result.config
  } else {
    throw Error('config must be a string')
  }
  if (!isObject(config)) throw Error('configuration must be an object')
  return getConfig(basePath, { ...config, ...options })
}
