const path = require('path')

const defaultPolyfills = [
  // promise polyfill alone doesn't work in IE,
  // needs this as well. see: #1642
  'es6.array.iterator',
  // this is required for webpack code splitting, vuex etc.
  'es6.promise',
  // #2012 es6.promise replaces native Promise in FF and causes missing finally
  'es7.promise.finally'
]

function getPolyfills (targets, includes, { ignoreBrowserslistConfig, configPath }) {
  const { isPluginRequired } = require('@babel/preset-env')
  const builtInsList = require('@babel/preset-env/data/built-ins.json')
  const getTargets = require('@babel/preset-env/lib/targets-parser').default
  const builtInTargets = getTargets(targets, {
    ignoreBrowserslistConfig,
    configPath
  })

  return includes.filter(item => {
    return isPluginRequired(builtInTargets, builtInsList[item])
  })
}

module.exports = (context, options = {}) => {
  const presets = []
  const plugins = []

  // JSX
  if (options.jsx !== false) {
    plugins.push(
      require('@babel/plugin-syntax-jsx'),
      require('babel-plugin-transform-vue-jsx')
      // require('babel-plugin-jsx-event-modifiers'),
      // require('babel-plugin-jsx-v-model')
    )
  }

  const modern = !!options.modern

  const {
    buildTarget,
    loose = false,
    useBuiltIns = 'usage',
    modules = false,
    polyfills: userPolyfills,
    ignoreBrowserslistConfig = modern,
    configPath,
    forceAllTransforms,
    decoratorsLegacy,
    debug = false
  } = options

  let targets = options.targets
  if (modern === true) {
    targets = { esmodules: true }
  } else if (targets === undefined) {
    targets = buildTarget === 'server' ? { node: 'current' } : { ie: 9 }
  }

  let polyfills
  if (modern === false && useBuiltIns === 'usage' && buildTarget === 'client') {
    polyfills = getPolyfills(targets, userPolyfills || defaultPolyfills, {
      ignoreBrowserslistConfig,
      configPath
    })
    plugins.push([require('./polyfillsPlugin'), { polyfills }])
  } else {
    polyfills = []
  }

  // pass options along to babel-preset-env
  presets.push([
    require('@babel/preset-env'), {
      loose,
      modules,
      targets,
      useBuiltIns,
      forceAllTransforms,
      ignoreBrowserslistConfig,
      exclude: polyfills,
      debug
    }
  ])

  plugins.push(
    require('@babel/plugin-syntax-dynamic-import'),
    [require('@babel/plugin-proposal-decorators'), { legacy: decoratorsLegacy !== false }],
    [require('@babel/plugin-proposal-class-properties'), { loose }]
  )

  // transform runtime, but only for helpers
  plugins.push([require('@babel/plugin-transform-runtime'), {
    regenerator: useBuiltIns !== 'usage'
  }])

  return {
    presets,
    plugins
  }
}
