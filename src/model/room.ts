import moment from 'moment';

import { Role } from "./roles";
import Client from "./client";
import { sendMessageToSocket, VideoState, Message, getMessageFromVideoState } from "./messages";
import QueueEntry from './queue-entry';

export class Room {
    private clients: Client[] = [];

    private videoQueue: QueueEntry[] = [];
    private currentVideo: QueueEntry = null;
    private state: VideoState = VideoState.PAUSED;
    private lastTimeUpdate: number = 0;
    private lastTime: number = 0;

    constructor(public nsp: SocketIO.Namespace) { }

    private socketInRoom(socket: SocketIO.Socket) {
        return this.clients.map((e) => e.socket.id).includes(socket.id);
    }

    public getClient(socket: SocketIO.Socket): Client | null {
        const clients = this.clients.filter((c) => c.socket.id === socket.id);
        return clients.length > 0 ? clients[0] : null;
    }

    public addClient(socket: SocketIO.Socket, role: Role): void {
        const client = new Client(socket, role);
        if (!this.socketInRoom(socket)) {
            this.clients.push(client);
        }
    }

    public removeClient(socket: SocketIO.Socket): void {
        // Set new host if we remove host and people are left
        if(this.isHost(socket) && this.clients.length > 1) {
            for(const client of this.clients) {
                if(client.socket.id !== socket.id) {
                    console.log(`Client is new host: ${client.socket.id}`);
                    client.role = Role.HOST;
                    break;
                }
            }
        }

        this.clients = this.clients.filter((c) => c.socket.id !== socket.id);
    }

    public sendToAll(type: Message, data: any, except: SocketIO.Socket[]) {
        this.clients.forEach((c) => {
            if(!except.includes(c.socket)) {
                sendMessageToSocket(c.socket, type, data);
            }
        });
    }

    public isEmpty(): boolean {
        return this.clients.length === 0;
    }

    public isHost(socket: SocketIO.Socket): boolean {
        return this.getClient(socket).role === Role.HOST;
    }

    public updateVideoState(state: VideoState) {
        console.log(`Updating VideoState: ${state}`);
        this.state = state;
    }

    public updateVideoTime(time: number) {
        console.log(`Updating VideoTime: ${time}`);
        this.lastTime = time;
        this.lastTimeUpdate = moment.now();
        console.log(`Updating LastTimeUpdate: ${this.lastTimeUpdate}`);
    }

    public getVideoTime(): number {
        if (this.state === VideoState.PAUSED)
            return this.lastTime;

        const currentTime = moment.now();
        return this.lastTime + ((currentTime - this.lastTimeUpdate) / 1000);
    }

    public setCurrentVideo(videoId: string) {
        const entries = this.videoQueue.filter((e) => e.videoId === videoId);

        if (entries.length === 0)
            return;

        this.currentVideo = entries[0];
    }

    public addVideoToQueue(videoId: string, title: string, byline: string) {
        console.log(`Adding to queue video id ${videoId}`);
        const entries = this.videoQueue.filter((e) => e.videoId === videoId);
        if (entries.length !== 0)
            return;

        this.videoQueue.push(new QueueEntry(videoId, title, byline));
        this.sendQueue();
    }

    public removeVideoFromQueue(videoId: string) {
        if (this.videoQueue.length === 1)
            return;

        this.videoQueue = this.videoQueue.filter((e) => e.videoId !== videoId);
        this.sendQueue();
    }

    private sendQueue(except: SocketIO.Socket[] = []): void {
        this.sendToAll(Message.QUEUE, this.videoQueue, except);
    }

    public syncClienToRoom(socket: SocketIO.Socket): void {
        sendMessageToSocket(socket, Message.QUEUE, this.videoQueue);
        if (this.currentVideo !== null) {
            sendMessageToSocket(socket, Message.PLAY_VIDEO, this.currentVideo.videoId);
        }

        const message = getMessageFromVideoState(this.state);
        const videoTime = this.getVideoTime().toString();
        sendMessageToSocket(socket, message, videoTime);
    }
}