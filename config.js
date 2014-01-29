var config = { 'docker-deploy':
  { command: 'deploy'
  , config:
    { docker: { host: '172.16.42.43', port: '4243' }
    , dockerRegistry: '172.16.42.43:5000'
    , etcd: { host: '172.16.42.43', port: '4001' }
    }
  }
}
config = config


var appData =
  { services:
    [ { url: 'shopper.localdocker', port: 5403 }
    , { url: 'admin.shopper.localdocker', port: 5404 }
    , { url: 'api.shopper.localdocker', port: 5405 }
    ]
  , volumes:
    [ { containerPath: '/var/log/supervisor'
      , hostPath: '/var/log/application/shopper.localdocker'
      }
    ]
  }
appData = appData
