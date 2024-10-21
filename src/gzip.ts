import zlib from 'node:zlib'

export const gunzip = async (src: Buffer): Promise<Buffer> => {
  return await new Promise((resolve, reject) => {
    zlib.gunzip(src, (error, result) => {
      if (error == null) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}

export const gzip = async (src: Buffer): Promise<Buffer> => {
  return await new Promise((resolve, reject) => {
    zlib.gzip(src, { level: 9 }, (error, result) => {
      if (error == null) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}
