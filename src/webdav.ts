import type { WebDAVClient, WebDAVClientOptions } from 'webdav'
import { createClient } from 'webdav'

export class WebDAV {
  static connect(url: Readonly<URL>, options?: WebDAVClientOptions): WebDAV {
    return new WebDAV(createClient(url.href, options))
  }

  constructor(private readonly client: WebDAVClient) {}

  async get(filename: string): Promise<Buffer> {
    const r = await this.client.getFileContents(filename, { format: 'binary' })
    if (Buffer.isBuffer(r)) return r
    if (typeof r === 'string') return Buffer.from(r)
    if (r instanceof ArrayBuffer) return Buffer.from(r)
    const d = r.data
    return typeof d === 'string' ? Buffer.from(d) : Buffer.from(d)
  }

  async put(data: Buffer, filename: string): Promise<void> {
    const r = await this.client.putFileContents(filename, data)
    if (!r) throw Error('file was not written')
  }

  async rm(filename: string): Promise<void> {
    await this.client.deleteFile(filename)
  }

  async mkdir(filename: string): Promise<void> {
    await this.client.createDirectory(filename)
  }

  async rmdir(filename: string): Promise<void> {
    await this.rm(filename.replace(/\/*$/, '/'))
  }

  async chmod(): Promise<void> {}

  end(): void {}
}
