// backend/src/controllers/dataController.js

const SensorData = require('../models/SensorDataModel');
const SensorNode = require('../models/SensorNodeModel');
const Gateway = require('../models/GatewayModel');
const WateringHistory = require('../models/WateringHistoryModel'); 
const { Op } = require('sequelize');

// --- 1. LẤY DANH SÁCH GATEWAY ---
exports.getAllGateways = async (req, res) => {
    try {
        const gateways = await Gateway.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ status: 'success', data: gateways });
    } catch (error) {
        console.error("Lỗi getAllGateways:", error);
        res.status(500).json({ message: 'Lỗi server lấy danh sách Gateway' });
    }
};

// --- 2. LẤY DANH SÁCH NODE ---
exports.getAllNodes = async (req, res) => {
    try {
        const nodes = await SensorNode.findAll({
            include: [{
                model: Gateway,
                attributes: ['id', 'client_id', 'location', 'min_moisture_threshold', 'max_watering_duration']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ status: 'success', data: nodes });
    } catch (error) {
        console.error("Lỗi getAllNodes:", error);
        res.status(500).json({ message: 'Lỗi server lấy danh sách Node' });
    }
};

// --- 3. LẤY DỮ LIỆU DASHBOARD ---
exports.getLatestData = async (req, res) => {
    try {
        const nodes = await SensorNode.findAll({
            include: [{ model: Gateway, attributes: ['location'] }]
        });

        const result = await Promise.all(nodes.map(async (node) => {
            const latestData = await SensorData.findOne({
                where: { node_id: node.id },
                order: [['timestamp', 'DESC']],
            });

            return {
                node_id: node.id,
                gateway_id: node.gateway_id,
                device_eui: node.device_eui,
                location: node.Gateway ? node.Gateway.location : 'Chưa định vị',
                soil_moisture: latestData ? latestData.soil_moisture : 0,
                air_humidity: latestData ? latestData.air_humidity : 0,
                temperature: latestData ? latestData.temperature : 0,
                valve_status: node.last_valve_status,
                is_online: node.is_online,
                last_update: latestData ? latestData.timestamp : node.updatedAt
            };
        }));

        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        console.error("Lỗi getLatestData:", error);
        res.status(500).json({ message: 'Lỗi server Dashboard.' });
    }
};

// --- 4. LẤY LỊCH SỬ CẢM BIẾN ---
exports.getHistoryData = async (req, res) => {
    try {
        const { nodeId, limit } = req.query;
        const limitRecord = limit ? parseInt(limit) : 50; 
        const whereCondition = {};
        if (nodeId) whereCondition.node_id = nodeId;

        const history = await SensorData.findAll({
            where: whereCondition,
            order: [['timestamp', 'DESC']],
            limit: limitRecord,
            include: [{ 
                model: SensorNode, 
                attributes: ['device_eui', 'id'],
                include: [{
                    model: Gateway,
                    attributes: ['location', 'client_id']
                }]
            }]
        });
        
        res.status(200).json({ status: 'success', data: history }); 
    } catch (error) {
        console.error("Lỗi getHistoryData:", error);
        res.status(500).json({ message: 'Lỗi server lấy lịch sử.' });
    }
};

// --- 5. LẤY LỊCH SỬ TƯỚI (ĐÃ SỬA: CHỈ INCLUDE GATEWAY) ---
exports.getWateringLogs = async (req, res) => {
    try {
        const logs = await WateringHistory.findAll({
            limit: 50,
            order: [['command_time', 'DESC']],
            // 👇 Chỉ lấy thông tin Gateway
            include: [
                { model: Gateway, attributes: ['location', 'client_id'] }
            ]
        });
        res.status(200).json({ status: 'success', data: logs });
    } catch (error) {
        console.error("Lỗi getWateringLogs:", error);
        res.status(500).json({ message: 'Lỗi server lấy lịch sử tưới.' });
    }
};