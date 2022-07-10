import { Request, Router } from 'itty-router'

const softenResponse = ( response: Response ) => new Response(
  response.body,
  { headers: response.headers }
)

const withCors = ( response: Response ) => {
  response.headers.set( 'Access-Control-Allow-Origin', '*' )

  return response
}

const targets = {
  gurbaninow: 'https://api.gurbaninow.com/v2',
  function: 'https://shabad-web-app12079e8a.azurewebsites.net/api',
  blob: 'https://shabadosexpapinext.z13.web.core.windows.net',
  cdn: 'https://cdn-endpoint-shabadosexpapinext.azureedge.net/',
}

type GetRequest = Request & {
  params: {
    id?: string,
  },
  query: {
    mode?: keyof typeof targets,
  },
}

const router = Router()

router.get( '/api/shabad/:id', async (
  { params: { id }, query: { mode = 'function' } }: GetRequest,
) => {
  if ( !id ) {
    return new Response( JSON.stringify( {
      error: 'Missing parameter id',
    } ), { status: 422 } )
  }

  console.log( `Retrieving Shabad with id ${id} with mode ${mode}` )

  const target = targets[ mode ]

  return fetch( `${target}/shabad/${id}`, {
    cf: {
      cacheTtl: 75,
      cacheEverything: true,
    },
  } )
    .then( softenResponse )
    .then( withCors )
} )

export default {
  fetch: router.handle,
}
