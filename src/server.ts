import http from 'http';
import socketIO from 'socket.io';
import RoomService from './service/room-service';
import { VideoState, Message } from './model/messages';

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
        if(room.isHost(socket)) {
            try {
                const [command, cmdData] = data.split(" ");

                switch(command) {
                    case Message.PLAY:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PLAYING);
                        break;
                    case Message.PAUSE:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PAUSED);
                        break;
                    case Message.PLAY_VIDEO:
                        room.setCurrentVideo(cmdData, true);
                        break;
                    case Message.ADD_TO_QUEUE:
                        room.addVideoToQueue(cmdData);
                        break;
                    case Message.DELETE_FROM_QUEUE:
                        room.removeVideoFromQueue(cmdData);
                        break;
                    default:
                        return;
                }

                room.sendToAll(command, cmdData, [socket]);
            }
            catch(e) {
                console.error(e);
                return;
            }
        }
        else {
            room.syncClienToRoom(socket);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Disconnect: ${socket.id}`);

        room.removeClient(socket);
        if (room.isEmpty()) {
            RoomService.removeRoom(room);
        }
    });

});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});