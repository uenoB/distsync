import pc from 'picocolors'
import type { UploadableAsset } from './asset'
import { remoteAssets, localAssets, diffAssets, exportAssets } from './asset'
import { type AppConfig, readConfig } from './config'
import { connect } from './connect'
import { transformAssets } from './load'
import { updateRemote } from './update'
import { mergeMap } from './util'

export const distsync = async (options: AppConfig): Promise<void> => {
  const config = await readConfig(options)

  config.info?.(pc.green(pc.bold('Getting local assets...')))
  const locals = await localAssets(config)

  const conn = await connect(config)
  try {
    config.info?.(pc.green(pc.bold('Getting remote assets...')))
    const remotes = await remoteAssets(config, conn)

    config.info?.(pc.green(pc.bold('Comparing local against remote...')))
    const { update, keep, remove } = await diffAssets(locals, remotes)
    for (const k of update.keys()) config.info?.(`${pc.blue('UPLOAD:')} ${k}`)
    for (const k of remove.keys()) config.info?.(`${pc.blue('REMOVE:')} ${k}`)
    if (update.size === 0 && remove.size === 0) {
      config.info?.(pc.magenta(pc.bold('Nothing to do.')))
      return
    }

    config.info?.(pc.green(pc.bold('Preparing local assets...')))
    const loaded = await transformAssets(config, update)
    const upload: Map<string, UploadableAsset> = mergeMap(loaded, keep, remove)
    upload.set(config.indexName, {
      content: await exportAssets(mergeMap(loaded, keep)),
      mode: 0o600,
      diff: 'update'
    })

    config.info?.(pc.green(pc.bold('Uploading...')))
    await updateRemote(config, conn, upload)
  } finally {
    conn.end()
  }

  config.info?.(pc.green(pc.bold('Completed.')))
}

export {
  type Transform,
  type RemoteName,
  type UserRule,
  type UserSource,
  type UserConfig,
  type AppConfig,
  distsyncConfig
} from './config'
