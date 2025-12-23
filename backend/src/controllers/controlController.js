const mqttService = require('../realtime/mqttService');
const Gateway = require('../models/GatewayModel');
const SensorNode = require('../models/SensorNodeModel');
const socketService = require('../realtime/socketService');
const WateringHistory = require('../models/WateringHistoryModel'); 

exports.toggleGatewayValve = async (req, res) => {
    try {
        const { id } = req.params;
        const { command } = req.body; 

        const gateway = await Gateway.findByPk(id);
        if (!gateway) return res.status(404).json({ message: 'Gateway không tồn tại.' });

        const upperCommand = command ? command.toUpperCase() : 'CLOSE';
        const topic = `gateway/${gateway.client_id}/cmd`;
        
        // 1. Gửi lệnh MQTT
        const payload = JSON.stringify({ type: 'VALVE_CONTROL', status: upperCommand });
        mqttService.publish(topic, payload);

        // 2. 👇 CẬP NHẬT TRỰC TIẾP VÀO GATEWAY (Quan trọng nhất)
        gateway.valve_status = upperCommand;
        await gateway.save();

        // 3. Cập nhật các Node con (để đồng bộ dữ liệu cũ nếu cần)
        const nodes = await SensorNode.findAll({ where: { gateway_id: gateway.id } });
        for (const node of nodes) {
            node.last_valve_status = upperCommand;
            await node.save();
        }

        // 4. Gửi Socket báo Dashboard cập nhật ngay
        socketService.emit('new_sensor_data', {
            gatewayId: gateway.id,
            valve_status: upperCommand, // Dashboard sẽ nhận cái này
            last_update: new Date()
        });

        // 5. Lưu lịch sử
        await WateringHistory.create({
            gateway_id: gateway.id,
            action: upperCommand,
            source: 'MANUAL',
            duration_seconds: upperCommand === 'OPEN' ? (gateway.max_watering_duration || 60) : 0,
            reason: 'Người dùng bấm nút'
        });

        // 6. Logic Auto-OFF
        if (upperCommand === 'OPEN') {
            const duration = gateway.max_watering_duration || 60;
            setTimeout(async () => {
                mqttService.publish(topic, JSON.stringify({ type: 'VALVE_CONTROL', status: 'CLOSE' }));
                
                // Update Gateway về CLOSE
                const gw = await Gateway.findByPk(id);
                if(gw) { gw.valve_status = 'CLOSE'; await gw.save(); }

                for (const node of nodes) {
                    node.last_valve_status = 'CLOSE';
                    await node.save();
                }

                await WateringHistory.create({
                    gateway_id: gateway.id,
                    action: 'CLOSE',
                    source: 'AUTO_OFF',
                    reason: 'Auto-off'
                });

                socketService.emit('new_sensor_data', {
                    gatewayId: gateway.id,
                    valve_status: 'CLOSE',
                    last_update: new Date()
                });
            }, duration * 1000);
        }

        return res.status(200).json({ status: 'success', message: `Đã ${upperCommand}` });

    } catch (error) {
        console.error("Error toggleGatewayValve:", error);
        res.status(500).json({ message: 'Lỗi server.' });
    }
};
// ... (Giữ nguyên toggleNodeActive)

exports.toggleNodeActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body; 
        const node = await SensorNode.findByPk(id);
        if (!node) return res.status(404).json({ message: 'Node k tồn tại' });
        node.is_active = isActive;
        await node.save();
        res.status(200).json({ status: 'success', data: node });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};