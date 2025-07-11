import { io, Socket } from 'socket.io-client';

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  private constructor() { }

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public initializeSocket(token: string): Socket {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected:', this.socket.id);
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('Socket connection in progress');
      return this.socket!;
    }

    this.isConnecting = true;
    this.socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnecting = false;
    });

    this.socket.on('reconnect', () => {
      console.log('Socket reconnected:', this.socket?.id);
      // Rejoin active channels
      const activeChannel = localStorage.getItem('activeChannel');
      if (activeChannel) {
        this.joinChannel(activeChannel);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnecting = false;
    });

    return this.socket;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected manually');
    }
  }

  public joinChannel(channelId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('joinChat', channelId);
      localStorage.setItem('activeChannel', channelId);
      console.log(`Joined channel: ${channelId}`);
    }
  }

  public leaveChannel(channelId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leaveChat', channelId);
      localStorage.removeItem('activeChannel');
      console.log(`Left channel: ${channelId}`);
    }
  }


  public editMessage(messageId: string, text: string, channelId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('editMessage', { messageId, text, channelId }, (response: { error?: string; message?: Message }) => {
        if (response.error) {
          console.error('Error editing message:', response.error);
        }
      });
    }
  }

  public deleteChat(channelId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('deleteChat', { channelId }, (response: { error?: string }) => {
        if (response.error) {
          console.error('Error deleting chat:', response.error);
        }
      });
    }
  }
}


export const socketManager = SocketManager.getInstance();