// WebSocket manager with auto-reconnect
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isIntentionallyClosed = false;

  constructor(url: string = 'ws://localhost:5000/ws') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server with auto-reconnect
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectDelay = 1000; // Reset delay on success
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const type = data.type || 'message';
            
            // Trigger registered handlers
            this.messageHandlers.forEach((handler, key) => {
              if (key === type || key === '*') {
                handler(data);
              }
            });
          } catch (e) {
            console.error('Failed to parse WS message:', e);
          }
        };

        this.ws.onerror = (event) => {
          console.error('❌ WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket closed');
          
          // Auto-reconnect unless intentionally closed
          if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    console.log(`⏳ Reconnecting in ${this.reconnectDelay}ms...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // On failure, it will schedule another reconnect
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 1.5,
          this.maxReconnectDelay
        );
      });
    }, this.reconnectDelay);
  }

  /**
   * Register handler for message type
   */
  public on(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Send message to server
   */
  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected; queuing message');
      // Could implement a message queue here
    }
  }

  /**
   * Close connection permanently
   */
  public close() {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
export const wsManager = new WebSocketManager();
