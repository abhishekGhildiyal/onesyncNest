import {
  OnGatewayConnection,
  OnGatewayDisconnect,
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
    console.log('🐯 User connected:', socket.id, '🐯');
  }

  handleDisconnect(socket: Socket) {
    console.log('🚨 User disconnected:', socket.id);
  }
}
