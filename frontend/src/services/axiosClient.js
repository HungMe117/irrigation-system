// frontend/src/services/axiosClient.js

import axios from 'axios';

const axiosClient = axios.create({
    // 👇 SỬA 1: Đổi 'localhost' thành '127.0.0.1' (Tránh lỗi phân giải IP trên Windows)
    baseURL: 'http://localhost:5000/api/v1', 
    
    headers: {
        'Content-Type': 'application/json',
    },
    
    // 👇 SỬA 2: Thêm dòng này để khớp với 'credentials: true' bên Backend
    withCredentials: true, 
});

// --- 1. INTERCEPTOR REQUEST ---
axiosClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- 2. INTERCEPTOR RESPONSE ---
axiosClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // Log lỗi ra để dễ debug
    console.error("Axios Error:", error);

    if (error.response && error.response.status === 401) {
        console.log("Token hết hạn hoặc không hợp lệ. Đang đăng xuất...");
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        // window.location.href = '/login'; 
    }
    throw error;
});

export default axiosClient;