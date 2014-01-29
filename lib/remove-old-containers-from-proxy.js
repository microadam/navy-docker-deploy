var async = require('async')

module.exports = function createRemoveOldContainersFromProxy(publicIp, etcd) {

  function removeOldContainersFromProxy(context, data, callback) {
    context.emit('Removing old containers from proxy...')
    async.each
    ( data.oldContainers
    , function (container, eachCallback) {
        context.emit('Removing services for container: ' + container.id)
        async.each
        ( container.services
        , function (service, innerEachCallback) {
            var oldHost = publicIp + ':' + service.publicPort
              , key = 'hipache/' + service.url + '/' + oldHost

            etcd.del(key, function (error) {
              if (error && error.message === 'Key not found') {
                error = null
              }
              if (!error) context.emit('Removed ' + oldHost + ' for ' + service.url + ' service')
              innerEachCallback(error)
            })
          }
        , eachCallback
        )
      }
    , function (error) {
        callback(error, data)
      }
    )
  }

  return removeOldContainersFromProxy
}