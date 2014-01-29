module.exports = function wait(seconds) {
  var timeout = seconds * 1000
  return function (context, data, callback) {
    context.emit('Waiting ' + seconds + ' seconds...')
    setTimeout(function () {
      callback(null, data)
    }, timeout)
  }
}