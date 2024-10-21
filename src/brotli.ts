import zlib from 'node:zlib'

export const unbrotli = async (src: Buffer): Promise<Buffer> => {
  return await new Promise((resolve, reject) => {
    zlib.brotliDecompress(src, (error, result) => {
      if (error == null) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}

export const brotli = async (src: Buffer): Promise<Buffer> => {
  return await new Promise((resolve, reject) => {
    zlib.brotliCompress(src, (error, result) => {
      if (error == null) {
        resolve(result)
      } else {
        reject(error)
      }
    })
  })
}
