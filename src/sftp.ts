import ssh2 from 'ssh2'

const promise = async <X>(
  client: ssh2.Client,
  body: (ok: (x: X) => void, ng: (x: Error) => void) => void
): Promise<X> =>
  await new Promise<X>((resolve, reject) => {
    const onError = (error: Error): void => {
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

export class SFTP {
  private readonly baseURL: Readonly<URL>
  private readonly client: ssh2.Client
  private sftp: ssh2.SFTPWrapper | undefined

  constructor(basePath = '/') {
    this.baseURL = new URL(basePath, 'file:')
    this.client = new ssh2.Client()
  }

  end(): void {
    this.sftp = undefined
    this.client.end()
  }

  async connect(config: ssh2.ConnectConfig): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      this.client.on('ready', () => {
        this.client.sftp((err, sftp) => {
          if (err == null) {
            this.sftp = sftp
            resolve(undefined)
          } else {
            reject(err)
          }
        })
      })
      this.client.on('error', err => {
        reject(err)
      })
      this.client.connect(config)
    })
  }

  async get(filename: string): Promise<Buffer> {
    if (this.sftp == null) throw Error('SFTP connection is not established')
    const path = new URL(filename, this.baseURL).pathname
    const stream = this.sftp.createReadStream(path)
    const result = []
    for await (const data of stream) result.push(data)
    return Buffer.concat(result)
  }

  async put(data: Buffer, filename: string): Promise<void> {
    if (this.sftp == null) throw Error('SFTP connection is not established')
    const path = new URL(filename, this.baseURL).pathname
    const stream = this.sftp.createWriteStream(path)
    await new Promise<void>((resolve, reject) => {
      stream.on('close', () => {
        resolve()
      })
      stream.on('error', (err: Error) => {
        reject(err)
      })
      stream.end(data)
    })
  }

  async mkdir(filename: string): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      if (this.sftp == null) throw Error('SFTP connection is not established')
      this.sftp.mkdir(new URL(filename, this.baseURL).pathname, err => {
        if (err == null) {
          resolve(undefined)
        } else {
          reject(err)
        }
      })
    })
  }

  async rm(filename: string): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      if (this.sftp == null) throw Error('SFTP connection is not established')
      this.sftp.unlink(new URL(filename, this.baseURL).pathname, err => {
        if (err == null) {
          resolve(undefined)
        } else {
          reject(err)
        }
      })
    })
  }

  async rmdir(filename: string): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      if (this.sftp == null) throw Error('SFTP connection is not established')
      this.sftp.rmdir(new URL(filename, this.baseURL).pathname, err => {
        if (err == null) {
          resolve(undefined)
        } else {
          reject(err)
        }
      })
    })
  }

  async chmod(filename: string, mode: number): Promise<void> {
    await promise(this.client, (resolve, reject) => {
      if (this.sftp == null) throw Error('SFTP connection is not established')
      this.sftp.chmod(new URL(filename, this.baseURL).pathname, mode, err => {
        if (err == null) {
          resolve(undefined)
        } else {
          reject(err)
        }
      })
    })
  }
}
