import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../components/CartContext';
import { Trash2, Minus, Plus, ChevronLeft, CreditCard ,ShoppingCart} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { db } from '../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

function CartPage() {
    const { cartItems, updateQuantity, removeFromCart, getCartTotal, updateCartItem } = useCart();
    const navigate = useNavigate();

    const [crossSellItems, setCrossSellItems] = useState([]);

    useEffect(() => {
        const fetchCartCrossSells = async () => {
            if (cartItems.length === 0) {
                setCrossSellItems([]);
                return;
            }

            // 1. รวบรวม ID สินค้า Cross Sell ทั้งหมดจากทุกไอเทมในตะกร้า
            let rawCsIds = [];
            cartItems.forEach(item => {
                if (Array.isArray(item.CrossSellProducts)) {
                    rawCsIds.push(...item.CrossSellProducts);
                }
            });

            // 2. ตัด ID ที่ซ้ำกันออก
            let uniqueCsIds = [...new Set(rawCsIds)];

            // 3. ตัด ID ของสินค้าที่มีอยู่ในตะกร้าแล้วออก (จะได้ไม่แนะนำของที่ซื้อไปแล้ว)
            const cartItemIds = cartItems.map(item => item.id);
            uniqueCsIds = uniqueCsIds.filter(id => !cartItemIds.includes(id));

            // 4. ดึงข้อมูลจาก Firebase
            if (uniqueCsIds.length > 0) {
                try {
                    const promises = uniqueCsIds.map(id => getDoc(doc(db, "products", id)));
                    const docs = await Promise.all(promises);
                    const items = docs
                        .filter(d => d.exists())
                        .map(d => ({ id: d.id, ...d.data() }))
                        .filter(item => item.ProductStatus === 'Active' && item.Stock > 0);
                    
                    setCrossSellItems(items);
                } catch (error) {
                    console.error("Error fetching cart cross-sells:", error);
                }
            } else {
                setCrossSellItems([]);
            }
        };

        fetchCartCrossSells();
    }, [cartItems]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-12 max-w-6xl">

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        ตะกร้าสินค้าของคุณ
                    </h1>
                    <p className="text-gray-500 mt-1">
                        มีสินค้า {cartItems.length} รายการในตะกร้า
                    </p>
                </div>

                {cartItems.length > 0 ? (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">

                        {/* --- Left Column: Cart Items List --- */}

                        <div className="flex-1 flex flex-col gap-6"> {/*  สร้างกล่องครอบให้ตารางและ Cross-sell อยู่ฝั่งซ้ายด้วยกัน */}

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header ของตาราง (ซ่อนในมือถือ) */}
                                <div className="hidden md:flex bg-gray-50 border-b border-gray-200 px-6 py-4 text-sm font-semibold text-gray-600">
                                    <div className="flex-1">สินค้า</div>
                                    <div className="w-32 text-center">ราคา</div>
                                    <div className="w-40 text-center">จำนวน</div>
                                    <div className="w-32 text-center">รวม</div>
                                    <div className="w-10"></div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {/* ... โค้ด loop cartItems.map() เดิมของคุณอยู่ที่นี่ ... */}
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-gray-50 transition-colors">
                                           {/* ... โค้ดแสดงสินค้าย่อยๆ ของคุณ ... */}
                                            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                                                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    <img
                                                        src={Array.isArray(item.ProductPic) ? item.ProductPic[0] : (item.ProductPic || "https://placehold.co/150")}
                                                        alt={item.ProductName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{item.ProductName}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">รหัส: {item.id.substring(0, 6).toUpperCase()}</p>
                                                </div>
                                            </div>

                                            {/* Price (Mobile: Hidden label, Desktop: shown) */}
                                            <div className="w-full md:w-32 flex justify-between md:justify-center items-center">
                                                <span className="md:hidden text-gray-500 text-sm">ราคาต่อชิ้น:</span>
                                                <span className="font-medium text-gray-700">฿{Number(item.Price).toLocaleString('th-TH', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}</span>
                                            </div>

                                            {/* Quantity Control (Clean Style) */}
                                            <div className="w-full md:w-40 flex justify-between md:justify-center items-center">
                                                <span className="md:hidden text-gray-500 text-sm">จำนวน:</span>
                                                <div className="flex items-center border border-gray-300 rounded-lg bg-white h-10 shadow-sm">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 'minus')}
                                                        className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-red-500 rounded-l-lg transition"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <div className="w-12 h-full flex items-center justify-center font-bold text-gray-800 bg-gray-50 border-x border-gray-200">
                                                        {item.quantity}
                                                    </div>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 'plus')}
                                                        className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-green-600 rounded-r-lg transition"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Total Price */}
                                            <div className="w-full md:w-32 flex justify-between md:justify-center items-center">
                                                <span className="md:hidden text-gray-500 text-sm">รวม:</span>
                                                <span className="text-lg font-bold text-blue-600">
                                                    ฿{Number(item.Price * item.quantity).toLocaleString('th-TH', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>

                                            {/* Remove Button */}
                                            <div className="w-full md:w-10 flex justify-end md:justify-center">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                                                    title="ลบสินค้า"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/*  Section: Cross-Sell แนะนำสำหรับตะกร้าของคุณ (ย้ายมาต่อท้ายตาราง) */}
                            {crossSellItems.length > 0 && cartItems.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
                                    <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                                        <Plus className="text-green-500" /> รับเพิ่มอีกสักชิ้นไหม? (สินค้าแนะนำจากรายการของคุณ)
                                    </h2>
                                    <p className="text-sm text-gray-500 mb-6">ลูกค้าที่ซื้อสินค้าเหล่านี้ มักจะซื้ออุปกรณ์เพิ่มเติมด้านล่างนี้ด้วย</p>
                                    
                                    <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 snap-x">
                                        {crossSellItems.map(item => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => {
                                                    window.scrollTo(0, 0);
                                                    navigate(`/products/${item.id}`);
                                                }}
                                                className="snap-start flex-shrink-0 w-44 bg-gray-50 rounded-xl p-3 border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-300 transition group flex flex-col"
                                            >
                                                <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-white">
                                                    <img 
                                                        src={Array.isArray(item.ProductPic) ? item.ProductPic[0] : (item.ProductPic || 'https://placehold.co/150')} 
                                                        alt={item.ProductName} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                    />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition">{item.ProductName}</h3>
                                                
                                                <div className="mt-auto flex flex-col gap-2">
                                                    <div className="text-blue-600 font-bold">
                                                        ฿{Number(item.Price).toLocaleString()}
                                                    </div>
                                                    
                                                    {/*  ปุ่มหยิบลงตะกร้าแบบด่วน (Quick Add) */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // สำคัญ! ป้องกันไม่ให้คลิกปุ่มแล้วทะลุไปหน้า Detail
                                                            updateCartItem(item, 1); // แอดเข้าตะกร้า 1 ชิ้นทันที
                                                            toast.success(`เพิ่ม "${item.ProductName}" ลงในตะกร้าแล้ว!`);
                                                        }}
                                                        className="w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 py-1.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1 shadow-sm"
                                                    >
                                                        <ShoppingCart size={14} /> เพิ่มลงตะกร้า
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- Right Column: Order Summary --- */}
                        <div className="w-full lg:w-96 bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-24">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">สรุปคำสั่งซื้อ</h2>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>ยอดรวมสินค้า</span>
                                    <span>฿{getCartTotal().toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>ค่าจัดส่ง</span>
                                    <span className="text-green-600 font-medium">ฟรี</span>
                                </div>
                                {/* เส้นคั่นบางๆ */}
                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-800">ยอดสุทธิ</span>
                                        <span className="text-2xl font-bold text-blue-600">฿{getCartTotal().toLocaleString('th-TH', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 text-right mt-1">(ราคารวมภาษีมูลค่าเพิ่มแล้ว)</p>
                                </div>
                            </div>

                            {/* Proceed Button*/}
                            <button
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95"
                                onClick={() => navigate('/checkout')}
                            >
                                <CreditCard size={20} />
                                ดำเนินการชำระเงิน
                            </button>

                            <button
                                onClick={() => navigate('/products')}
                                className="w-full mt-4 text-gray-500 hover:text-blue-600 font-medium text-sm flex items-center justify-center gap-1 transition"
                            >
                                <ChevronLeft size={16} /> เลือกซื้อสินค้าต่อ
                            </button>
                        </div>

                    </div>
                ) : (
                    // --- Empty State ---
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400">
                            <CreditCard size={48} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">ตะกร้าสินค้าว่างเปล่า</h2>
                        <p className="text-gray-500 mb-8">คุณยังไม่มีสินค้าในตะกร้า เลือกดูสินค้าคุณภาพเลย!</p>
                        <button
                            onClick={() => navigate('/products')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-bold shadow-lg transition transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            เลือกซื้อสินค้า
                        </button>
                    </div>
                )}

              
            </div>
        </div>
    );
}

export default CartPage;