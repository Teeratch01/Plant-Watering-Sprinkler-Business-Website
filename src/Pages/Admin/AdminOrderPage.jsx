import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import { Search, Package, Clock, CheckCircle, XCircle, Truck, PackageCheck, AlertCircle, Calendar as CalendarIcon, FilterX, Eye, Receipt, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

const STATUS_OPTIONS = [
    { value: 'Payment In Progress', label: 'Payment In Progress (รอชำระเงิน/ตรวจสอบ)' },
    { value: 'Payment Success', label: 'Payment Success (ชำระเงินสำเร็จ)' },
    { value: 'Prepare Order', label: 'Prepare Order (กำลังเตรียมสินค้า)' },
    { value: 'Packaging Complete', label: 'Packaging Complete (บรรจุเรียบร้อย)' },
    { value: 'In transit', label: 'In transit (อยู่ระหว่างจัดส่ง)' },
    { value: 'Deliver Complete', label: 'Deliver Complete (จัดส่งสำเร็จ)' },
    { value: 'Cancelled', label: 'Cancelled (ยกเลิกคำสั่งซื้อ)' }
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

    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false)

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("OrderDate", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orderData = [];
            const now = new Date(); // เวลาปัจจุบัน

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;

                // ระบบ Auto-Cancel: เช็คว่าสถานะเป็น Payment In Progress, ยังไม่มีสลิป, และมีวันที่สั่งซื้อ
                if (data.OrderStatus === 'Payment In Progress' && !data.PaymentSlipUrl && data.OrderDate) {

                    // แปลงวันที่สั่งซื้อให้อยู่ในรูปแบบ Date Object
                    const orderDate = typeof data.OrderDate.toDate === 'function' ? data.OrderDate.toDate() : new Date(data.OrderDate);

                    // คำนวณหาระยะห่างของเวลา (ชั่วโมง)
                    const diffHours = (now - orderDate) / (1000 * 60 * 60);

                    // ถ้าเวลาผ่านไปเกิน 24 ชั่วโมง (หรือจะปรับเป็นตัวเลขอื่นก็ได้)
                    if (diffHours >= 24) {
                        const cancelReason = 'ไม่ได้ส่งหลักฐานการยืนยันการชำระเงินในเวลาที่กำหนด (ระบบยกเลิกอัตโนมัติ)';

                        // 1. สั่งอัปเดตไปที่ Firebase ทันทีแบบเงียบๆ (Background Update)
                        updateDoc(doc(db, "orders", id), {
                            OrderStatus: 'Cancelled',
                            CancelReason: cancelReason
                        }).catch(err => console.error("Error auto-cancelling order:", err));

                        // 2. อัปเดตข้อมูลที่จะแสดงบนหน้าจอแอดมินให้กลายเป็น Cancelled ทันที (จะได้ไม่เห็นว่ามันค้าง)
                        data.OrderStatus = 'Cancelled';
                        data.CancelReason = cancelReason;
                    }
                }

                orderData.push({ id, ...data });
            });

            setOrders(orderData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleOpenViewModal = async (order) => {
        setViewModal({ isOpen: true, order: order });
        setSelectedPayment(null);
        setIsPaymentLoading(true); // เริ่มโหลด

        try {
            const paymentsRef = collection(db, "payments");
            const qPayment = query(paymentsRef, where("OrderID", "==", order.id));
            const paymentSnapshot = await getDocs(qPayment);

            if (!paymentSnapshot.empty) {
                setSelectedPayment(paymentSnapshot.docs[0].data());
            } else {
                setSelectedPayment({ Method: 'not_found' }); // ดักไว้กรณีไม่พบข้อมูล
            }
        } catch (error) {
            console.error("Error fetching payment data: ", error);
            setSelectedPayment({ Method: 'error' });
        } finally {
            setIsPaymentLoading(false); // โหลดเสร็จแล้ว
        }
    };


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

            if (viewModal.isOpen && viewModal.order.id === orderId) {
                setViewModal({ isOpen: false, order: null });
            }


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
            if (order.OrderDate && typeof order.OrderDate.toDate === 'function') {
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

    const handleRejectSlip = async (order) => {
        if (!order.CustomerEmail) {
            toast.error('ไม่สามารถส่งอีเมลได้ เนื่องจากลูกค้าไม่ได้ระบุอีเมลไว้');
            return;
        }

        if (!window.confirm('ยืนยันการปฏิเสธสลิปและส่งอีเมลแจ้งลูกค้าให้อัปโหลดสลิปใหม่?')) return;

        setIsRejecting(true);

        try {
            // 1. ส่ง Email แจ้งลูกค้าผ่าน EmailJS
            const templateParams = {
                email: order.CustomerEmail,
                name: order.CustomerName || 'ลูกค้า',
                title: `แจ้งสถานะการชำระเงิน คำสั่งซื้อ #${order.OrderNumber}`,
                message: `ตรวจสอบพบว่ายอดเงินในสลิปที่คุณแนบมา ไม่ตรงกับยอดสุทธิของคำสั่งซื้อ หรือ หลักฐานการชำระเงินเกิดข้อผิดพลาด\n\nยอดสุทธิที่ต้องชำระคือ: ฿${Number(order.TotalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \n\nคุณสามารถดูสลิปเดิมที่แนบมาผิดได้ที่ลิงก์นี้: ${order.PaymentSlipUrl} \n\nกรุณาทำการโอนเงินให้ถูกต้อง หรือ ทำการตรวจสอบการโอนเงินอีกครั้ง และเข้าสู่ระบบเพื่ออัปโหลดสลิปใหม่ผ่านหน้า "ประวัติการสั่งซื้อ" ของคุณ หรือนำเลขคำสั่งซื้อที่ได้รับผ่านอีเมลนำไปค้นหาในเมนู "คำสั่งซื้อ" เพื่ออัปโหลดสลิปใหม่อีกครั้ง`
            };

            // ใส่ YOUR_SERVICE_ID, YOUR_TEMPLATE_ID, YOUR_PUBLIC_KEY จากเว็บ EmailJS ของคุณ
            await emailjs.send(
                'service_ggjvrgp',     // 1. Service ID
                'template_6slcuhp',    // 2. Template ID
                templateParams,
                'l0FcJmRFJUKMjF1sG'
            );

            // 2. อัปเดตข้อมูลใน Firebase (เคลียร์ค่า PaymentSlipUrl ให้เป็น null)
            await updateDoc(doc(db, "orders", order.id), {
                PaymentSlipUrl: null
            });

            toast.success('ปฏิเสธสลิปและส่งอีเมลแจ้งลูกค้าเรียบร้อยแล้ว');
            setViewModal({ isOpen: false, order: null }); // ปิดหน้าต่าง Modal

        } catch (error) {
            console.error("Error rejecting slip:", error);
            toast.error('เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsRejecting(false);
        }
    };


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

                    <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-end">
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
                <div className="bg-white rounded-b-xl rounded-t-sm shadow-sm border border-gray-200 overflow-visible">
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">Order ID</th>
                                    <th className="px-6 py-4 font-bold">วันที่สั่งซื้อ</th>
                                    <th className="px-6 py-4 font-bold">ข้อมูลลูกค้า</th>
                                    <th className="px-6 py-4 font-bold text-center">จำนวนสินค้า</th>
                                    <th className="px-6 py-4 font-bold text-right">ยอดรวม (฿)</th>
                                    <th className="px-6 py-4 font-bold text-center">สถานะ (Status)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูลคำสั่งซื้อที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                                ) : (
                                    filteredOrders.map((order) => {
                                        const isNeedsApproval = order.OrderStatus === 'Payment In Progress' && order.PaymentSlipUrl;

                                        return (
                                            <tr key={order.id} className={`transition duration-150 ${isNeedsApproval ? 'bg-orange-50/50 hover:bg-orange-50' : 'hover:bg-blue-50/50'}`}>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-bold text-blue-600">#{order.OrderNumber}</span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {order.OrderDate && typeof order.OrderDate.toDate === 'function' ? order.OrderDate.toDate().toLocaleString('th-TH', {
                                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    }) : '-'}
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
                                                    {Number(order.TotalPrice).toLocaleString('th-TH', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </td>

                                                <td className="px-4 py-3 text-center relative">
                                                    <div className="flex flex-col gap-2 w-48 mx-auto">
                                                        <div className="flex items-center gap-2">

                                                            <select
                                                                value={order.OrderStatus || ''}
                                                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                                //คลาส disabled:... เข้าไปเพื่อให้เห็นชัดเจนว่าปุ่มถูกล็อคแล้ว
                                                                className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-bold
        ${isNeedsApproval ? 'border-orange-400 text-orange-600 bg-orange-50 animate-pulse' : 'border-gray-200 bg-white'}
        disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200`}

                                                                //  เพิ่มเงื่อนไขการล็อค (disabled) สำหรับ Deliver Complete เข้าไป
                                                                disabled={order.OrderStatus === 'Cancelled' || order.OrderStatus === 'Deliver Complete'}
                                                            >
                                                                {STATUS_OPTIONS.map(option => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>

                                                            {/* . 4. เปลี่ยนมาเรียกใช้ handleOpenViewModal */}
                                                            <button
                                                                onClick={() => handleOpenViewModal(order)}
                                                                className="flex-shrink-0 p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:shadow-md rounded-lg transition border border-blue-200 relative"
                                                                title="ดูรายละเอียดและสลิปการโอน"
                                                            >
                                                                <Eye size={18} />
                                                                {isNeedsApproval && (
                                                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
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
            {/* . Modal: ดูรายละเอียดคำสั่งซื้อและสลิปโอนเงิน */}
            {/* ========================================== */}
            {viewModal.isOpen && viewModal.order && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col animate-fade-in-down">

                        {/* Header */}
                        <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Receipt className="text-blue-600" /> รายละเอียดคำสั่งซื้อ
                                </h2>
                                <p className="text-sm text-gray-500 mt-1 font-mono">Order Number: #{viewModal.order.OrderNumber}</p>
                            </div>
                            <button onClick={() => setViewModal({ isOpen: false, order: null })} className="text-gray-400 hover:text-red-500 transition text-xl font-bold p-1 bg-white border border-gray-200 rounded-lg h-10 w-10 flex items-center justify-center hover:bg-red-50">
                                ✕
                            </button>
                        </div>

                        {/* Body (Scrollable) */}
                        <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1">

                            {viewModal.order.OrderStatus === 'Cancelled' && viewModal.order.CancelReason && (
                                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-down shadow-sm">
                                    <div className="bg-white rounded-full p-1 border border-red-100 shadow-sm shrink-0">
                                        <AlertCircle className="text-red-500" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-red-800">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</h3>
                                        <p className="text-sm text-red-600 mt-1">
                                            <span className="font-semibold text-red-700">เหตุผล:</span> {viewModal.order.CancelReason}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col lg:flex-row gap-6">

                                {/* --- คอลัมน์ซ้าย: การชำระเงิน & สลิป --- */}
                                <div className="w-full lg:w-1/3 flex flex-col gap-6">

                                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                                        <p className="text-sm text-gray-500 mb-1 font-bold">ยอดชำระสุทธิ (Total Amount)</p>
                                        <div className="text-3xl font-black text-blue-600 mb-4">
                                            ฿{(viewModal.order.TotalPrice || 0).toLocaleString('th-TH', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </div>

                                        <div className="border-t border-gray-200 pt-4 flex flex-col items-center gap-2">
                                            <p className="text-xs text-gray-500">ช่องทางการชำระเงิน</p>

                                            {/* . 5. เช็ค Method จาก selectedPayment แทน */}
                                            <div className="font-bold text-gray-800 flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200">
                                                {selectedPayment?.Method === 'qr' ? '📱 พร้อมเพย์ (PromptPay)' :
                                                    selectedPayment?.Method === 'card' ? '💳 บัตรเครดิต/เดบิต' :
                                                        selectedPayment?.Method === 'counter' ? '🏢 เคาน์เตอร์เซอร์วิส' :
                                                            'กำลังโหลด...'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* . 6. แสดงกล่องสลิปโอนเงินถ้าเป็น qr หรือถ้ามีรูปแนบมา */}
                                    {(selectedPayment?.Method === 'qr' || viewModal.order.PaymentSlipUrl) && (
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                                <ImageIcon size={16} className="text-blue-600" /> หลักฐานการโอนเงิน
                                            </h3>

                                            <div className="flex-1 flex flex-col items-center justify-center">
                                                {viewModal.order.PaymentSlipUrl ? (
                                                    <div className="w-full relative group">
                                                        <a href={viewModal.order.PaymentSlipUrl} target="_blank" rel="noopener noreferrer" className="block w-full border border-gray-200 rounded-lg overflow-hidden relative bg-gray-100 hover:shadow-lg transition">
                                                            <img
                                                                src={viewModal.order.PaymentSlipUrl}
                                                                alt="Payment Slip"
                                                                className="w-full object-contain max-h-64"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <span className="bg-white text-gray-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm shadow-xl">
                                                                    <Eye size={16} /> ดูรูปขนาดเต็ม
                                                                </span>
                                                            </div>
                                                        </a>
                                                        {/* โค้ดส่วนปุ่มอนุมัติ/ปฏิเสธ สลิปโอนเงิน */}
                                                        <div className="mt-4 w-full bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 flex flex-col gap-3">
                                                            {/* ข้อความด้านบน */}
                                                            <div className="text-center pb-2 border-b border-blue-200/50">
                                                                <span className="text-xs font-bold text-blue-800">ลูกค้ายืนยันการโอนเงินแล้ว</span>
                                                            </div>

                                                            {/* ปุ่ม 2 ปุ่มด้านล่าง แบ่งครึ่ง 50/50 */}
                                                            <div className="flex flex-row gap-2 w-full">
                                                                <button
                                                                    onClick={() => handleRejectSlip(viewModal.order)}
                                                                    disabled={isRejecting || viewModal.order.OrderStatus !== 'Payment In Progress'}
                                                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold py-2.5 px-1 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center justify-center text-center"
                                                                >
                                                                    {isRejecting ? 'กำลังส่ง Email...' : 'ปฏิเสธการชำระเงิน'}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleStatusChange(viewModal.order.id, 'Payment Success')}
                                                                    disabled={isRejecting || viewModal.order.OrderStatus !== 'Payment In Progress'}
                                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold py-2.5 px-1 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center"
                                                                >
                                                                    {viewModal.order.OrderStatus === 'Payment Success' ? 'อนุมัติแล้ว' : 'อนุมัติชำระเงิน'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <Clock size={28} className="text-orange-500" />
                                                        </div>
                                                        <p className="font-bold text-orange-700 mb-1">ยังไม่มีการแนบสลิป</p>
                                                        <p className="text-xs text-orange-600/70">กำลังรอให้ลูกค้าแนบหลักฐานการโอนเงินในระบบ</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- คอลัมน์ขวา: รายละเอียดอื่นๆ --- */}
                                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                            <h3 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">ข้อมูลผู้สั่งซื้อ</h3>
                                            <p className="text-sm text-gray-700 mb-1">
                                                <span className="font-semibold">ชื่อ:</span> {viewModal.order.CustomerName || '-'}
                                            </p>
                                            <p className="text-sm text-gray-700 mb-1">
                                                <span className="font-semibold">โทร:</span> {viewModal.order.CustomerPhone || '-'}
                                            </p>
                                            {viewModal.order.CustomerEmail && (
                                                <p className="text-sm text-gray-700 mb-1">
                                                    <span className="font-semibold">อีเมล:</span> {viewModal.order.CustomerEmail}
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                            <h3 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">ที่อยู่สำหรับจัดส่ง</h3>
                                            <p className="text-sm text-gray-700 leading-relaxed">
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

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Package size={16} /> สินค้าในคำสั่งซื้อ ({viewModal.order.TotalQuantity || 0} ชิ้น)
                                        </h3>
                                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold w-12">รูป</th>
                                                        <th className="px-4 py-3 font-semibold">ชื่อสินค้า</th>
                                                        <th className="px-4 py-3 font-semibold text-center">ราคา/ชิ้น</th>
                                                        <th className="px-4 py-3 font-semibold text-center">จำนวน</th>
                                                        <th className="px-4 py-3 font-semibold text-right">รวม (฿)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(viewModal.order.Items || []).map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3">
                                                                <img
                                                                    src={Array.isArray(item.ProductPic) ? item.ProductPic[0] : (item.ProductPic || 'https://placehold.co/100')}
                                                                    alt="product"
                                                                    className="w-10 h-10 rounded border border-gray-200 object-cover"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-800 line-clamp-2">{item.ProductName || 'ไม่ทราบชื่อสินค้า'}</div>
                                                                <div className="text-[10px] text-gray-400 mt-1">ID: {item.ProductID}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-gray-600">{(item.Price || 0).toLocaleString('th-TH', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg border border-blue-100">{item.Quantity || 1}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                                {((item.Price || 0) * (item.Quantity || 1)).toLocaleString('th-TH', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
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