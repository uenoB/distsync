import * as url from 'node:url'
import debug from 'debug'
import { Fs } from './fs'
import { WebDAV } from './webdav'
import { FTP } from './ftp'

const debugConnect = debug('distsync:connect')
const debugFtp = debug('distsync:ftp')

interface Server {
  readonly remote: Readonly<URL>
  readonly password: (() => Promise<string>) | undefined
}

export interface Connection {
  get: (filename: string) => Promise<Buffer>
  put: (data: Buffer, filename: string) => Promise<void>
  rm: (filename: string) => Promise<void>
  mkdir: (filename: string) => Promise<void>
  rmdir: (filename: string) => Promise<void>
  chmod: (filename: string, mode: number) => Promise<void>
  end: () => void
}

const getUserName = (server: Server): string | undefined =>
  server.remote.username !== '' ? server.remote.username : undefined

const getPassword = async (server: Server): Promise<string | undefined> => {
  if (server.password != null) {
    return await server.password()
  } else if (server.remote.password !== '') {
    return server.remote.password
  } else {
    return undefined
  }
}

export const connect = async (server: Server): Promise<Connection> => {
  const protocol = server.remote.protocol
  if (protocol === 'file:') {
    debugConnect(`destination: ${url.fileURLToPath(server.remote)}`)
    return await Fs.connect(server.remote)
  }
  debugConnect(`connecting to ${server.remote.origin}`)
  const username = getUserName(server)
  const password = await getPassword(server)
  if (protocol === 'http:' || protocol === 'https:') {
    const remote = new URL(server.remote)
    remote.username = ''
    remote.password = ''
    return WebDAV.connect(
      remote.href,
      username != null && password != null ? { username, password } : {}
    )
  } else if (protocol === 'ftp:') {
    const ftp = new FTP(server.remote.pathname)
    await ftp.connect({
      host: server.remote.host,
      user: username,
      password,
      debug: debugFtp.enabled ? debugFtp : undefined
    })
    return ftp
  }
  throw Error(`unsupported protocol: ${server.remote.protocol}`)
}
