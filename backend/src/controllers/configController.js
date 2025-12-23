const SensorNode = require('../models/SensorNodeModel');
const Gateway = require('../models/GatewayModel');

exports.getAllNodes = async (req, res) => {
    try {
        // 👇 QUAN TRỌNG: Include Gateway để lấy tên khu vực và ngưỡng ẩm
        const nodes = await SensorNode.findAll({
            include: [{
                model: Gateway,
                attributes: ['location', 'min_moisture_threshold', 'max_watering_duration']
            }],
            attributes: ['id', 'device_eui', 'connected_gateway', 'gateway_id', 'last_valve_status', 'is_online']
        });
        res.status(200).json({ status: 'success', data: nodes });
    } catch (error) {
        console.error("Lỗi lấy danh sách:", error);
        res.status(500).json({ message: 'Lỗi lấy danh sách Node.' });
    }
};

exports.createNode = async (req, res) => {
    try {
        const { device_eui, gateway_id, connected_gateway } = req.body;

        if (!device_eui || !gateway_id) return res.status(400).json({ message: 'Thiếu EUI hoặc chưa chọn Gateway.' });

        // Node không cần lưu location hay threshold nữa (ăn theo Gateway)
        const newNode = await SensorNode.create({
            device_eui, 
            gateway_id,
            connected_gateway: connected_gateway || 'Unknown', 
            last_valve_status: 'OFF'
        });

        res.status(201).json({ status: 'success', data: newNode });
    } catch (error) {
        console.error("Lỗi tạo node:", error);
        res.status(500).json({ message: 'Lỗi tạo Node.' });
    }
};

exports.deleteNode = async (req, res) => {
    try {
        await SensorNode.destroy({ where: { id: req.params.nodeId } });
        res.status(200).json({ status: 'success', message: 'Đã xóa thiết bị thành công.' });
    } catch (error) { res.status(500).json({ message: 'Lỗi xóa thiết bị.' }); }
};

// ... (Giữ các hàm khác nếu cần, nhưng bỏ updateNodeConfig đi vì giờ cấu hình ở Gateway)
exports.updateNodeConfig = async (req, res) => {
     // Hàm này giờ chủ yếu để đổi Gateway cho Node nếu cần
    try {
        const { nodeId } = req.params;
        const node = await SensorNode.findByPk(nodeId);
        if(node) {
            await node.update(req.body);
            res.status(200).json({status: 'success'});
        }
    } catch(e) { res.status(500).json({message: 'Lỗi'}); }
}