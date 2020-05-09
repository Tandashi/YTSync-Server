import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';

import RoomService from './service/room-service';
import { VideoState, Message } from './model/message';
import logger from './logger';
import { Role } from './model/role';

dotenv.config();

const port = process.env.YTSYNC_SERVER_PORT || 8080;

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  path: '/socket.io',
  serveClient: false,
  // below are engine.IO options
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false
});

app.use(express.static(path.join(__dirname, '..', 'public')));

io.of(/.*/).on('connection', (socket: SocketIO.Socket) => {
    logger.info(`Connection: ${socket.id}`);

    const room = RoomService.getRoom(socket);

    socket.on('message', (data: string) => {
        try {
            const json = JSON.parse(data);
            const command = json.action;
            const cmdData = json.data;

            const isHost = room.isHost(socket);
            const isPromoted = room.isPromoted(socket);

            // Check if socket is host. If not we ignore the send command.
            if(isHost) {
                switch(command) {
                    case Message.PLAY:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PLAYING, socket);
                        return;
                    case Message.PAUSE:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PAUSED, socket);
                        return;
                    case Message.PROMOTE:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.PROMOTED);
                        return;
                    case Message.UNPROMOTE:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.MEMBER);
                        return;
                }
            }

            if (isHost || isPromoted) {
                switch(command) {
                    case Message.AUTOPLAY:
                        room.setAutoplay(cmdData);
                        return;
                    case Message.PLAY_VIDEO:
                        room.setCurrentVideo(cmdData);
                        return;
                    case Message.ADD_TO_QUEUE:
                        room.addVideoToQueue(cmdData.videoId, cmdData.title, cmdData.byline);
                        return;
                    case Message.REMOVE_FROM_QUEUE:
                        room.removeVideoFromQueue(cmdData);
                        return;
                }
            }

            switch(command) {
                case Message.REACTION:
                    room.sendToAll(Message.REACTION, cmdData, [socket]);
                    return;
            }

            if(!isHost) {
                // Socket wasnt a host so we need to resync him
                room.syncClientToRoom(socket, false, false);
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