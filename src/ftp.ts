import Client from 'ftp'

export type Options = Client.Options

export class FTP {
  private readonly baseURL: Readonly<URL>
  private readonly client: Client

  constructor(basePath = '/') {
    this.baseURL = new URL(basePath, 'file:')
    this.client = new Client()
  }

  end(): void {
    this.client.end()
  }

  private async promise<X>(
    body: (ok: (x: X) => void, ng: (x: unknown) => void) => void
  ): Promise<X> {
    return await new Promise<X>((resolve, reject) => {
      /* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
      const onError = (error: unknown): void => {
        // an accident happened during communication.
        // except for the case when an unexpected server response has come,
        // connection is closed by the library.
        reject(error)
      }
      this.client.once('error', onError)
      const ok = (x: X): void => {
        this.client.removeListener('error', onError)
        resolve(x)
      }
      const ng = (x: unknown): void => {
        this.client.removeListener('error', onError)
        reject(x)
      }
      body(ok, ng)
      /* eslint-enable */
    })
  }

  async connect(options?: Client.Options): Promise<void> {
    await this.promise(resolve => {
      this.client.once('ready', resolve)
      this.client.connect({ secure: true, ...options })
    })
  }

  async get(filename: string): Promise<Buffer> {
    return await this.promise((resolve, reject) => {
      this.client.get(
        new URL(filename, this.baseURL).pathname,
        (err: unknown, rs) => {
          if (err != null) {
            reject(err)
          } else {
            const data: Buffer[] = []
            rs.on('data', (chunk: Buffer) => {
              data.push(chunk)
            })
            rs.on('end', () => {
              resolve(Buffer.concat(data))
            })
            rs.on('error', err => {
              this.client.end()
              reject(err)
            })
          }
        }
      )
    })
  }

  async put(data: Buffer, filename: string): Promise<void> {
    await this.promise((resolve, reject) => {
      this.client.put(
        data,
        new URL(filename, this.baseURL).pathname,
        (err: unknown) => {
          if (err == null) {
            resolve(undefined)
          } else {
            reject(err)
          }
        }
      )
    })
  }

  async mkdir(filename: string): Promise<void> {
    await this.promise((resolve, reject) => {
      this.client.mkdir(
        new URL(filename, this.baseURL).pathname,
        (err: unknown) => {
          if (err == null) {
            resolve(undefined)
          } else {
            reject(err)
          }
        }
      )
    })
  }

  async rm(filename: string): Promise<void> {
    await this.promise((resolve, reject) => {
      this.client.delete(
        new URL(filename, this.baseURL).pathname,
        (err: unknown) => {
          if (err == null) {
            resolve(undefined)
          } else {
            reject(err)
          }
        }
      )
    })
  }

  async rmdir(filename: string): Promise<void> {
    await this.promise((resolve, reject) => {
      this.client.rmdir(
        new URL(filename, this.baseURL).pathname,
        (err: unknown) => {
          if (err == null) {
            resolve(undefined)
          } else {
            reject(err)
          }
        }
      )
    })
  }

  async chmod(filename: string, mode: number): Promise<void> {
    filename = new URL(filename, this.baseURL).pathname
    const command = `CHMOD ${mode.toString(8)} ${filename}`
    const [text, code] = await this.promise<[string, number]>((ok, ng) => {
      this.client.site(command, (err: unknown, text, code) => {
        if (err == null) {
          ok([text, code])
        } else {
          ng(err)
        }
      })
    })
    if (code !== 200) throw Error(`${code} ${text}`)
  }
}
