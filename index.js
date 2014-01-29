var Docker = require('dockerode')
  , Etcd = require('node-etcd')
  , publicIp = process.env.PUBLIC_IP || '172.16.42.43'
  , createPullRepo = require('./lib/pull-repo')
  , createGetOldContainerDetails = require('./lib/get-old-container-details')
  , createStartNewContainer = require('./lib/start-new-container')
  , createWaitForNewContainer = require('./lib/wait-for-new-container')
  , createAddNewContainerToProxy = require('./lib/add-new-container-to-proxy')
  , createRemoveOldContainersFromProxy = require('./lib/remove-old-containers-from-proxy')
  , wait = require('./lib/wait')
  , createStopOldContainers = require('./lib/stop-old-containers')
  , getServicesWithPublicPorts = require('./lib/get-services-with-public-ports')

module.exports = function deploy(orderConfig) {

  var dockerHost = orderConfig.docker.host
    , dockerPort = orderConfig.docker.port
    , docker = new Docker({ host: 'http://' + dockerHost, port: dockerPort })
    , etcdHost = orderConfig.etcd.host
    , etcdPort = orderConfig.etcd.port
    , etcd = new Etcd(etcdHost, etcdPort)
    , steps =
      { init: init
      , pullRepo: createPullRepo(docker, orderConfig.dockerRegistry)
      , getOldContainerDetails: createGetOldContainerDetails(docker, getServicesWithPublicPorts)
      // , createNewContainer
      // , generateUpstartScripts
      , startNewContainer: createStartNewContainer(docker, orderConfig.dockerRegistry, getServicesWithPublicPorts)
      , waitForNewContainer: createWaitForNewContainer(publicIp)
      , addNewContainerToProxy: createAddNewContainerToProxy(publicIp, etcd)
      , removeOldContainersFromProxy: createRemoveOldContainersFromProxy(publicIp, etcd)
      , waitFour: wait(4)
      , stopOldContainers: createStopOldContainers(docker)
      }

  function getSteps() {
    return steps
  }

  function getStepList() {
    return Object.keys(steps)
  }

  function init(context, callback) {
    var data = {}
      , environment = context.orderArgs[0]
      , appVersion = context.orderArgs[1]

    //TODO: get environment specfic services, volumes etc
    // at this point appData will contain details of all environments
    data.volumes = context.appData.volumes
    data.services = context.appData.services

    data.environment = environment
    data.appVersion = appVersion
    data.containerBaseName = context.appId + '-' + environment
    callback(null, data)
  }

  return {
    getSteps: getSteps
  , getStepList: getStepList
  }
}
