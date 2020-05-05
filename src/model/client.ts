import { Role } from './role';

export default class Client {
    /**
     * @param socket The socket of the client
     * @param role The role of the client
     */
    constructor(
        public socket: SocketIO.Socket,
        public name: string,
        public role: Role
    ) { }

    public getAsObject() {
        return {
            socketId: this.socket.id,
            name: this.name,
            role: this.role
        };
    }
}