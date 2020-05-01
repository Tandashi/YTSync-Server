import { Role } from "./roles";
import Client from "./client";

export class Room {
    private clients: Client[] = [];
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
        this.clients = this.clients.filter((c) => c.socket.id !== socket.id);
    }

    public sendToAllExcept(message: any, except: SocketIO.Socket[]) {
        this.clients.forEach((c) => {
            if(!except.includes(c.socket)) {
                c.socket.emit('message', message);
            }
        });
    }

    public isEmpty(): boolean {
        return this.clients.length === 0;
    }
}