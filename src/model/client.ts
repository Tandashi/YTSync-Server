import { Role } from "./roles";

export default class Client {
    constructor(public socket: SocketIO.Socket, public role: Role) { }
}