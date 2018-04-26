module.exports = function createGetOldContainerDetails(docker, getServicesWithPublicPorts) {

  function getOldContainerDetails(context, data, callback) {
    var options = { all: 1 }

    docker.listContainers(options, function (error, containerList) {
      if (error) return callback(error)
      context.emit('Looking for old containers...')
      var containers = []
      containerList.forEach(function (container) {
        var hasMatchingName = container.Names[0].indexOf(data.containerBaseName) > -1
        if (hasMatchingName) {
          context.emit('Found container: ' + container.Id)
          containers.push({ id: container.Id })
        }
      })
      data.oldContainers = containers
      callback(null, data)
    })
  }

  return getOldContainerDetails

}