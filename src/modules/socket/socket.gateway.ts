import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  // 🔁 same as initSocket(server)
  afterInit(server: Server) {
    this.logger.log('🟡 Socket.IO initialized');

    // ✅ io.use middleware (AUTH)
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        // 🔐 replace with your verifyToken()
        const decoded = { userId: 1 }; // example
        socket.data.user = decoded; // attach user (same as socket.user)
        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // 🔌 io.on("connection")
  handleConnection(client: Socket) {
    this.logger.log(`🟢 User connected: ${client.id}`);
    this.logger.log(`🔐 Auth user: ${JSON.stringify(client.data.user)}`);
  }

  // 🔌 socket.on("disconnect")
  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 User disconnected: ${client.id}`);
  }

  // 🔔 socket.on("itemUpdated")
  @SubscribeMessage('itemUpdated')
  handleItemUpdated(client: Socket, data: any) {
    this.logger.log(`🔔 Item update received: ${JSON.stringify(data)}`);

    // same as socket.broadcast.emit(...)
    client.broadcast.emit('itemUpdated', data);
  }

  // 🔥 SAME AS getIO().emit(...)
  emit(event: string, payload: any = {}) {
    if (!this.server) {
      throw new Error('Socket.IO not initialized');
    }
    this.server.emit(event, payload);
  }
}
