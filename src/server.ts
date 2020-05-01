import http from 'http';
import socketIO from 'socket.io';
import RoomService from './service/room-service';
import { Role } from './model/roles';

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

    const room = RoomService.getRoom(socket);

    socket.on('message', (data) => {
        if(room.getClient(socket).role === Role.HOST) {
            room.sendToAllExcept(data, [socket]);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Disconnect: ${socket.id}`);
    });

});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});