import React, { useState, useEffect, use } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { auth, db } from '../FirebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Package, ChevronRight, Clock, CheckCircle, Truck, XCircle, Calendar,PackageCheck } from 'lucide-react';

function OrderHistoryPage() {
    const[orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if(!currentUser) {
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Payment Success': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Prepare Order': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'In transit': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Packaging Complete': return 'bg-sky-100 text-sky-700 border-sky-200';
            case 'Deliver Complete': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    // ฟังก์ชันเลือกไอคอนสถานะ
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Payment Success': return <CheckCircle size={14} />;
            case 'In transit': return <Truck size={14} />;
            case 'Packaging Complete': return <Package size={14} />;
            case 'Deliver Complete': return <PackageCheck size={14} />;
            case 'Cancelled': return <XCircle size={14} />;
            default: return <Clock size={14} />;
        }
    };

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

                {/* Orders List */}
                <div className="space-y-6">
                    {orders.length === 0 ? (
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
                        orders.map((order) => (
                            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition duration-200">
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    
                                    {/* 1. รูปสินค้า (เอารูปแรกมาโชว์) */}
                                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                        <img 
                                            src={order.Items && order.Items[0]?.ProductPic ? (Array.isArray(order.Items[0].ProductPic) ? order.Items[0].ProductPic[0] : order.Items[0].ProductPic) : "https://placehold.co/150"} 
                                            alt="Product" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* 2. รายละเอียดตรงกลาง */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-gray-900">
                                                Order #{order.OrderNumber}
                                            </h3>
                                            
                                            {/* Status Badge */}
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${getStatusColor(order.OrderStatus)}`}>
                                                {getStatusIcon(order.OrderStatus)}
                                                {order.OrderStatus}
                                            </span>
                                        </div>

                                        {/* ชื่อสินค้า (ถ้ามีหลายชิ้นให้บอกว่า + X more) */}
                                        <p className="text-gray-700 font-medium line-clamp-1">
                                            {order.Items && order.Items[0]?.ProductName}
                                            {order.Items && order.Items.length > 1 && (
                                                <span className="text-gray-400 font-normal ml-2">
                                                    (+ อีก {order.Items.length - 1} รายการ)
                                                </span>
                                            )}
                                        </p>

                                        {/* วันที่และราคา */}
                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {order.OrderDate?.toDate().toLocaleDateString('th-TH', {
                                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                                })}
                                            </div>
                                            <div className="font-bold text-gray-900 text-base">
                                                ฿ {Number(order.TotalPrice).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. ปุ่มกดดูรายละเอียด (ขวาสุด) */}
                                    <button 
                                        onClick={() => navigate('/order-status', { state: { orderNumber: order.OrderNumber } })} // ถ้าคุณอยากให้ลิ้งค์ไปหน้า Detail ให้แก้ตรงนี้
                                        className="w-full md:w-auto px-6 py-3 bg-[#F3F4F6] hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition flex items-center justify-center gap-2"
                                    >
                                        Order Details
                                        <ChevronRight size={18} />
                                    </button>

                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

export default OrderHistoryPage;