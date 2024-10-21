export interface Data {
  readonly string: string
  readonly buffer: Buffer
}

export const fromString = (x: string): Data => {
  let buf: Buffer | undefined
  return {
    string: x,
    get buffer(): Buffer {
      return (buf ??= Buffer.from(x, 'utf-8'))
    }
  }
}

export const fromBuffer = (x: Buffer): Data => {
  let str: string | undefined
  return {
    get string(): string {
      return (str ??= x.toString('utf-8'))
    },
    buffer: x
  }
}
