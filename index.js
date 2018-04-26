var Docker = require('dockerode')
  , createPullRepo = require('./lib/pull-repo')
  , createGetOldContainerDetails = require('./lib/get-old-container-details')
  , createReplaceContainers = require('./lib/replace-containers')

module.exports = function deploy(orderConfig) {

  var docker = new Docker({ socketPath: '/var/run/docker.sock' })
    , steps =
      { init: init
      , pullRepo: createPullRepo(docker, orderConfig.dockerRegistry, orderConfig.dockerAuth)
      , getOldContainerDetails: createGetOldContainerDetails(docker)
      , replaceContainers: createReplaceContainers(docker)
      }

  function getSteps() {
    return steps
  }

  function getStepList() {
    return [
      'init'
    , 'pullRepo'
    , 'getOldContainerDetails'
    , { name: 'replaceContainers', parallel: false, delay: 30 }
    ]
  }

  function init(context, callback) {
    var data = {}
      , appVersion = context.orderArgs[0]
      , environment = context.environment

    // TODO: Time stamp injected into repo (env vars) for instrumentation of startup time

    data.services = context.appData.services
    // data.services = [ { name: 'site', port: '5000', cmd: [ '/usr/local/bin/serve', '-nt', '/app' ] } ]
    // data.envVars = [ { MONGO_URL: 'mongodb://10.0.3.182:27017/lei-site-development' } ]
    // data.services = [
    //   { name: 'site', port: '7366', cmd: [ '/usr/local/bin/node', '/app/dist/site/app.js' ] },
    //   { name: 'admin', port: '7367', cmd: [ '/usr/local/bin/node', '/app/admin/app.js' ] },
    //   { name: 'api', port: '7368', cmd: [ '/usr/local/bin/node', '/app/dist/api/app.js' ] },
    //   { name: 'message-bus', port: '7369', cmd: [ '/usr/local/bin/node', '/app/message-bus/app.js' ] },
    //   { name: 'realtime', port: '7371', cmd: [ '/usr/local/bin/node', '/app/dist/realtime/app.js' ] },
    //   { name: 'worker', port: '7370', cmd: [ '/usr/local/bin/node', '/app/dist/worker/app.js' ] }
    // ]

    data.environment = environment
    data.appVersion = appVersion
    data.containerBaseName = context.appId + '-' + environment
    callback(null, data)
  }

  return {
    getSteps: getSteps
  , getStepList: getStepList
  }
}
