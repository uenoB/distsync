import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as url from 'node:url'

export class Fs {
  static async connect(baseURL: Readonly<URL>): Promise<Fs> {
    const basePath = url.fileURLToPath(baseURL)
    await fs.mkdir(basePath, { recursive: true })
    return new Fs(basePath)
  }

  constructor(private readonly basePath: string) {}

  async get(filename: string): Promise<Buffer> {
    return await fs.readFile(path.join(this.basePath, filename))
  }

  async put(data: Buffer, filename: string): Promise<void> {
    await fs.writeFile(path.join(this.basePath, filename), data)
  }

  async rm(filename: string): Promise<void> {
    await fs.rm(path.join(this.basePath, filename))
  }

  async mkdir(filename: string): Promise<void> {
    await fs.mkdir(path.join(this.basePath, filename))
  }

  async rmdir(filename: string): Promise<void> {
    await fs.rmdir(path.join(this.basePath, filename))
  }

  async chmod(filename: string, mode: number): Promise<void> {
    await fs.chmod(path.join(this.basePath, filename), mode)
  }

  end(): void {}
}
