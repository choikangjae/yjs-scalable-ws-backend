import express from 'express'
import { WebSocketServer } from 'ws';
import http from 'http';

import config from './config.js';
import { serverLogger } from './logger/index.js';
import setupWSConnection, { cleanup } from './setupWSConnection.js';

//Create express application. Remember that express is not HTTP Server.
export const app = express();
//Make server with the express application.
export const server = http.createServer(app);
//Open websocket server. WebSocketServer extends EventEmitter.
//We use the EventEmitter to handle the events.
export const wss = new WebSocketServer({ server });

//When WebSocket is Connected.
wss.on('connection', async (ws, req) => {
  //1. Create WebSocket Shared Y.Doc.
  //2. Retrieve the data from the Source of Truth.
  //3.
  await setupWSConnection(ws, req);
});

//when HTTP server got request to upgrade to WebSocket Server
server.on('upgrade', (req, socket, head) => {
  // todo auth logic.

  //upgrade request handler.
  wss.handleUpgrade(req, socket, head, (ws) => {
    //emit() is used to trigger an 'connection' event.
    wss.emit('connection', ws, req);
  })
});

//run is a async function that returns Promise which returns a function that returns Promise.
export const run = async (): Promise<() => Promise<void>> => {

  //Start Server.
  await new Promise<void>(resolve => {
    server.listen(config.server.port, config.server.host, () => {
      resolve();
    })
  });

  //Stop server.
  return async () => {
    //Clean up the Y.Doc. Remember that Y.Doc is ephemeral.
    cleanup();

    //Close WebSocket.
    await new Promise<void>(resolve => {
      wss.close(() => {
        resolve()
      })
    });

    //Close HTTP server.
    await new Promise<void>(resolve => {
      server.close(() => {
        resolve()
      })
    })
  };
}

//If url is file..??
if (import.meta.url === `file://${process.argv[1]}`) {
  //Catch the error.
  process.on('unhandledRejection', (err) => {
    serverLogger.error(err);
    throw err;
  });

  //Start Server.
  run().then(() => serverLogger.info(`listening on ${config.server.host}:${config.server.port}`))
}