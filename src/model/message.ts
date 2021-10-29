import logger from '../logger';

export enum Message {
  PLAY = 'play',
  PAUSE = 'pause',
  SEEK = 'seek',
  AUTOPLAY = 'autoplay',
  PLAY_VIDEO = 'play-video',
  ADD_TO_QUEUE = 'add-to-queue',
  REMOVE_FROM_QUEUE = 'remove-from-queue',
  QUEUE = 'queue',
  CLIENTS = 'clients',
  CLIENT_CONNECT = 'client-connect',
  CLIENT_DISCONNECT = 'client-disconnect',
  SET_ROLE_MEMBER = 'set-role-member',
  SET_ROLE_MODERATOR = 'set-role-moderator',
  SET_ROLE_SUB_HOST = 'set-role-sub-host',
  SET_PLAYBACK_RATE = 'set-playback-rate',
  REACTION = 'reaction',
  ACTION_LOG = 'action-log',
}

export enum VideoState {
  PLAYING = 'play',
  PAUSED = 'pause',
}

/**
 * Send a message to the given socket.
 *
 * @param socket The socket to send the message to
 * @param type The type of the message
 * @param data The data of the message
 */
export function sendMessageToSocket(socket: SocketIO.Socket, type: Message, data: any): void {
  const message = {
    action: type,
    data,
  };
  logger.info(`Sending Message (${JSON.stringify(message)}) to Socket -> socketId: ${socket.id}`);
  socket.emit('message', JSON.stringify(message));
}

/**
 * Get the Message type for the given VideoState.
 *
 * @param state The VideoState to get the Message type for
 *
 * @return The Message type of undefined if there is no Message type the the VideoState
 */
export function getMessageFromVideoState(state: VideoState): Message | undefined {
  switch (state) {
    case VideoState.PLAYING:
      return Message.PLAY;
    case VideoState.PAUSED:
      return Message.PAUSE;
  }
}
