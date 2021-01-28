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
            const isSubHost = room.isSubHost(socket);
            // check for PROMOTED role to stay backwards compatible as MODERATOR and PROMOTED have the same permissions
            const isModerator = room.isModerator(socket) || room.isPromoted(socket);

            // Check roles of the sender
            // MEMBER - may send reactions
            // MODERATOR - may ALSO add to / remove from queue, skip the video and modify the autoplay option
            // SUB_HOST - may ALSO play / pause the video and seek to another timestamp
            // HOST - may ALSO change the users roles

            if (isHost) {
                switch(command) {
                    case Message.SET_ROLE_MEMBER:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.MEMBER);
                        return;
                    case Message.SET_ROLE_MODERATOR:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.MODERATOR);
                        return;
                    case Message.SET_ROLE_SUB_HOST:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.SUB_HOST);
                        return;
                    // deprecated - backwards compatibility
                    case Message.PROMOTE:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.PROMOTED);
                        return;
                    // deprecated - backwards compatibility
                    case Message.UNPROMOTE:
                        room.changeRoleByClient(room.getClientBySocketId(cmdData), Role.MEMBER);
                        return;
                }
            }

            if (isHost || isSubHost) {
                switch (command) {
                    case Message.PLAY:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PLAYING, socket);
                        return;
                    case Message.SEEK:
                        room.updateVideoTime(parseFloat(cmdData), true);
                        return;
                    case Message.PAUSE:
                        room.updateVideoTime(parseFloat(cmdData));
                        room.updateVideoState(VideoState.PAUSED, socket);
                        return;
                }
            }

            if (isHost || isSubHost || isModerator) {
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

            switch (command) {
                case Message.REACTION:
                    room.sendToAll(Message.REACTION, cmdData, [socket]);
                    return;
            }

            if (!isHost) {
                // Socket wasn't a host so we need to resync him
                room.syncClientToRoom(socket, false, false);
            }
        }
        catch (e) {
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