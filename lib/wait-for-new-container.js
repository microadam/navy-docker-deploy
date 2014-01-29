var async = require('async')
  , request = require('request')

module.exports = function createWaitForNewContainer(publicIp) {

  function waitForNewContainer(context, data, callback) {
    var orders = []
    data.newContainerServices.forEach(function (service) {
      var serviceUrl = 'http://' + publicIp + ':' + service.publicPort
      orders.push(createCheckService(serviceUrl, context.emit))
    })
    async.parallel(orders, function (error) {
      callback(error, data)
    })
  }

  function createCheckService(url, emit) {

    function checkService(url, callback) {
      request(url, function (error, response) {
        if (!error && response.statusCode) {
          emit('Service ' + url + ' is now available')
          return callback(null)
        } else if (!error || (error && error.message === 'connect ECONNREFUSED')) {
          return setTimeout(function () {
            checkService(url, callback)
          }, 1000)
        } else {
          return callback(error)
        }
      })
    }

    return function (callback) {
      emit('Waiting for service ' + url + ' to become available...')
      checkService(url, callback)
    }
  }

  return waitForNewContainer
}



