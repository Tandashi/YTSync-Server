import moment from 'moment';

import { Role } from "./roles";
import * as Message from "./messages";
import Client from "./client";
import QueueEntry from './queue-entry';

export class Room {
    private clients: Client[] = [];

    // Contains the videos in the queue
    private videoQueue: QueueEntry[] = [];
    // Contains the current video
    private currentVideo: QueueEntry = null;
    // The current Video state of the room
    private state: Message.VideoState = Message.VideoState.PAUSED;
    // The last time the time was syned in millis
    private lastTimeUpdate: number = 0;
    // The video time that was syned
    private videoTime: number = 0;

    /**
     * @param nsp The namespace the room should manage
     */
    constructor(public nsp: SocketIO.Namespace) { }

    /**
     * Check if the given socket is in this room.
     *
     * @param socket The socket to check for
     */
    private socketInRoom(socket: SocketIO.Socket): boolean {
        return this.clients.map((e) => e.socket.id).includes(socket.id);
    }

    /**
     * Get the client for the given socket.
     *
     * @param socket The socket to get the client of
     *
     * @returns The Client or null if socket not in room
     */
    public getClient(socket: SocketIO.Socket): Client | null {
        const clients = this.clients.filter((c) => c.socket.id === socket.id);
        return clients.length > 0 ? clients[0] : null;
    }

    /**
     * Add a client to the room with given role.
     *
     * @param socket The socket to add
     * @param role The role of the socket (Default: Role.MEMBER)
     */
    public addClient(socket: SocketIO.Socket, role: Role = Role.MEMBER): void {
        // Check if socket is already in this room
        if (!this.socketInRoom(socket)) {
            // Create a new client and add to the list
            const client = new Client(socket, role);
            this.clients.push(client);
        }
    }

    /**
     * Remove the client from the room.
     * If the client was the HOST a new client
     * will be promoted to HOST if there are other people left.
     *
     * @param socket The socket of the client to remove
     */
    public removeClient(socket: SocketIO.Socket): void {
        // Set new host if we remove host and people are left
        if(this.isHost(socket) && this.clients.length > 1) {
            // Go through all clients
            for(const client of this.clients) {
                // Check if client is not the one to remove
                if(client.socket.id !== socket.id) {
                    console.log(`Client is new host: ${client.socket.id}`);
                    // Change his role to HOST
                    client.role = Role.HOST;
                    break;
                }
            }
        }

        this.clients = this.clients.filter((c) => c.socket.id !== socket.id);
    }

    /**
     * Send a message to all clients in this room except a given list.
     *
     * @param type The message type to send
     * @param data The data of the message
     * @param except A list of sockets that should not receive the message
     */
    public sendToAll(type: Message.Message, data: any, except: SocketIO.Socket[] = []): void {
        this.clients.forEach((c) => {
            if(!except.includes(c.socket)) {
                Message.sendMessageToSocket(c.socket, type, data);
            }
        });
    }

    /**
     * Returns if the room is empty or not.
     */
    public isEmpty(): boolean {
        return this.clients.length === 0;
    }

    /**
     * Check if the given socket is a HOST.
     *
     * @param socket The socket to check
     */
    public isHost(socket: SocketIO.Socket): boolean {
        return this.getClient(socket).role === Role.HOST;
    }

    /**
     * Update the rooms video state.
     *
     * Will send a VideoState Message to all clients except the one that updated.
     *
     * @param state The new room VideoState
     * @param socket The socket that wants to update the video state
     */
    public updateVideoState(state: Message.VideoState, socket: SocketIO.Socket): void {
        console.log(`Updating VideoState: ${state}`);
        this.state = state;

        const message = Message.getMessageFromVideoState(this.state);
        const videoTime = this.getVideoTime().toString();
        this.sendToAll(message, videoTime, [socket]);
    }

