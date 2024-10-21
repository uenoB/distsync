import * as fs from 'node:fs/promises'

export class Fs {
  static async connect(baseURL: Readonly<URL>): Promise<Fs> {
    await fs.mkdir(new URL('.', baseURL), { recursive: true })
    return new Fs(baseURL)
  }

  constructor(private readonly baseURL: Readonly<URL>) {}

  async get(filename: string): Promise<Buffer> {
    return await fs.readFile(new URL(filename, this.baseURL))
  }

  async put(data: Buffer, filename: string): Promise<void> {
    await fs.writeFile(new URL(filename, this.baseURL), data)
  }

  async rm(filename: string): Promise<void> {
    await fs.rm(new URL(filename, this.baseURL))
  }

  async mkdir(filename: string): Promise<void> {
    await fs.mkdir(new URL(filename, this.baseURL))
  }

  async rmdir(filename: string): Promise<void> {
    await fs.rmdir(new URL(filename, this.baseURL))
  }

  async chmod(filename: string, mode: number): Promise<void> {
    await fs.chmod(new URL(filename, this.baseURL), mode)
  }

  end(): void {}
}
