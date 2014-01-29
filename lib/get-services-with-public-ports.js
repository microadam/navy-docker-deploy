var _ = require('lodash')

module.exports = function getServicesWithPublicPorts(services, portMappings) {
  var updatedServices = []
  services.forEach(function (service) {
    var portMap = _.findWhere(portMappings, { PrivatePort: service.port })
      , updatedService = _.clone(service)
    updatedService.publicPort = portMap.PublicPort
    updatedServices.push(updatedService)
  })
  return updatedServices
}