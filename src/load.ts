import * as fs from 'node:fs/promises'
import pc from 'picocolors'
import type { LoadedLocalAsset } from './asset'
import type { Config } from './config'
import { type Data, fromBuffer } from './data'

export const loadAssetContent = async (asset: {
  content: Readonly<URL> | Data
}): Promise<Data> =>
  'buffer' in asset.content
    ? asset.content
    : fromBuffer(await fs.readFile(asset.content))

export const transformAssets = async (
  config: Config,
  assets: Map<string, LoadedLocalAsset>
): Promise<Map<string, LoadedLocalAsset>> =>
  new Map(
    await Promise.all(
      Array.from(assets, async ([remoteName, asset]) => {
        let content: Data | undefined
        for (const rule of asset.source.rules) {
          if (rule.transform == null) continue
          if (!rule.test(asset.localName)) continue
          if (content == null) {
            config.info?.(`${pc.blue(`generating`)} ${remoteName}`)
            content = await loadAssetContent(asset)
          }
          content = await rule.transform(content, asset.localName)
        }
        const newAsset = content != null ? { ...asset, content } : asset
        return [remoteName, newAsset] as const
      })
    )
  )
