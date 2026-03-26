import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../FirebaseConfig';
import { doc, getDoc } from "firebase/firestore";
import Navbar from '../components/Navbar';
import { Minus, Plus, ShoppingCart, CreditCard, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import { useCart } from '../components/CartContext';
import { toast } from 'react-toastify';

function ProductsDetailPage() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [mainImage, setMainImage] = useState("");
    const { addToCart } = useCart();

    const { updateCartItem, cartItems } = useCart();


    useEffect(() => {
        const fetchproduct = async () => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProduct({ id: docSnap.id, ...data });

                    if (Array.isArray(data.ProductPic)) {
                        setMainImage(data.ProductPic[0]);
                    } else {
                        setMainImage(data.ProductPic);
                    }
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchproduct();
    }, [id]);

    useEffect(() => {
        if (product) {
            const existingItem = cartItems.find(item => item.id === product.id);
            // ถ้ามีของในตะกร้า ให้โชว์เลขนั้นเลย ถ้าไม่มีให้เริ่มที่ 1
            setQuantity(existingItem ? existingItem.quantity : 1);
        }
    }, [product, cartItems]);

    const totalStock = Number(product?.Stock || 0);

    // 3. ปรับ Logic การกด +/- (เช็คกับ Stock รวม)
    const handleQuantityChange = (type) => {
        if (type === 'minus' && quantity > 1) {
            setQuantity(quantity - 1);
        }
        if (type === 'plus') {
            if (quantity < totalStock) {
                setQuantity(quantity + 1);
            } else {
                toast.info(`สินค้ามีทั้งหมดเพียง ${totalStock} ชิ้น`);
            }
        }
    }



    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found</div>;

    const renderProductDetail = (text) => {
        if (!text) return <p className="text-gray-500">ไม่มีรายละเอียดสินค้า</p>;

        // 1. แยกข้อความด้วยการขึ้นบรรทัดใหม่
        const lines = text.split('\n').filter(line => line.trim() !== "");

        // คำที่เราอยากให้เป็น "หัวข้อใหญ่" (ตัวหนา สีน้ำเงิน)
        const keywords = ["คุณสมบัติ", "วิธีใช้งาน", "คำแนะนำ", "ข้อควรระวัง", "รายละเอียดสินค้า", "ข้อมูลทางเทคนิค", "ข้อมูลจำเพาะ", "ขนาดมิติ"];

        return lines.map((line, index) => {
            // เช็คว่าบรรทัดนี้มี Keyword หัวข้อหรือไม่
            const isHeader = keywords.some(keyword => line.includes(keyword) && line.length < 50);

            if (isHeader) {
                // ถ้าเป็นหัวข้อ: ให้ตัวหนา + สีเข้ม + เว้นระยะห่าง
                return (
                    <h3 key={index} className="text-xl font-bold text-blue-900 mt-6 mb-2 border-l-4 border-blue-500 pl-3">
                        {line}
                    </h3>
                );
            } else {
                // ถ้าเป็นเนื้อหาทั่วไป: ให้ใส่จุด Bullet ข้างหน้า + เว้นย่อหน้า
                return (
                    <li key={index} className="text-gray-700 ml-4 list-none mb-1 flex items-start text-lg">
                        <span className="text-blue-400 mr-2 mt-1.5 text-xs">●</span>
                        <span>{line}</span>
                    </li>
                );
            }
        });
    };

    const getYouTubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleAddToCart = () => {
        if (product) {
            updateCartItem(product, quantity);

            // เช็คเพื่อเปลี่ยนข้อความแจ้งเตือนให้เหมาะสม
            const existingItem = cartItems.find(item => item.id === product.id);
            if (existingItem) {
                toast.success(`อัปเดตจำนวนเป็น ${quantity} ชิ้นเรียบร้อย!`);
            } else {
                toast.success(`เพิ่ม "${product.ProductName}" (${quantity} ชิ้น) ลงในตะกร้าแล้ว!`);
            }
        }
    }

    const handleBuyNow = () => {
        if (product) {
            updateCartItem(product, quantity);
            navigate('/cart');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />

            {/* Breadcrumb (แถบนำทางด้านบน เหมือนในรูป) */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => navigate('/')}>หน้าแรก</span>
                    <ChevronRight size={14} />
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => navigate('/products')}>สินค้าทั้งหมด</span>
                    <ChevronRight size={14} />
                    <span className="text-blue-600 font-medium truncate">{product.ProductName}</span>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-10">

                        {/* --- Left: Image Gallery --- */}
                        <div className="w-full md:w-2/5 flex flex-col gap-4">
                            {/* รูปหลัก */}
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative">
                                <img
                                    src={mainImage || "https://placehold.co/400x400"}
                                    alt={product.ProductName}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {(() => {
                                    // สร้างตัวแปร images เพื่อรวมรูปให้เป็น Array เสมอ
                                    const images = Array.isArray(product.ProductPic)
                                        ? product.ProductPic
                                        : [product.ProductPic];

                                    return images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setMainImage(img)}
                                            className={`w-20 h-20 rounded-md border-2 overflow-hidden flex-shrink-0 transition-all ${mainImage === img ? 'border-blue-600 opacity-100' : 'border-transparent opacity-70 hover:opacity-100'
                                                }`}
                                        >
                                            <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* --- Right: Product Info --- */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.ProductName}</h1>
                            <p className="text-gray-500 text-sm mb-6">รหัสสินค้า: {product.id.substring(0, 8).toUpperCase()}</p>

                            {/* Price */}
                            <div className="mb-6">
                                {/* แสดงราคาแบบในรูป 1 */}
                                {/* <p className="text-gray-400 text-sm line-through">฿ {Number(product.Price * 1.2).toLocaleString()}</p> */}
                                <p className="text-4xl font-bold text-blue-600">฿ {Number(product.Price).toLocaleString('th-TH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}</p>
                                {/* <p className="text-sm text-gray-500 mt-1">(ราคายังไม่รวม VAT)</p> */}
                            </div>

                            <hr className="border-gray-200 mb-6" />

                            {/* Quantity Selector */}
                            <div className="flex items-center gap-4 mb-8">
                                <span className="text-gray-700 font-medium">จำนวน (ชิ้น):</span>

                                {/* 1. กำหนดความสูง h-10 ที่กล่องแม่ (Parent) */}
                                <div className="flex items-center border border-gray-300 rounded-lg bg-white h-11">

                                    {/* 2. ปุ่มลบ: เอา p-3 ออก -> ใส่ w-10 h-full flex items-center justify-center แทน */}
                                    <button
                                        onClick={() => handleQuantityChange('minus')}
                                        className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-lg"
                                        disabled={quantity <= 1}
                                    >
                                        <Minus size={16} />
                                    </button>

                                    {/* 3. ช่องกรอก: เอา py-2 ออก -> ใส่ h-full text-center focus:outline-none แทน */}
                                    <div className="w-16 h-full border-x border-gray-300 flex items-center justify-center text-gray-700 font-bold bg-white cursor-default">
                                        {quantity}
                                    </div>

                                    {/* 4. ปุ่มบวก: ใช้ Class เดียวกับปุ่มลบ */}
                                    <button
                                        onClick={() => handleQuantityChange('plus')}
                                        disabled={quantity >= totalStock}
                                        className={`w-10 h-full flex items-center justify-center rounded-r-lg transition 
                    ${quantity >= totalStock
                                                ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                                : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <Plus size={16} />
                                    </button>

                                </div>

                                <span className="text-sm text-gray-500 ml-4">
                                    (มีสินค้า {totalStock} ชิ้น)
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                {/* ปุ่มซื้อเลย (ใช้สีเขียวตามรูปต้นฉบับ หรือสีฟ้าตามธีมก็ได้ - อันนี้ใช้เขียวเพื่อให้เด่นเหมือนรูป) */}
                                <button
                                    onClick={handleBuyNow}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5">
                                    <CreditCard size={24} />
                                    ซื้อเลย
                                </button>

                                {/* ปุ่มหยิบลงตะกร้า (ใช้ Theme ขอบสีตามรูป) */}
                                <button
                                    onClick={handleAddToCart}
                                    className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition">
                                    <ShoppingCart size={24} />
                                    {/* เปลี่ยนข้อความปุ่มถ้ามีของอยู่แล้ว */}
                                    {cartItems.find(item => item.id === product?.id) ? 'อัปเดตตะกร้า' : 'หยิบลงตะกร้า'}
                                </button>
                            </div>



                        </div>
                    </div>

                    {/* Product Detail Description Section */}
                    <div className="mt-12 border-t border-gray-200 pt-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">รายละเอียดสินค้า</h3>
                        <div className="prose max-w-none text-gray-600 bg-gray-50 p-6 rounded-xl">
                            {/* แสดงรายละเอียดสินค้า ถ้ามี \n ให้ขึ้นบรรทัดใหม่ */}
                            {renderProductDetail(product.ProductDetail)}
                        </div>


                        {product.YoutubeURL && getYouTubeID(product.YoutubeURL) && (
                            <div className="mt-12">
                                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <span className="text-red-600">▶</span> วิดีโอแนะนำสินค้า
                                </h3>

                                <div className="w-full max-w-4xl mx-auto">
                                    <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-black">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            src={`https://www.youtube.com/embed/${getYouTubeID(product.YoutubeURL)}`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );

}

export default ProductsDetailPage;