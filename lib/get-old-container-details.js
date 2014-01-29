module.exports = function createGetOldContainerDetails(docker, getServicesWithPublicPorts) {

  function getOldContainerDetails(context, data, callback) {
    var options = {}

    // options = { all: 1 }
    docker.listContainers(options, function (error, containerList) {
      context.emit('Looking for old containers...')
      var containers = []
      containerList.forEach(function (container) {
        // context.emit(111, container)
        var isActive = container.Status.indexOf('Up') === 0
          , hasMatchingName = container.Names[0].indexOf(data.containerBaseName) > -1
        if (isActive && hasMatchingName) {
          var services = getServicesWithPublicPorts(data.services, container.Ports)
          context.emit('Found container: ' + container.Id)
          containers.push({ id: container.Id, services: services })
        }
      })
      data.oldContainers = containers
      callback(error, data)
    })
  }

  return getOldContainerDetails

}