    /**
     * Update the rooms video time.
     *
     * @param time The new room video time
     */
    public updateVideoTime(time: number): void {
        console.log(`Updating VideoTime: ${time}`);
        this.videoTime = time;
        this.lastTimeUpdate = moment.now();
        console.log(`Updating LastTimeUpdate: ${this.lastTimeUpdate}`);
    }

    /**
     * Get the current video time of the room.
     * Will be calculated based on time passed and last videoTime sync.
     */
    public getVideoTime(): number {
        if (this.state === Message.VideoState.PAUSED)
            return this.videoTime;

        const currentTime = moment.now();
        return this.videoTime + ((currentTime - this.lastTimeUpdate) / 1000);
    }

    /**
     * Set the current video of the room.
     *
     * Will send a PLAY_VIDEO Message to all clients in the room.
     *
     * **Caution:** The videoId has to be already in the room queue.
     *
     * @see addVideoToQueue
     *
     * @param videoId The new room videoId
     * @param socket The socket that want to update the current video
     */
    public setCurrentVideo(videoId: string): void {
        const entries = this.videoQueue.filter((e) => e.videoId === videoId);

        if (entries.length === 0)
            return;

        this.currentVideo = entries[0];
        this.sendToAll(Message.Message.PLAY_VIDEO, this.currentVideo.videoId);
    }

    /**
     * Add a video to the room queue.
     * Will send a QUEUE update message.
     *
     * **Caution:** Will not add the video to the queue if it is already present.
     *
     * @see sendQueue
     *
     * @param videoId The videoId to add
     * @param title The title of the video
     * @param byline The byline of the video
     */
    public addVideoToQueue(videoId: string, title: string, byline: string): void {
        console.log(`Adding to queue video id ${videoId}`);
        const entries = this.videoQueue.filter((e) => e.videoId === videoId);
        // Check if the video is already in the queue
        if (entries.length !== 0)
            return;

        this.videoQueue.push(new QueueEntry(videoId, title, byline));
        this.sendQueue();
    }

    /**
     * Remove a video from the room queue.
     * Will send a QUEUE update message.
     *
     * If the current playing video is removed the first video in the queue will be played.
     * In this case a PLAY_VIDEO Message will be send.
     *
     * **Caution:** Will not remove the video if it's the only one left in the queue.
     *
     * @see sendQueue
     *
     * @param videoId The videoId to remove from the queue
     */
    public removeVideoFromQueue(videoId: string): void {
        // Check if there is only one video in the case.
        // In this case we dont want to remove it.
        if (this.videoQueue.length === 1)
            return;

        this.videoQueue = this.videoQueue.filter((e) => e.videoId !== videoId);
        this.sendQueue();

        // Check if the current video is the one we deleted.
        // If so we change the current playing video the the first in the queue.
        if (this.currentVideo.videoId === videoId) {
            this.setCurrentVideo(this.videoQueue[0].videoId);
        }
    }

    /**
     * Send the current video queue to all the room clients.
     *
     * @param except The sockets that should be excluded
     */
    private sendQueue(except: SocketIO.Socket[] = []): void {
        this.sendToAll(Message.Message.QUEUE, { videos: this.videoQueue, video: this.currentVideo }, except);
    }

    /**
     * Sync the given socket to the room.
     *
     * @param socket The socket that should be synced.
     * @param sendQueue If the queue should be send or not.
     */
    public syncClientToRoom(socket: SocketIO.Socket, sendQueue: boolean): void {
        if (this.currentVideo !== null) {
            if (sendQueue) {
                Message.sendMessageToSocket(socket, Message.Message.QUEUE, { videos: this.videoQueue, video: this.currentVideo });
            }

            Message.sendMessageToSocket(socket, Message.Message.PLAY_VIDEO, this.currentVideo.videoId);
        }

        const message = Message.getMessageFromVideoState(this.state);
        const videoTime = this.getVideoTime().toString();
        Message.sendMessageToSocket(socket, message, videoTime);
    }
}