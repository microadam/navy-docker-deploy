var async = require('async')

module.exports = function createAddNewContainerToProxy(publicIp, etcd) {

  function addNewContainerToProxy(context, data, callback) {
    context.emit('Adding new container to proxy...')
    async.each
    ( data.newContainerServices
    , function (service, eachCallback) {
        var newHost = publicIp + ':' + service.publicPort
          , key = 'hipache/' + service.url + '/' + newHost
          , value = 'http://' + newHost

        etcd.set(key, value, function (error) {
          if (!error) context.emit('Added ' + newHost + ' for ' + service.url + ' service')
          eachCallback(error)
        })
      }
    , function (error) {
        callback(error, data)
      }
    )
  }

  return addNewContainerToProxy
}