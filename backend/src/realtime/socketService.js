// backend/src/realtime/socketService.js

const { Server } = require("socket.io");

let io;

// Hàm khởi tạo Socket Server
exports.init = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173", // Địa chỉ Frontend
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("🟢 Client connected via Socket:", socket.id);
        
        socket.on("disconnect", () => {
            console.log("🔴 Client disconnected:", socket.id);
        });
    });
};

// Hàm gửi dữ liệu cảm biến (MQTT gọi)
exports.emitDataUpdate = (data) => {
    if (io) {
        // Gửi sự kiện 'new_sensor_data' tới tất cả client đang kết nối
        io.emit("new_sensor_data", data);
    }
};

// 👇 HÀM MỚI: Hàm gửi sự kiện bất kỳ (Controller gọi)
exports.emit = (event, data) => {
    if (io) {
        io.emit(event, data);
        // console.log(`📡 Socket emitted [${event}]:`, data);
    }
};

// Lấy instance IO nếu cần xử lý phức tạp hơn
exports.getIO = () => io;