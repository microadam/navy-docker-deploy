var async = require('async')

module.exports = function createReplaceContainers(docker) {

  function replaceContainers(context, data, callback) {
    stopOldContainers(context, data, function (error) {
      if (error) return callback(error)
      startNewContainers(context, data, callback)
    })
  }

  function stopOldContainers(context, data, callback) {
    context.emit('Stopping old containers...')
    async.each
    ( data.oldContainers
    , function (container, eachCallback) {
        container = docker.getContainer(container.id)
        container.stop(function (error) {
          if (error && error.reason !== 'container already stopped') return eachCallback(error)
          context.emit('Stopped old container: ' + container.id)
          container.remove(function (error) {
            if (error) return eachCallback(error)
            context.emit('Deleted old container: ' + container.id)
            eachCallback()
          })
        })
      }
    , callback
    )
  }

  function startNewContainers(context, data, callback) {
    async.each(data.services
    , function (service, cb) {
        var containerName = data.containerBaseName + '-' + service.name + '-' + data.appVersion.replace(/\./g, '_')

        context.emit('Spinning up new container ' + data.repoName + ' as ' + containerName)

        async.waterfall
        ( [ function (waterCallback) {
              createNewContainer(containerName, service, context, data, waterCallback)
            }
          , function (container, waterCallback) {
              startContainer(container, context, waterCallback)
            }
          ]
        , cb
        )
      }
    , callback
    )
  }

  function createNewContainer(containerName, service, context, data, callback) {
    context.emit('Creating new container...')
    var envVars = [ 'NODE_ENV=' + data.environment ]
    data.envVars.forEach(function (envVar) {
      var key = Object.keys(envVar)[0]
      envVars.push(key + '=' + envVar[key])
    })

    var options =
      { Image: data.repoName
      , Cmd: service.cmd
      , Env: envVars
      , name: containerName
      , HostConfig: { NetworkMode: 'host' }
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
      } else {
        context.emit('Container started: ' + container.id)
      }
      callback(error, container)
    })
  }

  return replaceContainers
}