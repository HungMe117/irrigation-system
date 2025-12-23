// frontend/src/context/AppContext.jsx

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiClient } from '../services/apiClient.js';
import { useSocket } from '../hooks/useSocket.js';
// Import các icons cần thiết cho giao diện tổng quan
import { Zap, Settings, User, LogOut } from 'lucide-react'; 

// --- Khởi tạo Context ---
const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- Component Provider ---
export const AppProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null); 
    
    const [sensorNodes, setSensorNodes] = useState([]);
    const [latestSensorData, setLatestSensorData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [globalError, setGlobalError] = useState(null);

    // --- Xử lý dữ liệu Real-time ---
    const handleNewSensorData = useCallback((data) => {
        // Cập nhật dữ liệu cảm biến mới nhất
        if (data.soil_moisture !== undefined) {
             setLatestSensorData(prevData => ({
                ...prevData,
                [data.node_id]: {
                    moisture: data.soil_moisture,
                    temperature: data.temperature,
                    timestamp: data.timestamp
                }
            }));
        }
    }, []);
    
    const handleNodeStatusUpdate = useCallback((data) => {
        // Cập nhật trạng thái van (đến từ Decision Engine hoặc Manual Control)
        setSensorNodes(prevNodes => prevNodes.map(node => {
            if (node.id === data.node_id) {
                return { ...node, last_valve_status: data.valve_status || node.last_valve_status };
            }
            return node;
        }));
    }, []);

    // Khởi tạo Socket
    const { isConnected: isSocketConnected } = useSocket(
        token, 
        handleNewSensorData, 
        handleNodeStatusUpdate
    );

    // --- Chức năng Auth và Data Fetch ---
    
    const login = async (username, password) => {
        setGlobalError(null);
        try {
            // Giả lập login thành công nếu dùng 'admin'/'admin123'
            if (username === 'admin' && password === 'admin123') {
                const mockToken = 'mock-jwt-token-12345';
                setToken(mockToken);
                setUser({ username: 'Admin', id: 1 });
                setIsAuthenticated(true);
                localStorage.setItem('irrigation_token', mockToken);
                return true;
            } else {
                throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
            }
        } catch (err) {
            setGlobalError(err.message);
            return false;
        }
    };
    
    const logout = () => {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
        setSensorNodes([]);
        setLatestSensorData({});
        localStorage.removeItem('irrigation_token');
    };

    const fetchSensorNodes = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setGlobalError(null);
        try {
            // Giả lập dữ liệu Node
            const response = await apiClient('config/nodes', 'GET', null, token);
            setSensorNodes(response.data || []);
        } catch (e) {
            setGlobalError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Lệnh gọi API chung (dùng cho Manual Control)
    const fetchAPI = useCallback(async (endpoint, method = 'GET', body = null) => {
        setGlobalError(null);
        try {
            const response = await apiClient(endpoint, method, body, token);
            return response;
        } catch (e) {
            setGlobalError(e.message);
            throw e; // Bắt buộc throw để các component gọi biết lỗi
        }
    }, [token]);

    // --- Lifecycle Effects ---
    
    useEffect(() => {
        const storedToken = localStorage.getItem('irrigation_token');
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
            // Giả lập người dùng nếu token tồn tại
            setUser({ username: 'Admin', id: 1 }); 
        }
        setIsLoading(false);
    }, []);
    
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchSensorNodes();
        }
    }, [isAuthenticated, token, fetchSensorNodes]); 
    

    const value = {
        isAuthenticated, user, token,
        login, logout, fetchAPI,
        sensorNodes,
        latestSensorData,
        isLoading,
        globalError, setGlobalError,
        isSocketConnected,
        fetchSensorNodes,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};