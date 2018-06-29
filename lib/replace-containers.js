var async = require('async')
  , os = require('os')

module.exports = function createReplaceContainers(docker) {

  var containerActions =
    { start: startContainer
    , stop: stopContainer
    , remove: removeContainer
    }

  function replaceContainers(context, data, callback) {
    // must stop old containers first - otherwise ports clash
    stopOldContainers(context, data, function (error) {
      if (error) return callback(error)
      startNewContainers(context, data, function (error, success) {
        if (error) return callback(error)
        if (success) return removeOldContainers(context, data, callback)
        context.emit('ERROR: New containers did not become healthy. Rolling back')
        rollbackToOldContainers(context, data, function (error) {
          if (error) return callback(error)
          callback(new Error('Deployment rolled back. New containers were not healthy'))
        })
      })
    })
  }

  function stopOldContainers(context, data, callback) {
    context.emit('Stopping old containers...')
    iterateContainers('stop', data.oldContainers, context, callback)
  }

  function stopNewContainers(context, data, callback) {
    context.emit('Stopping new containers...')
    iterateContainers('stop', data.newContainers, context, callback)
  }

  function removeOldContainers(context, data, callback) {
    context.emit('Removing old containers...')
    iterateContainers('remove', data.oldContainers, context, callback)
  }

  function removeNewContainers(context, data, callback) {
    context.emit('Removing new containers...')
    iterateContainers('remove', data.newContainers, context, callback)
  }

  function startOldContainers(context, data, callback) {
    context.emit('Starting old containers...')
    iterateContainers('start', data.oldContainers, context, callback)
  }

  function rollbackToOldContainers(context, data, callback) {
    context.emit('Rolling back to old containers...')
    var tasks =
      [ stopNewContainers.bind(null, context, data)
      , startOldContainers.bind(null, context, data)
      , removeNewContainers.bind(null, context, data)
      ]
    async.waterfall(tasks, callback)
  }

  function iterateContainers(action, containers, context, callback) {
    async.each
    ( containers
    , function (container, eachCallback) {
        container = docker.getContainer(container.id)
        containerActions[action](container, context, eachCallback)
      }
    , callback
    )
  }

  function startNewContainers(context, data, callback) {
    var allStartedHeathily = true
    async.each(data.services
    , function (service, cb) {
        var containerName = data.containerBaseName + '-' + service.name + '-' + data.appVersion.replace(/\./g, '_')

        context.emit('Spinning up new container ' + data.repoName + ' as ' + containerName)
        data.newContainers = []

        async.waterfall
        ( [ function (waterCallback) {
              createNewContainer(containerName, service, context, data, function (error, container) {
                if (error) return waterCallback(error)
                data.newContainers.push(container)
                waterCallback(null, container)
              })
            }
          , function (container, waterCallback) {
              startContainer(container, context, waterCallback)
            }
          , function (container, waterCallback) {
              runHealthCheck(container, function (error, healthy) {
                if (error) return waterCallback(error)
                if (!healthy) allStartedHeathily = false
                waterCallback()
              })
            }
          ]
        , cb
        )
      }
    , function (error) {
        callback(error, allStartedHeathily)
      }
    )
  }

  function runHealthCheck(container, callback) {
    var interval = null
      , timeout = null
    interval = setInterval(function () {
      container.inspect(function (error, data) {
        if (error) return callback(error)
        if (data.State.Restarting) {
          clearInterval(interval)
          clearTimeout(timeout)
          return callback(null, false)
        }
      })
    }, 1000)
    timeout = setTimeout(function () {
      clearInterval(interval)
      callback(null, true)
    }, 30000)
  }

  function createNewContainer(containerName, service, context, data, callback) {
    context.emit('Creating new container...')
    var envVars =
      [ 'NODE_ENV=' + data.environment
      , 'LAUNCH_TIME=' + Date.now()
      , 'HOST_HOSTNAME=' + os.hostname()
      , 'DEPLOY_VERSION=' + data.appVersion
      ]
    data.envVars.forEach(function (envVar) {
      var key = Object.keys(envVar)[0]
      envVars.push(key + '=' + envVar[key])
    })

    var options =
      { Image: data.repoName
      , Cmd: service.cmd
      , Env: envVars
      , name: containerName
      , HostConfig: { NetworkMode: 'host', RestartPolicy: { Name: 'unless-stopped' } }
      }
    docker.createContainer(options, function (error, container) {
      if (error) {
        context.emit('Error creating container: ' + error.message)
      } else {
        context.emit('Container created')
      }
      callback(error, container)
    })
  }

  function startContainer(container, context, callback) {
    container.start(function (error) {
      if (error) {
        context.emit('Error starting container: ' + error.message)
        return callback(error)
      }
      context.emit('Container started: ' + container.id)
      callback(null, container)
    })
  }

  function stopContainer(container, context, callback) {
    container.stop(function (error) {
      if (error && error.reason !== 'container already stopped') {
        context.emit('Error stopping container: ' + error.message)
        return callback(error)
      } else {
        context.emit('Container stopped: ' + container.id)
      }
      callback(null, container)
    })
  }

  function removeContainer(container, context, callback) {
    container.remove(function (error) {
      if (error) return callback(error)
      context.emit('Deleted container: ' + container.id)
      callback()
    })
  }

  return replaceContainers
}