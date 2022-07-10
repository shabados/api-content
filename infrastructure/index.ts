import { Kind, SkuName, StorageAccount } from '@pulumi/azure-native/storage'
import { interpolate } from '@pulumi/pulumi'

import azureFunctionModule from './azure-function'
import bucketApiModule from './bucket-api'
import { name } from './environment'
// import cloudflareWorkerModule from './cloudflare-worker'
import functionStorageModule from './function-storage'

const codeStorage = functionStorageModule( { accountName: 'bluevelvetcake' } )

const shabadFunction = azureFunctionModule( {
  functionName: 'shabad',
  storage: codeStorage,
} )

const standardApiStorage = new StorageAccount( 'api-test-storage2', {
  accountName: 'shabadosexpapinext',
  resourceGroupName: name,
  sku: { name: SkuName.Standard_LRS },
  kind: Kind.StorageV2,
} )
const standardBucketApi = bucketApiModule( { storageAccount: standardApiStorage } )

interpolate`Azure Function: ${shabadFunction.endpoint}`.apply( console.log )

interpolate`Standard Blob Storage: ${standardBucketApi.staticEndpoint}`.apply( console.log )
interpolate`Standard Blob Storage CDN: ${standardBucketApi.cdnEndpoint}`.apply( console.log )

// cloudflareWorkerModule( {
//   name: 'shabad-edge',
//   function: shabadFunction,
// } )
