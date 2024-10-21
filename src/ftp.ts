import Client from 'ftp'

export type Options = Client.Options

const promise = async <X>(
  client: Client,
  body: (ok: (x: X) => void, ng: (x: Error) => void) => void
): Promise<X> =>
  await new Promise<X>((resolve, reject) => {
    const onError = (error: Error): void => {
      // an accident happened during communication.
      // except for the case when an unexpected server response has come,
      // connection is closed by the library.
      reject(error)
    }
    client.once('error', onError)
    const ok = (x: X): void => {
      client.removeListener('error', onError)
      resolve(x)
    }
    const ng = (x: Error): void => {
      client.removeListener('error', onError)
      reject(x)
    }
    body(ok, ng)
  })

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

  async connect(options?: Client.Options): Promise<void> {
    await promise(this.client, resolve => {
      this.client.once('ready', resolve)
      this.client.connect({ secure: true, ...options })
    })
  }

  async get(filename: string): Promise<Buffer> {
    return await promise(this.client, (resolve, reject) => {
      this.client.get(
        new URL(filename, this.baseURL).pathname,
        (err: Error | undefined, rs) => {
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
            rs.on('error', (err: Error) => {
              this.client.end()
              reject(err)
            })
          }
        }
      )
    })
  }

  async put(data: Buffer, filename: string): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      this.client.put(
        data,
        new URL(filename, this.baseURL).pathname,
        (err: Error | undefined) => {
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
    await promise(this.client, (resolve, reject) => {
      this.client.mkdir(
        new URL(filename, this.baseURL).pathname,
        (err: Error | undefined) => {
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
    await promise(this.client, (resolve, reject) => {
      this.client.delete(
        new URL(filename, this.baseURL).pathname,
        (err: Error | undefined) => {
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
    await promise(this.client, (resolve, reject) => {
      this.client.rmdir(
        new URL(filename, this.baseURL).pathname,
        (err: Error | undefined) => {
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
    const [text, code] = await promise<[string, number]>(
      this.client,
      (resolve, reject) => {
        this.client.site(command, (err: Error | undefined, text, code) => {
          if (err == null) {
            resolve([text, code])
          } else {
            reject(err)
          }
        })
      }
    )
    if (code !== 200) throw Error(`${code} ${text}`)
  }
}
