// backend/src/controllers/dataController.js

const SensorData = require('../models/SensorDataModel');
const SensorNode = require('../models/SensorNodeModel');
const Gateway = require('../models/GatewayModel');
const WateringHistory = require('../models/WateringHistoryModel'); 
const { Op } = require('sequelize');

// --- 1. GET GATEWAY LIST ---
exports.getAllGateways = async (req, res) => {
    try {
        const gateways = await Gateway.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ status: 'success', data: gateways });
    } catch (error) {
        console.error("Error getAllGateways:", error);
        res.status(500).json({ message: 'Server error fetching Gateway list' });
    }
};

// --- 2. GET NODE LIST ---
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
        console.error("Error getAllNodes:", error);
        res.status(500).json({ message: 'Server error fetching Node list' });
    }
};

// --- 3. GET DASHBOARD DATA (LATEST) ---
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
                location: node.Gateway ? node.Gateway.location : 'Unlocated',
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
        console.error("Error getLatestData:", error);
        res.status(500).json({ message: 'Server error Dashboard data.' });
    }
};

// --- 4. GET SENSOR HISTORY (FIXED) ---
exports.getHistoryData = async (req, res) => {
    try {
        const { nodeId, limit } = req.query;
        // Default limit increased to 200 for better chart visualization
        const limitRecord = limit ? parseInt(limit) : 200; 
        const whereCondition = {};
        if (nodeId) whereCondition.node_id = nodeId;

        const history = await SensorData.findAll({
            where: whereCondition,
            order: [['timestamp', 'DESC']],
            limit: limitRecord,
            include: [{ 
                model: SensorNode, 
                // 👇 IMPORTANT FIX: Added 'gateway_id' here so Frontend can filter
                attributes: ['device_eui', 'id', 'gateway_id'], 
                include: [{
                    model: Gateway,
                    // 👇 Added 'id' here as well for safety
                    attributes: ['location', 'client_id', 'id'] 
                }]
            }]
        });
        
        res.status(200).json({ status: 'success', data: history }); 
    } catch (error) {
        console.error("Error getHistoryData:", error);
        res.status(500).json({ message: 'Server error fetching history.' });
    }
};

// --- 5. GET WATERING LOGS ---
exports.getWateringLogs = async (req, res) => {
    try {
        const logs = await WateringHistory.findAll({
            limit: 50,
            order: [['command_time', 'DESC']],
            include: [
                { model: Gateway, attributes: ['location', 'client_id', 'id'] }
            ]
        });
        res.status(200).json({ status: 'success', data: logs });
    } catch (error) {
        console.error("Error getWateringLogs:", error);
        res.status(500).json({ message: 'Server error fetching watering logs.' });
    }
};