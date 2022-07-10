import { interpolate } from '@pulumi/pulumi'
import azureFunctionModule from './azure-function'
// import cloudflareWorkerModule from './cloudflare-worker'
import functionStorageModule from './function-storage'

const codeStorage = functionStorageModule( { accountName: 'bluevelvetcake' } )

const shabadFunction = azureFunctionModule( {
  functionName: 'shabad',
  storage: codeStorage,
} )

interpolate`Azure Function: ${shabadFunction.endpoint}`.apply( console.log )

// cloudflareWorkerModule( {
//   name: 'shabad-edge',
//   function: shabadFunction,
// } )
