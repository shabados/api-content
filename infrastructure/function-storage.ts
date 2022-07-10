import { BlobContainer, Kind, SkuName, StorageAccount } from '@pulumi/azure-native/storage'

import { name } from './environment'

type FunctionStorageOptions = {
  accountName: string,
}

const functionStorage = ( {
  accountName,
}: FunctionStorageOptions ) => {
  const storageAccount = new StorageAccount( `${accountName}-storage-account`, {
    accountName,
    resourceGroupName: name,
    sku: {
      name: SkuName.Standard_LRS,
    },
    kind: Kind.StorageV2,
  } )

  const blobContainer = new BlobContainer( `${accountName}-blob-container`, {
    resourceGroupName: name,
    accountName: storageAccount.name,
  } )

  return { storageAccount, blobContainer }
}

export default functionStorage
