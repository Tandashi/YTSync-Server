import http from 'http';
import socketIO from 'socket.io';

const port = process.env.port || 8080;

const server = http.createServer();

const io = socketIO(server, {
  path: '/socket.io',
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false
});

io.of(/.*/).on('connection', (socket: SocketIO.Socket) => {

    console.log(`Connection: ${socket.id}`);

    socket.on('message', (data) => {
        socket.nsp.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log(`Disconnect: ${socket.id}`);
    });

    socket.emit('message', 'pause');

});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});