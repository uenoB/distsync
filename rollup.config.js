import * as fs from 'node:fs'
import esbuild from 'rollup-plugin-esbuild'
import terserPlugin from '@rollup/plugin-terser'
import dts from 'rollup-plugin-dts'

const terser = () =>
  terserPlugin({
    ecma: 2022,
    compress: {
      join_vars: false,
      sequences: false,
      lhs_constants: false,
      reduce_funcs: false,
      keep_fnames: /Middleware$/
    },
    mangle: false,
    output: {
      comments: false,
      beautify: true,
      indent_level: 2,
      semicolons: false,
      preserve_annotations: true
    }
  })

const cleanup = outDir => ({
  name: 'cleanup',
  buildStart: () => fs.rmSync(outDir, { recursive: true, force: true })
})

const externalNames = json => [
  ...Object.keys(json.dependencies ?? {}),
  ...Object.keys(json.peerDependencies ?? {})
]

const esmOutput = {
  format: 'es',
  sourcemap: true,
  sourcemapExcludeSources: true
}

const cjsOutput = {
  format: 'cjs',
  entryFileNames: '[name].cjs',
  exports: 'named',
  esModule: true,
  sourcemap: true,
  sourcemapExcludeSources: true
}

const json = JSON.parse(fs.readFileSync('package.json'))
const external = new Set(externalNames(json))
const outDir = 'dist'
const input = 'src/index.ts'

export default [
  {
    external: [...external, /^node:/],
    plugins: [cleanup(outDir), esbuild({ target: 'es2022' }), terser()],
    input,
    output: [
      { ...esmOutput, dir: outDir },
      { ...cjsOutput, dir: outDir }
    ]
  },
  {
    external: [...external, /^node:/],
    plugins: [dts()],
    input,
    output: [
      { dir: outDir, entryFileNames: '[name].d.ts' },
      { dir: outDir, entryFileNames: '[name].d.cts' }
    ]
  }
]
