import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(socket: Socket) {
    console.log('🟢 User connected:', socket.id);
  }

  handleDisconnect(socket: Socket) {
    console.log('🔴 User disconnected:', socket.id);
  }

  @SubscribeMessage('itemUpdated')
  handleItemUpdated(socket: Socket, data: unknown) {
    console.log('🔔 Item update received:', data);
    // socket.broadcast.emit('itemUpdated', data); — same as Express (broadcast commented out)
  }
}
