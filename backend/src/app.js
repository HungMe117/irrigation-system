// backend/src/app.js

const express = require('express');
const helmet = require('helmet');
const cors = require('cors'); 

// Import tất cả các Route
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes'); 
const configRoutes = require('./routes/configRoutes'); 
const controlRoutes = require('./routes/controlRoutes'); // 👈 Đã thêm Control Routes

const app = express();

// --- 1. MIDDLEWARE BẢO MẬT & CƠ BẢN ---
// Bảo mật HTTP Headers cơ bản
app.use(helmet()); 

// Phân tích Body của request
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Thiết lập CORS (Cho phép Frontend kết nối)
app.use(cors({ 
    origin: 'http://localhost:5173', // 👈 Chỉ định rõ cổng Frontend (Vite)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // 👈 BẮT BUỘC: Để cho phép gửi token/cookies
}));
// --- 2. ĐỊNH NGHĨA CÁC ROUTES (API) ---

// 1. Authentication Routes (Đăng ký/Đăng nhập)
app.use('/api/v1/auth', authRoutes); 

// 2. Data Routes (CRUD Node, Gateway, Đọc dữ liệu cảm biến)
app.use('/api/v1/data', dataRoutes); 

// 3. Configuration Routes (Cấu hình hệ thống, v.v.)
app.use('/api/v1/config', configRoutes); 

// 4. Control Routes (Điều khiển thiết bị IoT) 
app.use('/api/v1/control', controlRoutes); 


// --- 3. ROUTE THỬ NGHIỆM (Health Check) ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Welcome to Smart Irrigation Backend!',
        status: 'Operational'
    });
});


// --- 4. GLOBAL ERROR HANDLER (BẮT LỖI TOÀN CỤC) ---
// Middleware này phải nằm CUỐI CÙNG.
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500; 
    const errorStatus = process.env.NODE_ENV === 'development' ? err.stack : undefined;
    
    console.error('❌ GLOBAL ERROR HANDLER CAUGHT:', err.message, err.stack);

    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Lỗi server không xác định.',
        stack: errorStatus 
    });
});

module.exports = app;
