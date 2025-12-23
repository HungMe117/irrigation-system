// frontend/src/services/authService.js
import axiosClient from './axiosClient';

const authService = {
    // 1. Đăng ký
    register: (data) => {
        return axiosClient.post('/auth/register', data);
    },

    // 2. Đăng nhập
    login: (data) => {
        return axiosClient.post('/auth/login', data);
    },

    // 3. 👇 HÀM QUAN TRỌNG ĐANG THIẾU (Sửa lỗi màn hình trắng)
    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        // Trả về true nếu có token, false nếu không
        return !!token; 
    },

    // 4. Hàm đăng xuất (Xóa token)
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('current_user');
        // Có thể reload trang hoặc điều hướng về login tùy logic
        window.location.href = '/login'; 
    }
};

export default authService;