import React, { useState, useEffect, use } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import { Search, Package, Clock, CheckCircle, XCircle, Truck, PackageCheck, AlertCircle, Calendar as CalendarIcon, FilterX, Eye, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
    'Payment Success',
    'Prepare Order',
    'Packaging Complete',
    'In transit',
    'Deliver Complete',
    'Cancelled'
];

const CANCEL_REASONS = [
    'สินค้าหมดสต็อก (Out of Stock)',
    'ลูกค้าต้องการยกเลิกคำสั่งซื้อ',
    'ไม่สามารถติดต่อลูกค้าได้',
    'ข้อมูลที่อยู่จัดส่งไม่ถูกต้อง',
    'สินค้าชำรุดก่อนจัดส่ง',
    'อื่นๆ'
];

function AdminOrderPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Current');

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const navigate = useNavigate();
    const [cancelModal, setCancelModal] = useState({ isOpen: false, orderId: null, reason: '', customReason: '' });
    const [viewModal, setViewModal] = useState({ isOpen: false, order: null });

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("OrderDate", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(orderData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        if (newStatus === 'Cancelled') {
            setCancelModal({ isOpen: true, orderId: orderId, reason: '', customReason: '' });
            return;
        }

        try {
            await updateDoc(doc(db, "orders", orderId), {
                OrderStatus: newStatus,
                CancelReason: null
            });
            toast.success('อัปเดตสถานะคำสั่งซื้อเรียบร้อยแล้ว!');
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะคำสั่งซื้อ');
        }
    };

    const confirmCancellation = async () => {
        if (!cancelModal.reason.trim()) {
            toast.error('กรุณาระบุเหตุผลการยกเลิก');
            return;
        }

        let finalReason = cancelModal.reason;
        if (cancelModal.reason === 'อื่นๆ') {
            if (!cancelModal.customReason.trim()) {
                toast.error('กรุณาระบุเหตุผลการยกเลิกเพิ่มเติม');
                return;
            }
            finalReason = `อื่นๆ: ${cancelModal.customReason.trim()}`;
        }

        try {
            await updateDoc(doc(db, "orders", cancelModal.orderId), {
                OrderStatus: 'Cancelled',
                CancelReason: finalReason
            });
            toast.success('ยกเลิกคำสั่งซื้อสำเร็จ!');
            setCancelModal({ isOpen: false, orderId: null, reason: '', customReason: '' });
        }
        catch (error) {
            console.error('Error cancelling order:', error);
            toast.error('เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Payment Success': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Prepare Order': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'Packaging Complete': return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'In transit': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Deliver Complete': return 'bg-green-50 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
    }

    // --- สเต็ปที่ 1: กรองเฉพาะคำค้นหา และ วันที่ (ยังไม่แยก Tab) ---
    const searchedOrders = orders.filter(order => {
        const term = searchTerm.toLowerCase();

        const matchesSearch =
            order.OrderNumber?.toString().includes(term) ||
            order.CustomerName?.toLowerCase().includes(term) ||
            order.CustomerEmail?.toLowerCase().includes(term) ||
            order.CustomerPhone?.includes(term);

        let matchesDate = true;
        if (startDate || endDate) {
            if (order.OrderDate) {
                const orderDataStr = order.OrderDate.toDate().toISOString().split('T')[0];
                if (startDate && endDate) {
                    matchesDate = orderDataStr >= startDate && orderDataStr <= endDate;
                } else if (startDate) {
                    matchesDate = orderDataStr >= startDate;
                } else if (endDate) {
                    matchesDate = orderDataStr <= endDate;
                }
            } else {
                matchesDate = false;
            }
        }

        return matchesSearch && matchesDate;
    });

    // --- สเต็ปที่ 2: นับจำนวน Order แต่ละสถานะเพื่อโชว์ที่ปุ่ม Tab ---
    const currentCount = searchedOrders.filter(o => !['Deliver Complete', 'Cancelled'].includes(o.OrderStatus)).length;
    const completedCount = searchedOrders.filter(o => o.OrderStatus === 'Deliver Complete').length;
    const cancelledCount = searchedOrders.filter(o => o.OrderStatus === 'Cancelled').length;

    // --- สเต็ปที่ 3: คัดกรองข้อมูลอีกรอบ เพื่อเอาไปแสดงผลในตารางตาม Tab ที่เลือก ---
    const filteredOrders = searchedOrders.filter(order => {
        if (activeTab === 'Current') return !['Deliver Complete', 'Cancelled'].includes(order.OrderStatus);
        if (activeTab === 'Completed') return order.OrderStatus === 'Deliver Complete';
        if (activeTab === 'Cancelled') return order.OrderStatus === 'Cancelled';
        return true;
    });


    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <AdminNavbar />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* Header & Advanced Search */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 gap-4">
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold text-gray-900">การจัดการคำสั่งซื้อ (Order Management)</h1>
                        <p className="text-sm text-gray-500 mt-1">ติดตามและอัปเดตสถานะคำสั่งซื้อของลูกค้า</p>
                    </div>

                    {/* --- โซนเครื่องมือค้นหาและกรองวันที่ --- */}
                    <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-end">

                        {/* กรองวันที่ */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">ตั้งแต่ (Start)</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 shadow-sm"
                                />
                            </div>
                            <span className="text-gray-400 mt-4">-</span>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">ถึง (End)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 shadow-sm"
                                />
                            </div>
                        </div>

                        {/* กล่องค้นหาข้อความ */}
                        <div className="flex flex-col w-full md:w-72 relative">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">ค้นหาข้อมูล</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Order, ชื่อ, อีเมล, เบอร์..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                                />
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            </div>
                        </div>

                        {/* ปุ่มล้างตัวกรอง */}
                        {(searchTerm || startDate || endDate) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-bold flex items-center gap-2 transition"
                            >
                                <FilterX size={16} /> ล้างค่า
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
                    <button
                        onClick={() => setActiveTab('Current')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition duration-200 
                            ${activeTab === 'Current' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        กำลังดำเนินการ ({currentCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('Completed')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition duration-200 
                            ${activeTab === 'Completed' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        เสร็จสิ้น ({completedCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('Cancelled')}
                        className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition duration-200 
                            ${activeTab === 'Cancelled' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        ยกเลิก ({cancelledCount})
                    </button>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-b-xl rounded-t-sm shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">Order ID</th>
                                    <th className="px-6 py-4 font-bold">วันที่สั่งซื้อ</th>
                                    <th className="px-6 py-4 font-bold">ข้อมูลลูกค้า</th>
                                    <th className="px-6 py-4 font-bold text-center">จำนวนสินค้า</th>
                                    <th className="px-6 py-4 font-bold text-right">ยอดรวม (฿)</th>
                                    <th className="px-6 py-4 font-bold">สถานะ (Status)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูลคำสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-blue-50/50 transition duration-150">

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-bold text-blue-600">#{order.OrderNumber}</span>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {order.OrderDate?.toDate().toLocaleString('th-TH', {
                                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">{order.CustomerName}</div>
                                                <div className="text-[10px] text-gray-500 flex gap-2 mt-1">
                                                    <span>{order.CustomerPhone}</span>
                                                    <span>|</span>
                                                    <span>{order.CustomerEmail}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-700">
                                                {order.TotalQuantity} ชิ้น
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                                {Number(order.TotalPrice).toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {/* 🌟 จัดกลุ่มปุ่มดวงตา กับ Dropdown ให้อยู่บรรทัดเดียวกัน */}
                                                <div className="flex flex-col gap-2 w-40 mx-auto">
                                                    <div className="flex items-center gap-2">


                                                        {/* Dropdown เปลี่ยนสถานะ */}
                                                        <select
                                                            value={order.Status || order.status || ''}
                                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer bg-white"
                                                            disabled={order.Status === 'Cancelled' || order.status === 'Cancelled'}
                                                        >
                                                            {STATUS_OPTIONS.map(status => (
                                                                <option key={status} value={status}>{status}</option>
                                                            ))}
                                                        </select>                                                        {/* ปุ่มดูรายละเอียด */}
                                                        <button
                                                            onClick={() => setViewModal({ isOpen: true, order: order })}
                                                            className="flex-shrink-0 p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-md rounded-lg transition border border-blue-200"
                                                            title="ดูรายละเอียดคำสั่งซื้อ"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </div>


                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- Modal เหตุผลการยกเลิก --- */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-4 text-red-600 border-b border-gray-100 pb-4">
                            <AlertCircle size={28} />
                            <h2 className="text-xl font-bold">ยืนยันการยกเลิกคำสั่งซื้อ</h2>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                โปรดระบุเหตุผลในการยกเลิก <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                            >
                                <option value="" disabled>-- เลือกเหตุผล --</option>
                                {CANCEL_REASONS.map(reason => (
                                    <option key={reason} value={reason}>{reason}</option>
                                ))}
                            </select>

                            {cancelModal.reason === 'อื่นๆ' && (
                                <div className="mt-3 animate-fade-in-up">
                                    <input
                                        type="text"
                                        placeholder="โปรดระบุเหตุผลเพิ่มเติม..."
                                        value={cancelModal.customReason}
                                        onChange={(e) => setCancelModal({ ...cancelModal, customReason: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white shadow-sm"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setCancelModal({ isOpen: false, orderId: null, reason: '', customReason: '' })}
                                className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                ย้อนกลับ
                            </button>
                            <button
                                onClick={confirmCancellation}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-2"
                            >
                                ยืนยันการยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* 🌟 Modal: ดูรายละเอียดคำสั่งซื้อ (View Order Details) */}
            {/* ========================================== */}
            {viewModal.isOpen && viewModal.order && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in-down">

                        {/* Header */}
                        <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Receipt className="text-blue-600" /> รายละเอียดคำสั่งซื้อ
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-mono">Order ID: {viewModal.order.id}</p>
                            </div>
                            <button onClick={() => setViewModal({ isOpen: false, order: null })} className="text-gray-400 hover:text-red-500 transition text-xl font-bold p-1">
                                ✕
                            </button>
                        </div>

                        {/* Body (Scrollable) */}
                        <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1">

                            {/* ส่วนที่ 1: ข้อมูลลูกค้า & ที่อยู่จัดส่ง */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <h3 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">ข้อมูลลูกค้า</h3>
                                    <p className="text-sm text-gray-700 mb-1">
                                        <span className="font-semibold">ชื่อ-นามสกุล:</span> {viewModal.order.CustomerName || '-'}
                                    </p>
                                    <p className="text-sm text-gray-700 mb-1">
                                        <span className="font-semibold">เบอร์โทร:</span> {viewModal.order.CustomerPhone || '-'}
                                    </p>
                                    {viewModal.order.CustomerEmail && (
                                        <p className="text-sm text-gray-700 mb-1">
                                            <span className="font-semibold">อีเมล:</span> {viewModal.order.CustomerEmail}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                    <h3 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">ที่อยู่จัดส่ง</h3>
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {/* ดึงจากฟิลด์ ShippingAddress ตามฐานข้อมูลของคุณเป๊ะๆ */}
                                        {(() => {
                                            const addr = viewModal.order.ShippingAddress || viewModal.order.Address;
                                            if (typeof addr === 'object' && addr !== null) {
                                                return `${addr.Address || ''} ${addr.SubDistrict || ''} ${addr.District || ''} ${addr.Province || ''} ${addr.Zipcode || ''}`;
                                            }
                                            return addr || 'ไม่ได้ระบุข้อมูลที่อยู่';
                                        })()}
                                    </p>
                                </div>
                            </div>

                            {/* ส่วนที่ 2: รายการสินค้าที่สั่ง */}
                            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Package size={16} /> รายการสินค้า
                            </h3>
                            <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">สินค้า</th>
                                            <th className="px-4 py-3 font-semibold text-center">ราคา/ชิ้น</th>
                                            <th className="px-4 py-3 font-semibold text-center">จำนวน</th>
                                            <th className="px-4 py-3 font-semibold text-right">รวม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {/* ดึงจาก Array ชื่อ Items และ Quantity ตามฐานข้อมูล */}
                                        {(viewModal.order.Items || []).map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800">{item.ProductName || 'ไม่ทราบชื่อสินค้า'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600">฿{(item.Price || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">{item.Quantity || 1}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                                    ฿{((item.Price || 0) * (item.Quantity || 1)).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ส่วนที่ 3: สรุปยอดและช่องทางชำระเงิน */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">ช่องทางการชำระเงิน</p>
                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                        {viewModal.order.PaymentMethod === 'PromptPay' ? '📱 พร้อมเพย์ (PromptPay)' :
                                            viewModal.order.PaymentMethod === 'Credit Card' ? '💳 บัตรเครดิต/เดบิต' :
                                                viewModal.order.PaymentMethod || 'ไม่ระบุ'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 mb-1">ยอดชำระสุทธิ (Total Amount)</p>
                                    <div className="text-2xl font-black text-blue-600">
                                        ฿{(viewModal.order.TotalPrice || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );

}

export default AdminOrderPage;