import { ApplicationType, Component } from '@pulumi/azure-native/insights/v20200202'
import { Blob, BlobContainer, HttpProtocol, listStorageAccountKeysOutput, listStorageAccountServiceSASOutput, Permissions, SignedResource, StorageAccount } from '@pulumi/azure-native/storage'
import { AppServicePlan, WebApp } from '@pulumi/azure-native/web'
import { asset, Input, interpolate, StackReference } from '@pulumi/pulumi'

import { name } from './environment'
import functionStorage from './function-storage'

const getConnectionString = ( accountName: Input<string> ) => {
  const storageAccountKeys = listStorageAccountKeysOutput( {
    resourceGroupName: name,
    accountName,
  } )

  const primaryStorageKey = storageAccountKeys.keys[ 0 ].value

  return interpolate`DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${primaryStorageKey}`
}

const signedBlobReadUrl = (
  blob: Blob,
  container: BlobContainer,
  account: StorageAccount,
) => {
  const blobSAS = listStorageAccountServiceSASOutput( {
    accountName: account.name,
    protocols: HttpProtocol.Https,
    sharedAccessExpiryTime: '2030-01-01',
    sharedAccessStartTime: '2021-01-01',
    resourceGroupName: name,
    resource: SignedResource.C,
    permissions: Permissions.R,
    canonicalizedResource: interpolate`/blob/${account.name}/${container.name}`,
    contentType: 'application/json',
    cacheControl: 'max-age=5',
    contentDisposition: 'inline',
    contentEncoding: 'deflate',
  } )

  return interpolate`https://${account.name}.blob.core.windows.net/${container.name}/${blob.name}?${blobSAS.serviceSasToken}`
}

//! No idea why we need this
type AwaitedZ<T> = T extends PromiseLike<infer U> ? U : T

type AzureFunctionOptions = {
  functionName: string,
  route?: string,
  storage: AwaitedZ<ReturnType<typeof functionStorage>>,
}

const azureFunction = ( {
  functionName,
  route = functionName,
  storage: { blobContainer, storageAccount },
}: AzureFunctionOptions ) => {
  // Upload Azure Function's code as a zip archive to the storage account.
  const codeBlob = new Blob( `${functionName}-blob`, {
    resourceGroupName: name,
    accountName: storageAccount.name,
    containerName: blobContainer.name,
    source: new asset.AssetArchive( {
      [ functionName ]: new asset.FileArchive( `../dist/${functionName}` ),
      node_modules: new asset.FileArchive( '../dist/node_modules' ),
      'package.json': new asset.FileAsset( '../dist/package.json' ),
      'package-lock.json': new asset.FileAsset( '../dist/package-lock.json' ),
      'host.json': new asset.FileAsset( '../dist/host.json' ),
    } ),
  } )

  const plan = new AppServicePlan( `${functionName}-app-service-plan`, {
    resourceGroupName: name,
    sku: {
      name: 'Y1',
      tier: 'Dynamic',
    },
  } )

  const storageConnectionString = getConnectionString( storageAccount.name )
  const codeBlobUrl = signedBlobReadUrl( codeBlob, blobContainer, storageAccount )

  const appInsights = new Component( `${functionName}-app-insights`, {
    resourceGroupName: name,
    applicationType: ApplicationType.Web,
    kind: 'web',
    workspaceResourceId: new StackReference( `ShabadOS/shared/${name}` ).getOutput( 'logAnalyticsWorkspaceId' ),
  } )
  const appInsightsConnectionString = interpolate`InstrumentationKey=${appInsights.instrumentationKey}`

  const app = new WebApp( `${functionName}-web-app`, {
    resourceGroupName: name,
    serverFarmId: plan.id,
    kind: 'functionapp',
    siteConfig: {
      cors: {
        allowedOrigins: [ '*' ],
      },
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnectionString },
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' },
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' },
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~16' },
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: codeBlobUrl },
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString },
      ],
      http20Enabled: true,
      nodeVersion: '~16',
    },
  } )

  const endpoint = interpolate`https://${app.defaultHostName}/api/${route}`

  return { endpoint }
}

export default azureFunction
