import http from 'http';
import socketIO from 'socket.io';
import RoomService from './service/room-service';
import { VideoState, Message } from './model/message';
import logger from './logger';

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
    logger.info(`Connection: ${socket.id}`);

    const room = RoomService.getRoom(socket);

    socket.on('message', (data: string) => {
        try {
            // Check if socket is host. If not we ignore the send command.
            if(room.isHost(socket)) {
                const json = JSON.parse(data);
                const command = json.action;
                const cmdData = json.data;

                switch(command) {
                    case Message.PLAY:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PLAYING, socket);
                        break;
                    case Message.PAUSE:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PAUSED, socket);
                        break;
                    case Message.PLAY_VIDEO:
                        room.setCurrentVideo(cmdData);
                        break;
                    case Message.ADD_TO_QUEUE:
                        room.addVideoToQueue(cmdData.videoId, cmdData.title, cmdData.byline);
                        break;
                    case Message.REMOVE_FROM_QUEUE:
                        room.removeVideoFromQueue(cmdData);
                        break;
                    default:
                        return;
                }
            }
            else {
                // Socket wasnt a host so we need to resync him
                room.syncClientToRoom(socket, false);
            }
        }
        catch(e) {
            logger.error(e);
            return;
        }
    });

    socket.on('disconnect', () => {
        logger.info(`Disconnect: ${socket.id}`);

        // Remove socket from room
        room.removeClient(socket);
        // Check if we removed last client
        if (room.isEmpty()) {
            // Remove empty room
            RoomService.removeRoom(room);
        }
    });

});

server.listen(port, () => {
    logger.info(`Server running on port: ${port}`);
});