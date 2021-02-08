import { Role } from './role';

export default class Client {
  /**
   * @param socket The socket of the client
   * @param name The name of this client
   * @param role The role of the client
   */
  constructor(
    public socket: SocketIO.Socket,
    public name: string,
    public role: Role
  ) {}

  /**
   * Get the Client as an Object that could be send over an socket.
   */
  public getAsObject() {
    return {
      socketId: this.socket.id,
      name: this.name,
      role: this.role,
    };
  }
}
