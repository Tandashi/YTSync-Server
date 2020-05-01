import { Room } from "../model/room";
import { Role } from "../model/roles";

export default class RoomService {
    private static rooms: Room[] = [];

    /**
     * Get the Room for the given SocketIO.Socket
     *
     * @param socket The socket to get the Room of
     *
     * @return The Room
     */
    static getRoom(socket: SocketIO.Socket): Room {
        let room = this.getRoomById(socket.nsp.name);

        if (room === null) {
            room = new Room(socket.nsp);
            room.addClient(socket, Role.HOST);
            this.rooms.push(room);
        }
        else {
            room.addClient(socket, Role.MEMBER);
            room.syncClienToRoom(socket);
        }

        return room;
    }

    /**
     * Get a Room by its ID
     *
     * @param id The Room ID
     *
     * @return The Room or null if it could not be found
     */
    static getRoomById(id: string): Room | null {
        for (const room of this.rooms) {
            if (room.nsp.name === id)
                return room;
        }

        return null;
    }
}
