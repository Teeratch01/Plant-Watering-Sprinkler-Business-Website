import React, { useState,useEffect  } from 'react';
import Navbar from '../components/Navbar';
import { Search, ShoppingCart, ClipboardList, Package, Truck, CreditCard, QrCode, Building, PackageCheck } from 'lucide-react';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../FirebaseConfig';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import OrderDetailCard from '../components/OrderDetailCard';


function OrderSearchPage() {

    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState(null);
    const [searched, setSearched] = useState(false);

    const fetchOrderData = async (orderNumber) => {
        if (!orderNumber) return;

        setLoading(true);
        setOrder(null);
        setPayment(null);
        setSearched(true);
        setSearchTerm(orderNumber); // update ช่อง input ให้โชว์เลขด้วย

        try {
            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("OrderNumber", "==", Number(orderNumber)));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const orderDoc = querySnapshot.docs[0];
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                setOrder(orderData);

                const paymentsRef = collection(db, "payments");
                const qPayment = query(paymentsRef, where("OrderID", "==", orderDoc.id));
                const paymentSnapshot = await getDocs(qPayment);

                if (!paymentSnapshot.empty) {
                    setPayment(paymentSnapshot.docs[0].data());
                }
            } else {
                toast.error("ไม่พบหมายเลขคำสั่งซื้อที่ค้นหา");
            }
        } catch (error) {
            console.error("Error searching order: ", error);
            toast.error("เกิดข้อผิดพลาดในการค้นหาคำสั่งซื้อ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (location.state?.orderNumber) {
            fetchOrderData(location.state.orderNumber);
        }
    }, [location.state]);

    const handleSearch = async (e) => {

        e.preventDefault();
        fetchOrderData(searchTerm);
    }

    // const getStatusLevel = (status) => {
    //     switch (status) {
    //         case 'Payment Success': return 0; // ขั้นแรก (Payment)
    //         case 'Prepare Order': return 1;
    //         case 'Packaging Complete': return 2;
    //         case 'In transit': return 3;
    //         case 'Deliver Complete': return 4;
    //         default: return 0;
    //     }
    // }

    // const currentLevel = order ? getStatusLevel(order.OrderStatus) : 0;

    // const steps = [
    //     { label: 'Payment', icon: <ShoppingCart size={24} /> },
    //     { label: 'Prepare Order', icon: <ClipboardList size={24} /> },
    //     { label: 'Packaging Completed', icon: <Package size={24} /> },
    //     { label: 'In Transit', icon: <Truck size={24} /> },
    //     { label: 'Deliver Complete', icon: <PackageCheck size={24} /> },
    // ]

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-12 max-w-4xl">

                {/* --- Search Section --- */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">ตรวจสอบสถานะคำสั่งซื้อ</h1>
                    <form onSubmit={handleSearch} className="flex max-w-lg mx-auto relative">
                        <input
                            type="text"
                            placeholder="กรอกหมายเลขคำสั่งซื้อ (Order Number) เช่น 173883..."
                            className="w-full px-6 py-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none shadow-sm pr-14 text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 bg-black text-white p-3 rounded-full hover:bg-gray-800 transition"
                        >
                            <Search size={20} />
                        </button>
                    </form>
                </div>

                {/* --- Result Section --- */}
                {loading && <div className="text-center py-10">กำลังค้นหา...</div>}

                {!loading && searched && !order && (
                    <div className="text-center py-10 text-gray-500">ไม่พบข้อมูลคำสั่งซื้อ</div>
                )}

                {!loading && order && (
                    <OrderDetailCard order={order} payment={payment} />
                )}

            </div>
        </div>
    );

}

export default OrderSearchPage;



