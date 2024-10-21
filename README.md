# distsync

A utility for uploading a directory to the server.
It is typically used to synchronize the remote `public_html` directory with
local `dist` directory created by some build tools such as Vite.

## Setup

```bash
npm install distsync
```

## Usage

1. Write a configuration file `distsync.config.js`.
2. Run `distsync` command.

## Configuration

You can write the configuration of distsync in one of the following files
(see [cosmiconfig] for details):
* `.distsyncrc`, `.distsyncrc.js`, or `.distsyncrc.json`
* `distsync.config.js`

The following is an example of a configuration file:

```js
export default {
  // the URL of the server and directory where the files are uploaded.
  remote: "ftp://example.com/users/foo/public_html/",

  // the remote filename for the distsync's index file.
  indexName: ".htdistsync",

  // the source directories
  sources: [
    {
      // the relative path of a directory from this configuration file.
      directory: "dist",

      // rules for file selection and postprocessing.
      rules: {
        // before uploading, HTML files except for index.html are compressed
        // by gzip and renamed to index.html.gz.
        files: "**/*.html",
        exclude: "**/index.html",
        transform: "gzip",
        remoteName: "*.gz"
      }
    }
  ]
```

A user configuration must be an object of the following `UserConfig` type:

``` typescript
interface UserConfig {
  remote?: URL | string;
  passwordCommand?: string;
  indexName?: string;
  sources?: Array<string | UserSource> | string | UserSource;
}

interface UserSource {
  directory?: string;
  rules?: UserRule[] | UserRule;
}

type Transform =
  (data: Data, name: string) => Promise<Buffer | string> | Buffer | string;

type RemoteName =
  (name: string) => Promise<string | undefined> | string | undefined;

interface UserRule {
  files?: Array<string | RegExp> | string | RegExp;
  exclude?:  Array<string | RegExp> | string | RegExp;
  transform?: Transform | "gzip" | "brotli";
  remoteName?: RemoteName | string;
  ignore?: boolean;
}
```

### `remote`

| type | default |
|------|---------|
| `string` | `distsync` directory of the current directory |

The absolute URL of the remote directory.
The following protocol are allowed:
`file:` (local copy for testing),
`http:` and `https:` (WebDAV),
`sftp:`, and `ftp:`.

### `passwordCommand`

| type | default |
|------|---------|
| `string` | (print `Password:` prompt) |

The command that obtains secret password.

### `indexName`

| type | default |
|------|---------|
| `string` | `".htdistsync"` |

The filename of the index file created by distsync in the remote directory.

The index file is used to determine the difference between the contents
of local and remote directories.

### `sources`

| type | default |
|------|---------|
| `Array<string \| UserSource> \| string \| UserSource` | `"dist"` |

The directory containing files to be uploaded.

Each directory must be specified by its name (`string`) or
as an object (`UserSource`).
The `UserSource` object consists of the `directory` and `rules` property,
described below.
It is allowed to specify multiple directories by an array.

### `directory`

| type | default |
|------|---------|
| `string` | `"dist"` |

The name of source directory, which may be a relative path from the
configuration file.

### `rules`

| type | default |
|------|---------|
| `UserRule[] \| UserRule` | `[]` |

If an object is given to the `sources` property, it may optionally
have the `rules` property for file selection and transformation
before uploading.
Each rule may have the `files`, `exclude`, `transform`, `remoteName`, and/or
`ignore` properties, all of which are described below.

If multiple rules are specified by an array,
rules are sequentially applied to each file.

### `files`

| type | default |
|------|---------|
| `Array<string \| RegExp> \| string \| RegExp` | `"**/*"` |

File name patterns that matches with files that this rule is applied.
If it is omitted, the rule is applied to all files.

### `exclude`

| type | default |
|------|---------|
| `Array<string \| RegExp> \| string \| RegExp` | `[]` |

The rule is not applied to files matched with this pattern.

### `transform`

| type | default |
|------|---------|
| `function \| "gzip" \| "brotli"` | `undefined` |

The contents of the file is manipulated by the given function
before uploading.

The type of the `transform` function is
```typescript
(data: Data, name: string) => Promise<Buffer | string> | Buffer | string
```
where
```typescript
interface Data {
    readonly string: string;
    readonly buffer: Buffer;
}
```
The function must take the file contents (`data`) and file name (`name`)
and returns new contents as a Buffer or string.

If `"gzip"` or `"brotli"` is specified, the file is compressed with the
specified compressor, which is Node.js's built-in.

Multiple transformation can be chained by multiple rules.
For example, you can optimize SVG files and then compress it by the
sequential two rules.
```js
{
  directory: "dist",
  rules: [
    {
      files: "**/*.svg",
      transform: (data, path) =>
        svgo.optimize(buf.string, { path, multipass: true }).data
    },
    {
      files: ["**/*.{svg,html}"],
      transform: "gzip",
      remoteName: "*.gz"
    }
  ]
}
```

### `remoteName`

| type | default |
|------|---------|
| `function \| string` | `undefined` |

The `remoteName` function manipulates file names before uploading.
The type of the function is the following:
``` typescript
(name: string) => Promise<string | null | Undefined> | string | null | undefined
```
The function takes the file name in the local directory and returns
a new name in the remote directory.
It may return `null` or `undefined` to prevent distsync from uploading
this file.

If `remoteName` is a string, the string is used for the new file name
with replacing `*` occurring in the string with the original file name.

Multiple renaming can be chained by multiple rules.

### `ignore`

| type | default |
|------|---------|
| `boolean` | `false` |

Files matched with this rule are not uploaded.

This is a shorthand for `remoteName: () => undefined`.

## License

MIT

[cosmiconfig]: https://github.com/cosmiconfig/cosmiconfig
