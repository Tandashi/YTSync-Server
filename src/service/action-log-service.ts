import Client from '../model/client';
import { Message } from '../model/message';
import { Room } from '../model/room';

interface ActionLogEntryData {
  clientName: string;
  actionText: string;
}

export default class ActionLogSerivce {
  /**
   * Get a random Name
   */
  public static sendActionLogMessage(room: Room, client: Client, actionText: string): void {
    room.sendToAll(Message.ACTION_LOG, <ActionLogEntryData>{
      clientName: client.name,
      actionText,
    });
  }
}
