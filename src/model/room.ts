import moment from 'moment';

import * as Messages from './message';
import Client from './client';
import QueueEntry from './queue-entry';
import logger from '../logger';

import { Role } from './role';
import NameSerivce from '../service/name-service';

export class Room {
    private clients: Client[] = [];

    // Contains the videos in the queue
    private videoQueue: QueueEntry[] = [];
    // Contains the current video
    private currentVideo: QueueEntry = null;
    // The current Video state of the room
    private state: Messages.VideoState = Messages.VideoState.PAUSED;
    // The last time the time was syned in millis
    private lastTimeUpdate: number = 0;
    // The video time that was syned
    private videoTime: number = 0;
    // If autoplay is enabled
    private autoplay: boolean = true;

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
        if (this.socketInRoom(socket))
            return;

        // Create a new client and add to the list
        const client = new Client(socket, NameSerivce.getName(), role);
        this.clients.push(client);
        logger.info(`Added client -> socketId: '${socket.id}' | Role: ${role}`);

        this.sendToAll(Messages.Message.CLIENT_CONNECT, client.getAsObject());
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
                    logger.info(`New room (${this.nsp.name}) Host -> socketId: '${client.socket.id}' | Reason: Old one was removed`);
                    // Change his role to HOST
                    client.role = Role.HOST;
                    break;
                }
            }
        }

        this.clients = this.clients.filter((c) => c.socket.id !== socket.id);
        logger.info(`Removed client with -> socketId: '${socket.id}'`);
        this.sendToAll(Messages.Message.CLIENT_DISCONNECT, socket.id);
    }

    /**
     * Send a message to all clients in this room except a given list.
     *
     * @param type The message type to send
     * @param data The data of the message
     * @param except A list of sockets that should not receive the message
     */
    public sendToAll(type: Messages.Message, data: any, except: SocketIO.Socket[] = []): void {
        this.clients.forEach((c) => {
            if(!except.includes(c.socket)) {
                Messages.sendMessageToSocket(c.socket, type, data);
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
    public updateVideoState(state: Messages.VideoState, socket: SocketIO.Socket): void {
        logger.info(`Updating room (${this.nsp.name}) VideoState -> '${this.state}' => '${state}'`);
        this.state = state;

        const message = Messages.getMessageFromVideoState(this.state);
        const videoTime = this.getVideoTime().toString();
        this.sendToAll(message, videoTime, [socket]);
    }

    /**
     * Update the rooms video time.
     *
     * @param time The new room video time
     */
    public updateVideoTime(time: number): void {
        logger.info(`Updating room (${this.nsp.name}) VideoTime -> '${time}'`);
        this.videoTime = time;
        this.lastTimeUpdate = moment.now();
        logger.info(`Updating room (${this.nsp.name}) LastTimeUpdate -> '${this.lastTimeUpdate}'`);
    }

    /**
     * Get the current video time of the room.
     * Will be calculated based on time passed and last videoTime sync.
     */
    public getVideoTime(): number {
        if (this.state === Messages.VideoState.PAUSED)
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
        logger.info(`Setting current video for room (${this.nsp.name}) -> videoId: '${videoId}'`);
        this.sendToAll(Messages.Message.PLAY_VIDEO, this.currentVideo.videoId);
    }

    /**
     * Set autoplay
     *
     * @param autoplay
     */
    public setAutoplay(autoplay: boolean) {
        this.autoplay = autoplay;
        logger.info(`Setting autoplay for room (${this.nsp.name}) -> autoplay: '${autoplay}'`);
        this.sendToAll(Messages.Message.AUTOPLAY, this.autoplay);
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
        const entries = this.videoQueue.filter((e) => e.videoId === videoId);
        // Check if the video is already in the queue
        if (entries.length !== 0)
            return;

        const entry = new QueueEntry(videoId, title, byline);
        this.videoQueue.push(entry);
        logger.info(`Added video to room (${this.nsp.name}) queue -> videoID: '${videoId}' | title: '${title}' | byline: '${byline}'`);
        this.sendToAll(Messages.Message.ADD_TO_QUEUE, entry);
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

        const reduced = this.videoQueue.reduce((acc, e) => {
            if (e.videoId !== videoId)
                acc.queue.push(e);
            else
                acc.el = e;
            return acc;
        }, { queue: [], el: undefined });
        this.videoQueue = reduced.queue;

        logger.info(`Removed video from room (${this.nsp.name}) queue -> videoId: '${videoId}'`);
        this.sendToAll(Messages.Message.REMOVE_FROM_QUEUE, reduced.el);

        // Check if the current video is the one we deleted.
        // If so we change the current playing video the the first in the queue.
        if (this.currentVideo !== null && this.currentVideo.videoId === videoId) {
            this.setCurrentVideo(this.videoQueue[0].videoId);
        }
    }

    /**
     * Sync the given socket to the room.
     *
     * @param socket The socket that should be synced.
     * @param sendQueue If the queue should be send or not.
     */
    public syncClientToRoom(socket: SocketIO.Socket, sendQueue: boolean, sendPlayVideo: boolean): void {
        logger.info(`Syncing client -> socketId: '${socket.id}' | sendQueue: ${sendQueue} | sendPlayVideo: ${sendPlayVideo}`);

        if (this.currentVideo !== null) {
            if (sendQueue) {
                Messages.sendMessageToSocket(socket, Messages.Message.QUEUE, { videos: this.videoQueue, video: this.currentVideo });
            }
            if (sendPlayVideo) {
                Messages.sendMessageToSocket(socket, Messages.Message.PLAY_VIDEO, this.currentVideo.videoId);
            }
        }

        const message = Messages.getMessageFromVideoState(this.state);
        const videoTime = this.getVideoTime().toString();
        Messages.sendMessageToSocket(socket, message, videoTime);
        Messages.sendMessageToSocket(socket, Messages.Message.AUTOPLAY, this.autoplay);
        Messages.sendMessageToSocket(socket, Messages.Message.CLIENTS, this.clients.map(c => c.getAsObject()));
    }
}