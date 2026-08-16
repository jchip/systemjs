const typescript = require('@rollup/plugin-typescript');
const replace = require('@rollup/plugin-replace');
const { terser } = require('rollup-plugin-terser');
const { version } = require('./package.json');

// Terser options ported verbatim from the former chompfile.toml terser template
const terserOptions = {
  ecma: 5,
  keep_classnames: false,
  keep_fnames: false,
  safari10: true,
  toplevel: true,
  mangle: {
    eval: true
  },
  compress: {
    arguments: true,
    hoist_funs: true,
    keep_fargs: false,
    pure_getters: true,
    passes: 2,
    unsafe: false
  }
};

function config (input, outFile, { banner, production = false } = {}) {
  return {
    input,
    onwarn () {},
    plugins: [
      typescript({ noEmit: false }),
      replace({
        'process.env.SYSTEM_PRODUCTION': String(production),
        'process.env.SYSTEM_BROWSER': 'true'
      })
    ],
    output: [{
      file: outFile,
      format: 'iife',
      strict: false,
      banner
    }, {
      file: outFile.replace(/\.js$/, '.min.js'),
      format: 'iife',
      strict: false,
      banner,
      sourcemap: true,
      plugins: [terser(terserOptions)]
    }]
  };
}

const extras = [
  'amd',
  'dynamic-import-maps',
  'global',
  'module-types',
  'named-exports',
  'named-register',
  'transform',
  'use-default'
];

module.exports = [
  config('src/system.ts', 'dist/system.js', { banner: '/*!\n * SystemJS ' + version + '\n */' }),
  config('src/s.ts', 'dist/s.js', { banner: '/*!\n * SJS ' + version + '\n */', production: true })
].concat(extras.map(function (name) {
  return config('src/extras/' + name + '.ts', 'dist/extras/' + name + '.js');
}));
