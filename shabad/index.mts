import { Context, HttpRequest } from '@azure/functions'
import got from 'got'

const getShabad = ( id: string ) => got.get( `https://api.gurbaninow.com/v2/shabad/${id}` ).json()

type Request = HttpRequest & {
  params: {
    id?: string,
  },
}

const main = async ( context: Context, { params: { id } }: Request ) => {
  if ( !id ) {
    return {
      statusCode: 422,
      body: { error: 'Missing id' },
    }
  }

  context.log( `Retrieving Shabad with id ${id}` )

  return {
    body: await getShabad( id ),
  }
}

export default main
