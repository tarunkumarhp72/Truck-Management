export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  onMessage(callback: (data: any) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch((error) => {
          console.warn('WebSocket reconnection failed, app will continue with REST API only');
        });
      }, delay);
    } else {
      console.warn('WebSocket max reconnection attempts reached. Application will continue using REST API only.');
    }
  }
}

export class LocationTrackingService extends WebSocketService {
  constructor(truckId: number) {
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8000/ws/tracking/${truckId}/?token=${token}`;
    super(wsUrl);
  }

  sendLocationUpdate(location: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }): void {
    this.sendMessage({
      type: 'location_update',
      ...location,
    });
  }
}

export class AdminDashboardService extends WebSocketService {
  constructor() {
    const token = localStorage.getItem('access_token');
    const wsUrl = `wss://truck-management-api-pr81.onrender.com/ws/admin/dashboard/?token=${token}`;
    super(wsUrl);
  }
}
