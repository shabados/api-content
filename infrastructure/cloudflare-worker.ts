import { WorkerRoute } from '@pulumi/cloudflare'
import { readFileSync } from 'fs'

import azureFunction from './azure-function'
import { ModuleWorkerScript } from './providers/cloudflare-worker'

//! No idea why we need this
type AwaitedZ<T> = T extends PromiseLike<infer U> ? U : T

type CloudflareWorkerOptions = {
  name: string,
  path?: string,
  function: AwaitedZ<ReturnType<typeof azureFunction>>,
}

const cloudflareWorker = ( {
  name,
  path = `../dist/${name}/index.js`,
  function: { endpoint },
}: CloudflareWorkerOptions ) => {
  const workerCode = readFileSync( path, { encoding: 'utf-8' } )

  const script = new ModuleWorkerScript( `${name}-worker-script`, {
    name,
    content: workerCode,
    plainTextBindings: [ { name: 'CORE_ENDPOINT', text: endpoint } ],
  } )

  new WorkerRoute( `${name}-worker-route`, {
    zoneId: 'harjot-shabados.workers.dev',
    pattern: '/api',
    scriptName: script.name,
  } )
}

export default cloudflareWorker
