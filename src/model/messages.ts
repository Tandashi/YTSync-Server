import { Room } from "./room";

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

export function sendMessageToSocket(socket: SocketIO.Socket, type: Message, data: string): void {
    const message = `${type} ${data}`;
    console.log(`Sending Message: ${message}`);
    socket.emit('message', message);
}

export function getMessageFromVideoState(state: VideoState): Message | undefined {
    switch(state) {
        case VideoState.PLAYING:
            return Message.PLAY;
        case VideoState.PAUSED:
            return Message.PAUSE;
    }

    return undefined;
}