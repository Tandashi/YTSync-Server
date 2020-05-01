import { Room } from "./room";

export enum Message {
    PLAY = "play",
    PAUSE = "pause",
    SEEK = "seek"
}

export enum VideoState {
    PLAYING = "play",
    PAUSED = "pause"
}

export function sendVideoStateMessageToSocket(socket: SocketIO.Socket, state: VideoState, data: string): void {
    const message = `${state} ${data}`;
    console.log(`Sending Message: ${message}`);
    socket.emit('message', message);
}