const cron = require('node-cron');
const Gateway = require('../models/GatewayModel');
const WateringHistory = require('../models/WateringHistoryModel');
const SensorNode = require('../models/SensorNodeModel');
const SensorData = require('../models/SensorDataModel');
const { publish } = require('../realtime/mqttService');

const getCurrentTimeStr = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const optimizeWateringDecision = async () => {
    const nowStr = getCurrentTimeStr();
    
    try {
        const gateways = await Gateway.findAll();

        for (const gateway of gateways) {
            const schedules = gateway.watering_schedule || [];

            // 1. KIỂM TRA GIỜ: Có đúng giờ hẹn không?
            if (schedules.includes(nowStr)) {
                console.log(`[Gateway ${gateway.client_id}] ⏰ Đến lịch hẹn (${nowStr}). Đang kiểm tra độ ẩm...`);

                // 2. KIỂM TRA ĐỘ ẨM: Lấy dữ liệu của các Node thuộc Gateway này
                const nodes = await SensorNode.findAll({ where: { gateway_id: gateway.id } });
                
                let isSoilDry = false;
                let currentAvgMoisture = 0;
                let validNodeCount = 0;

                // Duyệt qua các node để xem có node nào bị khô không
                for (const node of nodes) {
                    const latestData = await SensorData.findOne({
                        where: { node_id: node.id },
                        order: [['timestamp', 'DESC']],
                    });

                    if (latestData) {
                        validNodeCount++;
                        currentAvgMoisture += latestData.soil_moisture;
                        
                        // Nếu có bất kỳ node nào dưới ngưỡng -> Coi như đất khô cần tưới
                        if (latestData.soil_moisture < gateway.min_moisture_threshold) {
                            isSoilDry = true;
                        }
                    }
                }

                // Tính trung bình (chỉ để ghi log)
                if (validNodeCount > 0) currentAvgMoisture = (currentAvgMoisture / validNodeCount).toFixed(1);

                // 3. QUYẾT ĐỊNH
                if (isSoilDry) {
                    console.log(`[Gateway ${gateway.client_id}] 💧 Đất khô (${currentAvgMoisture}% < ${gateway.min_moisture_threshold}%). MỞ VAN!`);
                    
                    // --- THỰC HIỆN TƯỚI ---
                    const topic = `gateway/${gateway.client_id}/cmd`;
                    publish(topic, JSON.stringify({ type: 'VALVE_CONTROL', status: 'OPEN' }));

                    // Cập nhật UI
                    for (const node of nodes) {
                        node.last_valve_status = 'OPEN';
                        await node.save();
                    }

                    // Lưu lịch sử
                    await WateringHistory.create({
                        gateway_id: gateway.id,
                        action: 'OPEN',
                        source: 'AUTO_SCHEDULE',
                        duration_seconds: gateway.max_watering_duration,
                        reason: `Lịch ${nowStr} & Độ ẩm thấp (${currentAvgMoisture}%)`
                    });

                    // Hẹn giờ tắt
                    const duration = gateway.max_watering_duration || 60;
                    setTimeout(async () => {
                        console.log(`[Gateway ${gateway.client_id}] ⏳ Đã tưới xong (${duration}s). Đóng van.`);
                        publish(topic, JSON.stringify({ type: 'VALVE_CONTROL', status: 'CLOSE' }));
                        
                        await WateringHistory.create({
                            gateway_id: gateway.id,
                            action: 'CLOSE',
                            source: 'AUTO_OFF',
                            reason: 'Hết thời gian tưới'
                        });

                        for (const node of nodes) {
                            node.last_valve_status = 'CLOSE';
                            await node.save();
                        }
                    }, duration * 1000);

                } else {
                    console.log(`[Gateway ${gateway.client_id}] 🌤️ Đất vẫn ẩm (${currentAvgMoisture}% >= ${gateway.min_moisture_threshold}%). BỎ QUA TƯỚI.`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Lỗi Scheduler Gateway:', error);
    }
};

const startScheduler = () => {
    // Chạy mỗi phút
    cron.schedule('* * * * *', optimizeWateringDecision, {
        scheduled: true,
        timezone: "Asia/Ho_Chi_Minh" 
    });
    console.log('[DECISION] 🕒 Scheduler: Quét giờ & độ ẩm mỗi phút.');
};

module.exports = { startScheduler };