import * as fs from 'node:fs'
import { joinURL } from './util'

interface ListFilesItem {
  localName: string
  fileURL: Readonly<URL>
  stat: fs.Stats
}

export const listFiles = async function* (
  from: Readonly<URL>
): AsyncGenerator<ListFilesItem> {
  const rootURL = joinURL(from, '')
  const stack = [rootURL]
  for (;;) {
    const fileURL = stack.pop()
    if (fileURL == null) break
    const stat = await fs.promises.stat(fileURL)
    if (stat.isDirectory()) {
      const entries = await fs.promises.readdir(fileURL)
      entries.reduceRight((_, x) => stack.push(joinURL(fileURL, x)), 0)
    } else {
      const localName = fileURL.href.slice(rootURL.href.length)
      yield { localName, fileURL, stat }
    }
  }
}
