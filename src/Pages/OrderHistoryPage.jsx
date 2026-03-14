import React, { useState, useEffect, use } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { auth, db } from '../FirebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, Calendar, PackageCheck, AlertCircle, Upload } from 'lucide-react';

const CountdownTimer = ({ orderDate, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!orderDate) return;
        
        const dateObj = typeof orderDate.toDate === 'function' ? orderDate.toDate() : new Date(orderDate);
        const targetTime = dateObj.getTime() + (24 * 60 * 60 * 1000); // 24 ชม.

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = targetTime - now;

            if (difference <= 0) {
                setTimeLeft('หมดเวลาชำระเงิน');
                if (!expired) {
                    setExpired(true);
                    if (onExpire) onExpire();
                }
            } else {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);
                setTimeLeft(`เหลือเวลา ${hours} ชม. ${minutes} น.`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [orderDate, expired, onExpire]);

    return (
        <span className={`text-sm font-bold ml-2 ${expired ? 'text-red-500' : 'text-orange-500'}`}>
            {timeLeft}
        </span>
    );
};

const OrderCardItem = ({ order, getStatusColor, getStatusIcon, getDisplayStatus }) => {
    const navigate = useNavigate();
    const [isExpired, setIsExpired] = useState(false);
    
    const needsSlip = order.OrderStatus === 'Payment In Progress' && !order.PaymentSlipUrl;

    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border transition duration-200 ${needsSlip && !isExpired ? 'border-orange-300 hover:shadow-orange-100 hover:shadow-lg' : 'border-gray-200 hover:shadow-md'}`}>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

                {/* รูปสินค้า */}
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img
                        src={order.Items && order.Items[0]?.ProductPic ? (Array.isArray(order.Items[0].ProductPic) ? order.Items[0].ProductPic[0] : order.Items[0].ProductPic) : "https://placehold.co/150"}
                        alt="Product"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* รายละเอียด */}
                <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900">
                            Order #{order.OrderNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${getStatusColor(order)}`}>
                            {getStatusIcon(order)}
                            {getDisplayStatus(order)}
                        </span>
                        
                        {/* แสดงเวลานับถอยหลังข้างๆ สถานะ */}
                        {needsSlip && (
                            <CountdownTimer orderDate={order.OrderDate} onExpire={() => setIsExpired(true)} />
                        )}
                    </div>

                    <p className="text-gray-700 font-medium line-clamp-1">
                        {order.Items && order.Items[0]?.ProductName}
                        {order.Items && order.Items.length > 1 && (
                            <span className="text-gray-400 font-normal ml-2">
                                (+ อีก {order.Items.length - 1} รายการ)
                            </span>
                        )}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {order.OrderDate?.toDate().toLocaleDateString('th-TH', {
                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                        </div>
                        <div className="font-bold text-gray-900 text-base">
                            ฿ {Number(order.TotalPrice).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* ปุ่มกด */}
                <button
                    disabled={needsSlip && isExpired}
                    onClick={() => {
                        if (needsSlip && !isExpired) {
                            navigate('/order-success', {
                                state: {
                                    orderNumber: order.OrderNumber,
                                    orderId: order.id,
                                    paymentMethod: 'qr',
                                    finalPrice: order.TotalPrice
                                }
                            });
                        } else {
                            navigate('/order-status', { state: { orderNumber: order.OrderNumber } });
                        }
                    }}
                    className={`w-full md:w-auto px-6 py-3 font-semibold rounded-lg transition flex items-center justify-center gap-2 
                        ${needsSlip
                            ? (isExpired 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md animate-pulse')
                            : 'bg-[#F3F4F6] hover:bg-gray-200 text-gray-700'}`}
                >
                    {needsSlip ? (
                        isExpired ? <>หมดเวลาอัปโหลด <XCircle size={18} /></> : <>อัปโหลดสลิปโอนเงิน <Upload size={18} /></>
                    ) : (
                        <>Order Details <ChevronRight size={18} /></>
                    )}
                </button>

            </div>
        </div>
    );
}

function OrderHistoryPage() {
    const [orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('Current'); // 'all', 'pending', 'completed', 'cancelled'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                navigate('/login');
                return;

            }
            setUser(currentUser);
            fetchOrders(currentUser.uid);
        })

        return () => unsubscribe();

    }
        , [navigate]);

    const fetchOrders = async (userId) => {
        try {
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, where('UserID', '==', userId));
            const querySnapshot = await getDocs(q);

            const ordersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            ordersData.sort((a, b) => b.OrderDate.seconds - a.OrderDate.seconds);
            setOrders(ordersData);

        } catch (error) {
            console.error("Error fetching orders: ", error);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }


    // . 1. ฟังก์ชันเลือกข้อความแสดงสถานะ (เช็คเรื่องสลิปที่นี่)
    const getDisplayStatus = (order) => {
        if (order.OrderStatus === 'Payment In Progress') {
            return order.PaymentSlipUrl ? 'Pending payment approve' : 'Pending payment confirmation';
        }
        return order.OrderStatus;
    };

    // . 2. ฟังก์ชันเลือกสีป้ายสถานะ (เปลี่ยนมารับค่า order ทั้งก้อน)
    const getStatusColor = (order) => {
        if (order.OrderStatus === 'Payment In Progress') {
            return order.PaymentSlipUrl
                ? 'bg-blue-100 text-blue-700 border-blue-200'    // อัปโหลดแล้ว (สีฟ้า)
                : 'bg-orange-100 text-orange-700 border-orange-200'; // ยังไม่อัปโหลด (สีส้ม)
        }

        switch (order.OrderStatus) {
            case 'Payment Success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Prepare Order': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'In transit': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Packaging Complete': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'Deliver Complete': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // . 3. ฟังก์ชันเลือกไอคอน
    const getStatusIcon = (order) => {
        if (order.OrderStatus === 'Payment In Progress') {
            return order.PaymentSlipUrl ? <Clock size={14} /> : <AlertCircle size={14} />;
        }

        switch (order.OrderStatus) {
            case 'Payment Success': return <CheckCircle size={14} />;
            case 'In transit': return <Truck size={14} />;
            case 'Packaging Complete': return <Package size={14} />;
            case 'Deliver Complete': return <PackageCheck size={14} />;
            case 'Cancelled': return <XCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

    const currentOrders = orders.filter(o => !['Deliver Complete', 'Cancelled'].includes(o.OrderStatus));
    const completedOrders = orders.filter(o => o.OrderStatus === 'Deliver Complete');
    const cancelledOrders = orders.filter(o => o.OrderStatus === 'Cancelled');

    let displayedOrders = [];
    if (activeTab === 'Current') displayedOrders = currentOrders;
    if (activeTab === 'Completed') displayedOrders = completedOrders;
    if (activeTab === 'Cancelled') displayedOrders = cancelledOrders;

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading your orders...</div>;
    }


  return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-12 max-w-5xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">ประวัติการสั่งซื้อ</h1>
                    <p className="text-gray-500">รายการคำสั่งซื้อทั้งหมดของคุณ</p>
                </div>

                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
                    <button
                        onClick={() => setActiveTab('Current')}
                        className={`flex-1 py-4 text-center font-bold text-sm md:text-base border-b-2 transition duration-200 
                            ${activeTab === 'Current' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        ที่ต้องจัดส่ง ({currentOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('Completed')}
                        className={`flex-1 py-4 text-center font-bold text-sm md:text-base border-b-2 transition duration-200 
                            ${activeTab === 'Completed' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        สำเร็จแล้ว ({completedOrders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('Cancelled')}
                        className={`flex-1 py-4 text-center font-bold text-sm md:text-base border-b-2 transition duration-200 
                            ${activeTab === 'Cancelled' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        ยกเลิกแล้ว ({cancelledOrders.length})
                    </button>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {displayedOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <Package size={64} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">คุณยังไม่มีประวัติการสั่งซื้อ</p>
                            <button
                                onClick={() => navigate('/products')}
                                className="mt-4 text-blue-600 hover:underline font-medium"
                            >
                                เลือกซื้อสินค้าเลย
                            </button>
                        </div>
                    ) : (
                        displayedOrders.map((order) => (
                            <OrderCardItem 
                                key={order.id} 
                                order={order} 
                                getStatusColor={getStatusColor}
                                getStatusIcon={getStatusIcon}
                                getDisplayStatus={getDisplayStatus}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrderHistoryPage;