module.exports = function createPullRepo(docker, dockerRegistryLocation, dockerAuth) {

  function pullRepo(context, data, callback) {
    data.repoName = dockerRegistryLocation + '/' + context.appId + ':' + data.appVersion
    context.emit('Pulling repo: ' + data.repoName)
    var options = { authconfig: dockerAuth }
    docker.pull(data.repoName, options, function (error, stream) {
      var errorMsgPrefix = 'Error pulling repo ' + data.repoName + ': '
        , dataError = false

      if (error) {
        return callback(new Error(errorMsgPrefix + error.message))
      }

      stream.on('data', function (data) {
        var jsonLines = data.toString().trim().split('\r\n')
        jsonLines.forEach(function (line) {
          var json = JSON.parse(line)
          context.emit('Repo status: ' + json.status)
          if (json.error) {
            var msg = errorMsgPrefix + json.error
            context.emit(msg)
            dataError = new Error(msg)
          }
        })
      })

      stream.on('end', function() {
        if (dataError) {
          callback(dataError)
        } else {
          callback(null, data)
        }
      })

    })
  }

  return pullRepo
}