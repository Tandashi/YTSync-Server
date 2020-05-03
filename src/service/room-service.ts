import { Room } from "../model/room";
import { Role } from "../model/role";
import logger from '../logger';

export default class RoomService {
    private static rooms: Room[] = [];

    /**
     * Remove a room
     *
     * @param room The room that should be removed
     */
    public static removeRoom(room: Room): void {
        logger.info(`Removing room: ${room.nsp.name}`);
        this.rooms = this.rooms.filter((r) => r.nsp.name !== room.nsp.name);
    }

    /**
     * Get the Room for the given SocketIO.Socket.
     * If not in a room a new one will be created.
     *
     * @param socket The socket to get the Room of
     *
     * @return The Room
     */
    public static getRoom(socket: SocketIO.Socket): Room {
        let room = this.getRoomById(socket.nsp.name);

        if (room === null) {
            room = new Room(socket.nsp);
            room.addClient(socket, Role.HOST);
            this.rooms.push(room);
        }
        else {
            room.addClient(socket, Role.MEMBER);
            room.syncClientToRoom(socket, true);
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
    public static getRoomById(id: string): Room | null {
        for (const room of this.rooms) {
            if (room.nsp.name === id)
                return room;
        }

        return null;
    }
}
