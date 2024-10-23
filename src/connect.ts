import * as url from 'node:url'
import debug from 'debug'
import { read } from 'read'
import { Fs } from './fs'
import { WebDAV } from './webdav'
import { FTP } from './ftp'
import { SFTP } from './sftp'

const debugConnect = debug('distsync:connect')
const debugFtp = debug('distsync:ftp')
const debugSftp = debug('distsync:sftp')

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

const getPassword = async (
  username: string | undefined,
  server: Server
): Promise<string | undefined> => {
  if (server.password != null) {
    return await server.password()
  } else if (server.remote.password !== '') {
    return server.remote.password
  } else {
    return await read({
      default: '',
      prompt: `(${username ?? ''}@${server.remote.hostname}) Password: `,
      silent: true,
      replace: '*'
    })
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
  const password = await getPassword(username, server)
  if (protocol === 'http:' || protocol === 'https:') {
    const remote = new URL(server.remote)
    remote.username = ''
    remote.password = ''
    return WebDAV.connect(
      remote,
      username != null && password != null ? { username, password } : {}
    )
  } else if (protocol === 'ftp:') {
    const ftp = new FTP(server.remote)
    await ftp.connect({
      host: server.remote.host,
      user: username,
      password,
      debug: debugFtp.enabled ? debugFtp : undefined
    })
    return ftp
  } else if (protocol === 'sftp:') {
    const sftp = new SFTP(server.remote)
    const config1 = {
      host: server.remote.hostname,
      username: username ?? '',
      password: password ?? ''
    }
    const config2 = debugSftp.enabled ? { debug: debugSftp } : null
    await sftp.connect({ ...config1, ...config2 })
    return sftp
  }
  throw Error(`unsupported protocol: ${server.remote.protocol}`)
}
