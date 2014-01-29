var async = require('async')

module.exports = function createStopOldContainers(docker) {

  function stopOldContainers(context, data, callback) {
    context.emit('Stopping old containers...')
    async.each
    ( data.oldContainers
    , function (container, eachCallback) {
        container = docker.getContainer(container.id)
        container.stop(function (error) {
          if (!error) context.emit('Stopped old container: ' + container.id)
          eachCallback(error)
        })
      }
    , callback
    )
  }

  return stopOldContainers
}