
import {
  serve,
  type HttpBindings,
} from '@hono/node-server'

import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

import {
  basePath,
  baseRoutePath,
  matchedRoutes,
  routePath,
} from 'hono/route'

import { upgradeWebSocket } from '@hono/cloudflare-workers'

import { WebSocketServer } from 'ws'

// import "dotenv/config"
import usersRoute from "./routes/user.js";

// import { getConnInfo } from 'hono/cloudflare-workers'

// const app = new Hono()


/* -- MongoDB -- */



/* -- Type shi -- */
// Type of stuff to find information about the
// incoming HTTP connection (remote address, etc.)
type Bindings = HttpBindings

type Env = {
  Bindings: Bindings
}


/* -- Aplication prut noget */

// Separate API application.
// It will be mounted under /api later.
const apiApp = new Hono<Env>()

const app = new Hono<Env>()

/* -- Err -- */
app.onError((err, c) => {
  console.log(err);
  return c.json({
    error: err.message
  }, 500);
})

app.notFound((c) => {
  return c.text('woahoh its a 404!', 404)
})


/* -- Global Fetch -- */
app.get("/", c => c.text("Hono + MongoDB API"));
app.route("/users", usersRoute)

/* -- Those thingies with uhh main routes -- */
app.get('/', (c) => {
  return c.json({
    remoteAddress: c.env.incoming.socket.remoteAddress,
  })
})

//fetches the id from path and shows the id in a good looking ahhh object
app.get("/todos/:id", (c) => {
  const id = c.req.param("id");
  return c.json({
    id,
  })
})

app.get('/posts/:id/comment/:comment_id', async (c) => {
  const { id, comment_id } = c.req.param()

  return c.json({
    id,
    comment_id,
  })
})

app.get('/post/:date{[0-9]+}/:title{[a-z]+}', async (c) => {
  const { date, title } = c.req.param()

  return c.json({
    date,
    title,
  })
})

// Ikke mapped
// Serves files relative to the current module directory.
// app.use('/static/*', serveStatic({
//   root: fileURLToPath(new URL('./', import.meta.url))
// }))

// Mapping:
// Requests to /static/... are rewritten to /statics/...
app.get(
  '/static/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) =>
      path.replace(/^\/static/, '/statics'),
  })
)

// Serve favicon
app.use(
  '/favicon.ico',
  serveStatic({
    path: './favicon.ico',
  })
)

// Serve files from the static folder.
// Be aware that this is a catch-all static handler.
app.use(
  '*',
  serveStatic({
    root: './static',
  })
)


/* -- Route Information -- */
// Write in URL: /posts/(anId)
app.get('/posts/:id', (c) => {
  const currentPath = routePath(c) // '/posts/:id'

  // Returns an array of all routes matched by the current request.
  const routes = matchedRoutes(c)

  return c.json({
    path: currentPath,
    totalRoutes: routes.length,
  })
})


/* -- Middleware noget Api -- */

// Middleware for all routes inside apiApp.
// Since apiApp is mounted at /api, this matches /api/*.
apiApp.use('*', async (c, next) => {
  console.log('API middleware')
  await next()
})

app.use(async (c, next) => {
  const start = performance.now()
  await next()
  const end = performance.now()
  c.res.headers.set('X-Response-Time', `${end - start}`)
})


/* -- Api Routes -- */

// Basic helper router, som hjælper om information omkring routing.
apiApp.get('/posts/:id', (c) => {
  return c.json({
    routePath: routePath(c),
    baseRoutePath: baseRoutePath(c),
    basePath: basePath(c),
  })
})

// Returns an array of all routes matched by the current request,
// including middleware.
//
// Example:
// [
//   { method: 'ALL', path: '/api/*', handler: [Function] },
//   { method: 'GET', path: '/api/users/:id', handler: [Function] }
// ]
apiApp.get('/users/:id', (c) => {
  const routes = matchedRoutes(c)
  const text = c.req.param('text')

  return c.json({
    id: c.req.param('id'),
    text: text,
    routes: routes.length,
  })
})


/* -- Mount Api Aplications -- */
// Mounts apiApp under /api.
//
// apiApp.get('/users/:id') becomes /api/users/:id
// apiApp.get('/posts/:id') becomes /api/posts/:id
app.route('/api', apiApp)


/* -- Websockets -- */

// WebSocket endpoint.
// upgradeWebSocket handles the HTTP -> WebSocket upgrade.
app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`)
        ws.send('Hello from server!')
      },
      onClose: () => {
        console.log('Connection closed');
      }
    }
  })
)

// WebSocket server used by the Node adapter.
const wss = new WebSocketServer({
  noServer: true,
})


/* -- Optional Connection -- */

// Alternative way to retrieve remote connection information
// using Hono's connection helper.
//
// app.get('/', (c) => {
//   const info = getConnInfo(c)
//   return c.text(`Your remote address is ${info.remote.address}`)
// })



/* -- Server  --*/
// Start ONE server.
// The returned server instance is used for graceful shutdown.

const server = serve(
  {
    fetch: app.fetch,
    websocket: {
      server: wss,
    },
    port: 3300,
  },
  (info) => {
    console.log(
      `Server is running on http://localhost:${info.port}`
    )
  }
)


// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('SIGINT received. Closing server...')
  server.close()
})

// Handle termination signal
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...')
  server.close()
})
