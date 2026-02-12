import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Check, ShoppingBag, Home, Package } from 'lucide-react';

function OrderSuccessPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const { orderNumber } = location.state || {};

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-16 flex flex-col items-center">
                
                {/* Header Style เดียวกับหน้า Checkout */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 decoration-4 decoration-gray-300 underline underline-offset-8">
                        ขอบคุณสำหรับการสั่งซื้อ
                    </h1>
                </div>

                {/* Content Card */}
                <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 max-w-lg w-full text-center animate-fade-in-up">
                    
                    {/* Success Icon */}
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <Check size={48} className="text-green-600" strokeWidth={3} />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-2">สั่งซื้อสำเร็จ!</h2>
                    <p className="text-gray-500 mb-8">
                        เราได้รับข้อมูลการสั่งซื้อของคุณเรียบร้อยแล้ว <br/>
                        สินค้าจะถูกจัดส่งภายใน 3-5 วันทำการ
                    </p>

                    {/* Order Number Box */}
                    {orderNumber && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Order Number</p>
                            <p className="text-3xl font-bold text-gray-800 tracking-wider">
                                #{orderNumber}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => navigate('/products')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <ShoppingBag size={20} />
                            เลือกซื้อสินค้าต่อ
                        </button>

                        <button 
                            onClick={() => navigate('/')}
                            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        >
                            <Home size={20} />
                            กลับหน้าหลัก
                        </button>
                    </div>

                </div>

                {/* Additional Info (Optional)
                <div className="mt-8 text-center text-sm text-gray-400 max-w-md">
                    <p>หากมีข้อสงสัยเกี่ยวกับคำสั่งซื้อ กรุณาติดต่อเราที่ 0xx-xxx-xxxx หรือทาง Line Official</p>
                </div> */}

            </div>
        </div>
    );
}

export default OrderSuccessPage;