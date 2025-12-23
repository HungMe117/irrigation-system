import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Thêm Tailwind CSS
// Import toàn bộ Tailwind CSS/index.css ở đây (hoặc dùng CDN trong index.html)
// Vì môi trường này không cần file index.css, chúng ta chỉ cần giữ lại logic React

const rootElement = document.getElementById('root');
if (rootElement) {
    // Sử dụng ReactDOM.createRoot nếu có sẵn
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} else {
    // Fallback cho môi trường không có #root
    console.error("Root element not found.");
}