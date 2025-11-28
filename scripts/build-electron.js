const esbuild = require('esbuild')

const isDev = process.argv.includes('--dev')

// Native modules that should not be bundled
const nativeExternals = [
  'electron',
  'better-sqlite3',
  'node-llama-cpp',
  '@node-llama-cpp/*',
  '@reflink/*',
]

async function build() {
  // Build main process
  await esbuild.build({
    entryPoints: ['electron/main/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist-electron/main/index.js',
    external: nativeExternals,
    sourcemap: isDev,
    minify: !isDev,
    // Handle native .node files
    loader: { '.node': 'file' },
  })
  console.log('✅ Main process built')

  // Build preload script
  await esbuild.build({
    entryPoints: ['electron/preload/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist-electron/preload/index.js',
    external: ['electron'],
    sourcemap: isDev,
    minify: !isDev,
  })
  console.log('✅ Preload script built')
}

build().catch((e) => {
  console.error(e)
  process.exit(1)
})
