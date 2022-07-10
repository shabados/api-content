import { WorkerScriptArgs } from '@pulumi/cloudflare'
import { WorkerScriptKvNamespaceBinding, WorkerScriptPlainTextBinding, WorkerScriptSecretTextBinding, WorkerScriptWebassemblyBinding } from '@pulumi/cloudflare/types/input'
import { Config, CustomResourceOptions, dynamic, Input, Output, output } from '@pulumi/pulumi'
import got from 'got'

const CLOUDFLARE_ENDPOINT = 'https://api.cloudflare.com/client/v4'

type CommonWorkerOptions = {
  accountId: string,
  name: string,
  apiKey: string,
}

type UploadWorkerOptions = CommonWorkerOptions & {

}

const uploadModuleWorker = ( {
  accountId,
  name,
  apiKey,
}: UploadWorkerOptions ) => got.put( `${CLOUDFLARE_ENDPOINT}/accounts/${accountId}/workers/scripts/${name}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
  form: {
    x: new File( [], '', { type: 'application/javascript' } ),
  },
} )

type DeleteWorkerOptions = CommonWorkerOptions & {

}

const deleteWorker = ( {
  accountId,
  name,
  apiKey,
}: DeleteWorkerOptions ) => got.delete( `${CLOUDFLARE_ENDPOINT}/accounts/${accountId}/workers/scripts/${name}`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
} )

const config = new Config()
const accountId = config.require( 'cloudflare:accountId' )
const apiKey = config.requireSecret( 'cloudflare:apiToken' ).apply( console.log )

export type WorkerScriptResourceInputs = {
  /**
     * The script content.
     */
  content: Input<string>,
  kvNamespaceBindings?: Input<Input<WorkerScriptKvNamespaceBinding>[]>,
  /**
      * The global variable for the binding in your Worker code.
      */
  name: Input<string>,
  plainTextBindings?: Input<Input<WorkerScriptPlainTextBinding>[]>,
  secretTextBindings?: Input<Input<WorkerScriptSecretTextBinding>[]>,
  webassemblyBindings?: Input<Input<WorkerScriptWebassemblyBinding>[]>,
}

type WorkerScriptInputs = {
  /**
     * The script content.
     */
  content: string,
  kvNamespaceBindings?: WorkerScriptKvNamespaceBinding[],
  /**
      * The global variable for the binding in your Worker code.
      */
  name: string,
  plainTextBindings?: WorkerScriptPlainTextBinding[],
  secretTextBindings?: WorkerScriptSecretTextBinding[],
  webassemblyBindings?: WorkerScriptWebassemblyBinding[],
}

const cloudflareWorkerScriptProvider: dynamic.ResourceProvider = {
  async create( inputs: WorkerScriptInputs ) {
    const ocktokit = new Ocktokit( { auth } )
    const label = await ocktokit.issues.createLabel( inputs )
    return { id: label.data.id.toString(), outs: label.data }
  },
  async update( _id, olds: WorkerScriptInputs, news: WorkerScriptInputs ) {
    const ocktokit = new Ocktokit( { auth } )
    const label = await ocktokit.issues.updateLabel( { ...news, current_name: olds.name } )
    return { outs: label.data }
  },
  async delete( _id, { name }: WorkerScriptInputs ) {
    await deleteWorker( { name, accountId, apiKey } )
  },
}

export class ModuleWorkerScript extends dynamic.Resource {
  /**
     * The script content.
     */
  readonly content: Output<string>

  readonly kvNamespaceBindings: Output<WorkerScriptKvNamespaceBinding[] | undefined>

  /**
        * The global variable for the binding in your Worker code.
        */
  readonly name: Output<string>

  readonly plainTextBindings: Output<WorkerScriptPlainTextBinding[] | undefined>

  readonly secretTextBindings: Output<WorkerScriptSecretTextBinding[] | undefined>

  readonly webassemblyBindings: Output<WorkerScriptWebassemblyBinding[] | undefined>

  constructor( name: string, args: WorkerScriptArgs, opts?: CustomResourceOptions ) {
    super( cloudflareWorkerScriptProvider, name, args, opts )

    this.content = output( args.content )
    this.kvNamespaceBindings = output( args.kvNamespaceBindings )

    this.name = output( args.name )
    this.plainTextBindings = output( args.plainTextBindings )
    this.secretTextBindings = output( args.secretTextBindings )
    this.webassemblyBindings = output( args.webassemblyBindings )
  }
}
