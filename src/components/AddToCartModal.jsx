import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from './CartContext';
import { toast } from 'react-toastify';

const AddToCartModal = ({ product, isOpen, onClose }) => {

    const [quantity, setQuantity] = useState(1);
    const { addToCart, cartItems, updateCartItem } = useCart();



    const existingItem = cartItems.find(item => item.id === product?.id);
    const cartQty = existingItem ? existingItem.quantity : 0;

    const totalStock = Number(product?.Stock || 0);
    const availableStock = totalStock - cartQty;

    useEffect(() => {
        if (isOpen) {
            setQuantity(cartQty > 0 ? cartQty : 1);
        }
    }, [isOpen, product, cartQty]);

    if (!isOpen || !product) return null;

    const handleQuantityChange = (type) => {
        if (type === 'minus') {
            if (quantity > 1) {
                setQuantity(quantity - 1);
            }
        }
        if (type === 'plus') {
            // เช็คกับ Stock รวม (เพราะตอนนี้เลข quantity คือยอดรวมแล้ว)
            if (quantity < totalStock) {
                setQuantity(quantity + 1);
            } else {
                toast.info(`สินค้ามีทั้งหมดเพียง ${totalStock} ชิ้น`);
            }
        }
    }

    const handleConfirm = () => {
        // ใช้ฟังก์ชันใหม่: updateCartItem (แทน addToCart)
        updateCartItem(product, quantity);

        if (cartQty > 0) {
            toast.success(`อัปเดต "${product.ProductName}" เป็น ${quantity} ชิ้นเรียบร้อย!`);
        } else {
            toast.success(`เพิ่ม "${product.ProductName}" (${quantity} ชิ้น) ลงตะกร้าแล้ว!`);
        }

        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700">
                        {cartQty > 0 ? 'แก้ไขจำนวนสินค้า' : 'หยิบลงตะกร้า'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200 mb-4">
                        <img
                            src={Array.isArray(product.ProductPic) ? product.ProductPic[0] : (product.ProductPic || "https://placehold.co/400x400")}
                            alt={product.ProductName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 text-center mb-1">{product.ProductName}</h4>
                    <p className="text-red-600 font-bold text-xl mb-4">฿ {Number(product.Price).toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}</p>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4 mb-2">
                        <button
                            onClick={() => handleQuantityChange('minus')}
                            className={`p-2 rounded-full border ${quantity <= 1 ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                            disabled={quantity <= 1}
                        >
                            <Minus size={20} />
                        </button>

                        <span className="text-2xl font-bold w-12 text-center text-gray-800">
                            {quantity}
                        </span>

                        <button
                            onClick={() => handleQuantityChange('plus')}
                            className={`p-2 rounded-full border ${quantity >= totalStock ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                            disabled={quantity >= totalStock}
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-6">(มีสินค้าในสต็อก {totalStock} ชิ้น)</p>

                    {/* Buttons */}
                    <div className="flex gap-3 w-full">
                        <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition transform active:scale-95"
                        >
                            {cartQty > 0 ? 'อัปเดตตะกร้า' : 'ยืนยัน'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );


}

export default AddToCartModal;