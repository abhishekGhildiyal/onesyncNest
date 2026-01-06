import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🟢 User connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 User disconnected: ${client.id}`);
  }

  @SubscribeMessage('itemUpdated')
  handleItemUpdated(@MessageBody() data: any) {
    this.logger.log(`🔔 Item update received: ${JSON.stringify(data)}`);
    // Broadcast to all other clients
    // this.server.emit('itemUpdated', data);
  }

  // Helper method to emit from services/controllers
  emit(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    } else {
      this.logger.warn('Socket server not initialized!');
    }
  }
}
