// backend/src/services/decisionEngine.js

const cron = require('node-cron');
const SensorNode = require('../models/SensorNodeModel');
const SensorData = require('../models/SensorDataModel');
const WateringHistory = require('../models/WateringHistoryModel');
const { getForecast } = require('./weatherService'); 
const { sendCommand } = require('./mqttService'); 

// Thời gian tối đa để trì hoãn tưới nếu dự báo có mưa (tính bằng giờ)
const RAIN_DELAY_HOURS = 24; 

/**
 * Hàm lấy dữ liệu độ ẩm mới nhất cho một Node
 * @param {number} nodeId - ID của SensorNode
 */
const getLatestMoisture = async (nodeId) => {
    const latestData = await SensorData.findOne({
        where: { node_id: nodeId },
        order: [['timestamp', 'DESC']],
        limit: 1,
        attributes: ['soil_moisture']
    });
    return latestData ? latestData.soil_moisture : null;
};

/**
 * Thuật toán tối ưu hóa quyết định tưới tiêu
 */
const optimizeWateringDecision = async () => {
    console.log(`[DECISION] Starting optimization cycle at ${new Date().toLocaleTimeString()}`);
    
    try {
        // 1. Lấy tất cả các Node cảm biến và ngưỡng của chúng
        const nodes = await SensorNode.findAll();

        for (const node of nodes) {
            // 2. Lấy độ ẩm hiện tại
            const currentMoisture = await getLatestMoisture(node.id);
            
            if (currentMoisture === null) {
                console.warn(`[Node ${node.id}] ⚠️ No recent data for Node: ${node.area_name}. Skipping decision.`);
                continue;
            }

            const threshold = node.min_moisture_threshold;
            const requiredWatering = currentMoisture < threshold;
            let decisionDetails = {
                moisture: currentMoisture,
                threshold: threshold,
                rain_delay_active: false
            };

            // --- Logic Tối Ưu Hóa ---
            if (requiredWatering) {
                console.log(`[Node ${node.id}] 🚨 Moisture (${currentMoisture}%) is BELOW threshold (${threshold}%). Checking weather...`);
                
                // 3. Gọi Weather Service để kiểm tra dự báo bằng TỌA ĐỘ
                // GIẢ ĐỊNH: SensorNodeModel có trường 'latitude' và 'longitude'
                const forecast = await getForecast(node.latitude, node.longitude); 
                
                decisionDetails.weatherForecast = forecast;

                if (forecast && forecast.rain_expected_24h) {
                    // 4. Áp dụng Logic Trì Hoãn Mưa (Optimization Logic)
                    decisionDetails.rain_delay_active = true;
                    
                    console.log(`[Node ${node.id}] 🌧️ Rain expected. DECISION: DELAY (Save Water). Details: ${forecast.details}`);
                    
                    // Ghi lại quyết định trì hoãn
                    await WateringHistory.create({
                        node_id: node.id,
                        duration_seconds: 0,
                        reason: `Delayed due to predicted rain within ${RAIN_DELAY_HOURS}h.`,
                        decision_details: decisionDetails,
                    });

                } else {
                    // 5. Ra quyết định TƯỚI
                    const duration = node.max_watering_duration;
                    console.log(`[Node ${node.id}] 💧 Weather CLEAR. DECISION: WATERING for ${duration} seconds.`);
                    
                    // Gửi lệnh điều khiển qua MQTT (Downlink)
                    const success = await sendCommand(node.device_eui, duration);

                    if (success) {
                        // 6. Ghi lại lịch sử tưới tiêu thành công
                        await WateringHistory.create({
                            node_id: node.id,
                            duration_seconds: duration,
                            reason: "Auto - Low Moisture",
                            decision_details: decisionDetails,
                        });
                        
                        // Cập nhật trạng thái van (giả định là ON)
                        await node.update({ last_valve_status: 'ON' });
                        // Thiết lập timer để giả lập OFF sau khi tưới xong
                        setTimeout(async () => {
                            await node.update({ last_valve_status: 'OFF' });
                        }, duration * 1000);
                        
                    } else {
                        console.error(`[Node ${node.id}] ❌ Failed to send MQTT command.`);
                    }
                }
            } else {
                console.log(`[Node ${node.id}] 👍 Moisture (${currentMoisture}%) is OK. No action taken.`);
            }
        }
    } catch (error) {
        console.error('❌ Lỗi trong Decision Engine:', error);
    }
};

/**
 * Hàm khởi tạo và lập lịch chạy Decision Engine
 */
const initDecisionEngine = () => {
    // Chạy logic tối ưu hóa mỗi 5 phút
    cron.schedule('*/5 * * * *', optimizeWateringDecision, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh" 
    });

    console.log('[DECISION] 🕒 Decision Engine scheduled to run every 5 minutes.');
    
    // Chạy lần đầu ngay khi khởi động
    optimizeWateringDecision(); 
};

module.exports = {
    initDecisionEngine,
    optimizeWateringDecision 
};
