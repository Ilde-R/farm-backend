const WebSocket = require('ws');

const ws = new WebSocket('wss://farm-backend-xqfk.onrender.com');

ws.on('open', function open() {
  console.log('CONECTADO EXITOSAMENTE AL SERVIDOR RENDER!');
  ws.close();
});

ws.on('error', function error(err) {
  console.error('ERROR AL CONECTAR:', err);
});
