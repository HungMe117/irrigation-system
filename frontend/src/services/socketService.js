// frontend/src/services/socketService.js
import { io } from "socket.io-client";

// URL of Backend (Ensure port 5000 is correct)
const SOCKET_URL = "http://localhost:5000";

class SocketService {
    constructor() {
        this.socket = null;
    }

    // Initialize connection
    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                transports: ["websocket"], // Force websocket
                reconnection: true,
            });

            this.socket.on("connect", () => {
                console.log("✅ Socket Connected via Service:", this.socket.id);
            });

            this.socket.on("disconnect", () => {
                console.log("🔴 Socket Disconnected");
            });
        }
        return this.socket;
    }

    // Listen to event
    on(eventName, callback) {
        if (!this.socket) {
            this.connect(); // Auto connect if not connected
        }
        this.socket.on(eventName, callback);
    }

    // Remove listener
    off(eventName) {
        if (this.socket) {
            this.socket.off(eventName);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Export Singleton instance
export const socketService = new SocketService();