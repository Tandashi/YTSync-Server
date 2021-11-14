import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import path from 'path';
import dotenv from 'dotenv';

import RoomService from './service/room-service';
import ActionLogSerivce from './service/action-log-service';
import { VideoState, Message } from './model/message';
import logger from './logger';
import { Role } from './model/role';

import routes from './routes/router';

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
  cookie: false,
});

app.use('/', routes);
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
      const isModerator = room.isModerator(socket);

      const client = room.getClient(socket);

      // Check roles of the sender
      // MEMBER - may send reactions
      // MODERATOR - may ALSO add to / remove from queue, skip the video and modify the autoplay option
      // SUB_HOST - may ALSO play / pause the video and seek to another timestamp
      // HOST - may ALSO change the users roles

      if (isHost) {
        const targetClient = room.getClientBySocketId(cmdData);

        switch (command) {
          case Message.SET_ROLE_MEMBER:
            room.changeRoleByClient(targetClient, Role.MEMBER);
            ActionLogSerivce.sendActionLogMessage(room, client, `Set role for ${targetClient.name} to Member`);
            return;
          case Message.SET_ROLE_MODERATOR:
            room.changeRoleByClient(targetClient, Role.MODERATOR);
            ActionLogSerivce.sendActionLogMessage(room, client, `Set role for ${targetClient.name} to Moderator`);
            return;
          case Message.SET_ROLE_SUB_HOST:
            room.changeRoleByClient(targetClient, Role.SUB_HOST);
            ActionLogSerivce.sendActionLogMessage(room, client, `Set role for ${targetClient.name} to SubHost`);
            return;
        }
      }

      if (isHost || isSubHost) {
        const parsedCmdData = parseFloat(cmdData);

        switch (command) {
          case Message.PLAY:
            room.updateVideoTime(parsedCmdData);

            if (room.isVideoPlaying()) {
              return;
            }

            room.updateVideoState(VideoState.PLAYING, socket);
            ActionLogSerivce.sendActionLogMessage(room, client, `Resumed the playback`);
            return;
          case Message.PAUSE:
            room.updateVideoTime(parsedCmdData);

            if (room.isVideoPaused()) {
              return;
            }

            room.updateVideoState(VideoState.PAUSED, socket);
            ActionLogSerivce.sendActionLogMessage(room, client, `Paused the playback`);
            return;
          case Message.SEEK:
            room.updateVideoTime(parsedCmdData, true);
            ActionLogSerivce.sendActionLogMessage(room, client, `Seeked to ${parsedCmdData}`);
            return;
          case Message.SET_PLAYBACK_RATE:
            room.setPlaybackRate(parsedCmdData);
            ActionLogSerivce.sendActionLogMessage(room, client, `Set the playback speed to ${parsedCmdData}`);
            return;
        }
      }

      if (isHost || isSubHost || isModerator) {
        switch (command) {
          case Message.AUTOPLAY:
            room.setAutoplay(cmdData);
            ActionLogSerivce.sendActionLogMessage(room, client, `Set autoplay to ${cmdData}`);
            return;
          case Message.PLAY_VIDEO:
            room.setCurrentVideo(cmdData);
            ActionLogSerivce.sendActionLogMessage(room, client, `Started to play video ${cmdData}`);
            return;
          case Message.ADD_TO_QUEUE:
            room.addVideoToQueue(cmdData.videoId, cmdData.title, cmdData.byline);
            ActionLogSerivce.sendActionLogMessage(room, client, `Added to Queue ${cmdData.title}`);
            return;
          case Message.REMOVE_FROM_QUEUE:
            room.removeVideoFromQueue(cmdData);
            ActionLogSerivce.sendActionLogMessage(room, client, `Removed video from Queue`);
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
    } catch (e) {
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
