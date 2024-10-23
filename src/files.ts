import * as fs from 'node:fs'
import * as path from 'node:path'
import * as url from 'node:url'

interface ListFilesItem {
  localName: string
  fileURL: Readonly<URL>
  stat: fs.Stats
}

export const listFiles = async function* (
  directory: string
): AsyncGenerator<ListFilesItem> {
  const stack = [{ filePath: directory, localName: '' }]
  for (;;) {
    const pair = stack.pop()
    if (pair == null) break
    const stat = await fs.promises.stat(pair.filePath)
    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(pair.filePath)
      for (const i of entries.reverse()) {
        stack.push({
          filePath: path.join(pair.filePath, i),
          localName: path.posix.join(pair.localName, i)
        })
      }
    } else {
      yield {
        localName: pair.localName,
        fileURL: url.pathToFileURL(pair.filePath),
        stat
      }
    }
  }
}
