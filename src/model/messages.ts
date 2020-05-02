export enum Message {
    PLAY = "play",
    PAUSE = "pause",
    SEEK = "seek",
    PLAY_VIDEO = "play-video",
    ADD_TO_QUEUE = "add-to-queue",
    DELETE_FROM_QUEUE = "delete-from-queue",
    QUEUE = "queue"
}

export enum VideoState {
    PLAYING = "play",
    PAUSED = "pause"
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
        data
    };
    console.log(`Sending Message: ${JSON.stringify(message)}`);
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
    switch(state) {
        case VideoState.PLAYING:
            return Message.PLAY;
        case VideoState.PAUSED:
            return Message.PAUSE;
    }

    return undefined;
}