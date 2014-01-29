var async = require('async')
  , mkdirp = require('mkdirp')

// TODO: Refactor this file

module.exports = function createStartNewContainer(docker, dockerRegistryLocation, getServicesWithPublicPorts) {

  function startNewContainer(context, data, callback) {
    var containerName = data.containerBaseName + '-' + data.appVersion.replace(/\./g, '_')

    context.emit('Spinning up new container ' + data.repoName + ' as ' + containerName)

    async.waterfall
    ( [ function (waterCallback) {
          createAndMapDataVolumes(context, data, waterCallback)
        }
      , function (volumes, waterCallback) {
          createNewContainer(volumes, containerName, context, data, waterCallback)
        }
      , function (container, volumes, waterCallback) {
          startContainer(volumes, container, context, waterCallback)
        }
      , function (container, waterCallback) {
          getNewContainerPorts(container, context, data, waterCallback)
        }
      ]
    , callback
    )
  }

  function createAndMapDataVolumes(context, data, callback) {
    context.emit('Making shared volumes if needed...')
    var volumes = []
    async.each
    ( data.volumes
    , function (volume, eachCallback) {
        mkdirp(volume.hostPath, function (error, made) {
          if (error) {
            context.emit('Error making volume ' + volume.hostPath + ':' + error.message)
          } else {
            context.emit('Made volume:' + made)
            volumes.push(volume.hostPath + ':' + volume.containerPath)
          }
          eachCallback(error)
        })
      }
    , function (error) {
        callback(error, volumes)
      }
    )
  }

  function createNewContainer(volumes, containerName, context, data, callback) {
    context.emit('Creating new container...')
    var ports = {}
    data.services.forEach(function (service) {
      ports[service.port + '/tcp'] = {}
    })
    var options =
      { Image: data.repoName
      , ExposedPorts: ports
      , Env: ['NODE_ENV=' + data.environment]
      , name: containerName
      }
    docker.createContainer(options, function (error, container) {
      if (error) {
        context.emit('Error creating container: ' + error.message)
      } else {
        context.emit('Container created')
      }
      callback(error, container, volumes)
    })
  }

  function startContainer(volumes, container, context, callback) {
    var options =
      { PublishAllPorts: true
      , Binds: volumes
      }
    container.start(options, function (error) {
      if (error) {
        context.emit('Error starting container: ' + error.message)
      } else {
        context.emit('Container started: ' + container.id)
      }
      callback(error, container)
    })
  }

  function getNewContainerPorts(container, context, data, callback) {
    context.emit('Looking for new container services...')
    data.newContainerId = container.id
    docker.listContainers(function (error, containers) {
      // TODO: handle error
      containers.some(function (container) {
        if (container.Id === data.newContainerId) {
          context.emit('Found new container services')
          data.newContainerServices =
            getServicesWithPublicPorts(data.services, container.Ports)
          return true
        }
      })
      callback(error, data)
    })
  }

  return startNewContainer
}