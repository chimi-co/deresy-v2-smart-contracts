module.exports = {
              compilers: {
                solc: {
                  version: '0.8.19',
                  settings: {
                    optimizer: {
                      enabled: true,
                      runs: 200,
                    },
                    evmVersion: null
                  }
                }
              }
            }