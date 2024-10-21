import pc from 'picocolors'
import type { UploadableAsset } from './asset'
import type { Config } from './config'
import { connect } from './connect'
import { loadAssetContent } from './load'

const dummyConn = {
  mkdir: undefined,
  rmdir: undefined,
  put: undefined,
  chmod: undefined,
  rm: undefined,
  end: undefined
}

const folders = function* (remoteName: string): Iterable<string> {
  const path = remoteName.split('/')
  for (let i = 1; i < path.length; i++) yield path.slice(0, i).join('/')
}

const addFolders = <X>(
  set: Set<string>,
  assets: ReadonlyMap<string, X>,
  cond: (x: X) => boolean
): void => {
  for (const [remoteName, asset] of assets) {
    if (!cond(asset)) continue
    for (const folder of folders(remoteName)) set.add(folder)
  }
}

const compare = (x: string, y: string): number =>
  x.length !== y.length ? x.length - y.length : x.localeCompare(y)

export const updateRemote = async (
  config: Config,
  assets: ReadonlyMap<string, UploadableAsset>
): Promise<void> => {
  const oldFolders = new Set<string>()
  const newFolders = new Set<string>()
  addFolders(newFolders, assets, x => x.diff !== 'remove')
  addFolders(oldFolders, assets, x => x.diff !== 'update')

  const rmdirs: string[] = []
  const mkdirs: string[] = []
  for (const remoteName of oldFolders) {
    if (!newFolders.has(remoteName)) rmdirs.push(remoteName)
  }
  for (const remoteName of newFolders) {
    if (!oldFolders.has(remoteName)) mkdirs.push(remoteName)
  }
  rmdirs.sort(compare).reverse()
  mkdirs.sort(compare)

  const conn = config.dryRun ? dummyConn : await connect(config)
  try {
    for (const remoteName of mkdirs) {
      config.info?.(`${pc.blue('mkdir')} ${remoteName}`)
      try {
        await conn.mkdir?.(remoteName)
      } catch (e) {
        console.warn(`${pc.red(pc.bold('WARN:'))} ${String(e)}`)
      }
    }
    for (const [remoteName, asset] of assets) {
      if (asset.diff === 'update') {
        config.info?.(`${pc.blue('upload')} ${remoteName}`)
        await conn.put?.((await loadAssetContent(asset)).buffer, remoteName)
        const mode = asset.mode.toString(8)
        config.info?.(`${pc.blue('chmod')} ${mode} ${remoteName}`)
        await conn.chmod?.(remoteName, asset.mode)
      } else if (asset.diff === 'remove') {
        config.info?.(`${pc.blue('rm')} ${remoteName}`)
        await conn.rm?.(remoteName)
      }
    }
    for (const remoteName of rmdirs) {
      config.info?.(`${pc.blue('rmdir')} ${remoteName}`)
      try {
        await conn.rmdir?.(remoteName)
      } catch (e) {
        console.warn(`${pc.red(pc.bold('WARN:'))} ${String(e)}`)
      }
    }
  } finally {
    conn.end?.()
  }
}
