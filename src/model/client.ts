import { Role } from './role';

export default class Client {
    /**
     * @param socket The socket of the client
     * @param role The role of the client
     */
    constructor(
        public socket: SocketIO.Socket,
        public role: Role
    ) { }
}