import { Endpoint, Profile, QueryStringCachingBehavior, SkuName } from '@pulumi/azure-native/cdn'
import { Blob, BlobServiceProperties, StorageAccount, StorageAccountStaticWebsite } from '@pulumi/azure-native/storage'
import { asset, interpolate } from '@pulumi/pulumi'

import { name } from './environment'

const files = [ 'shabad/DMP.json' ]

type BucketApiOptions = {
  storageAccount: StorageAccount,
}

const BucketApi = ( {
  storageAccount,
}: BucketApiOptions ) => storageAccount.name.apply( ( storageAccountName ) => {
  const staticWebsite = new StorageAccountStaticWebsite( `${storageAccountName}-storage-static-website`, {
    accountName: storageAccountName,
    resourceGroupName: name,
  } )

  new BlobServiceProperties( `${storageAccountName}-blob-service-properties`, {
    resourceGroupName: name,
    blobServicesName: 'default',
    accountName: storageAccountName,
    cors: {
      corsRules: [
        {
          allowedHeaders: [ '*' ],
          allowedMethods: [ 'GET' ],
          allowedOrigins: [ '*' ],
          exposedHeaders: [ '*' ],
          maxAgeInSeconds: 1000,
        },
      ],
    },
  } )

  files.forEach( ( fileName ) => {
    new Blob( `${storageAccountName}-blob-${fileName}`, {
      resourceGroupName: name,
      accountName: storageAccountName,
      containerName: staticWebsite.containerName,
      source: new asset.FileArchive( '../bucket-api' ),
      contentType: 'application/json',
      blobName: fileName.split( '.' )[ 0 ],
    } )
  } )

  const staticEndpoint = storageAccount.primaryEndpoints.web

  const endpointOrigin = storageAccount.primaryEndpoints.apply( ( ep ) => ep.web.replace( 'https://', '' ).replace( '/', '' ) )

  const profile = new Profile( `${storageAccountName}-api-profile`, {
    resourceGroupName: name,
    sku: {
      name: SkuName.Standard_Microsoft,
    },
  } )

  const endpoint = new Endpoint( `${storageAccountName}-api-endpoint`, {
    endpointName: `cdn-endpoint-${storageAccountName}`,
    isHttpAllowed: false,
    isHttpsAllowed: true,
    originHostHeader: endpointOrigin,
    origins: [ {
      hostName: endpointOrigin,
      httpsPort: 443,
      name: 'origin-storage-account',
    } ],
    profileName: profile.name,
    queryStringCachingBehavior: QueryStringCachingBehavior.NotSet,
    resourceGroupName: name,
  } )

  const cdnEndpoint = interpolate`https://${endpoint.hostName}/`

  return { cdnEndpoint, staticEndpoint }
} )

export default BucketApi
