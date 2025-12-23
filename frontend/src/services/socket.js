import { io } from "socket.io-client";

// Địa chỉ Backend của bạn (thường là port 3000 hoặc 5000)
// LƯU Ý: Nếu Backend chạy port khác, hãy sửa số 3000 lại cho đúng
const URL = "http://localhost:3000"; 

const socket = io(URL, {
    autoConnect: false, // Chúng ta sẽ tự kết nối thủ công khi cần
});

// Hàm hỗ trợ debug: Log ra console khi kết nối thành công
socket.on("connect", () => {
    console.log("✅ Đã kết nối Socket với ID:", socket.id);
});

socket.on("disconnect", () => {
    console.log("❌ Mất kết nối Socket");
});

export default socket;