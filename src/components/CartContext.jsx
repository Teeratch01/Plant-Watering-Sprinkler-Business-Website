import React, { createContext, useState, useContext, useEffect, use } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {


    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart = localStorage.getItem('shopping-cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('shopping-cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1) => {
        // 🌟 1. เช็คสต็อกก่อนเอาเข้าตะกร้า
        const existingItem = cartItems.find((item) => item.id === product.id);
        const stock = Number(product.Stock || product.stock || 999);

        if (existingItem) {
            const currentQty = existingItem.quantity;
            if (currentQty + quantity > stock) {
                toast.warn(`สินค้ามีเพียง ${stock} ชิ้น`);
                return; // หยุดการทำงาน ไม่ต้องเอาเข้าตะกร้า
            }
        } else if (quantity > stock) {
            toast.warn(`สินค้ามีเพียง ${stock} ชิ้น`);
            return;
        }

        // 🌟 2. ถ้าของมีพอ ค่อยสั่งอัปเดตตะกร้า
        setCartItems((prevItems) => {
            const itemExists = prevItems.find((item) => item.id === product.id);
            if (itemExists) {
                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity }];
            }
        });

        // แถมให้: ถ้าอยากให้มีแจ้งเตือนตอนหยิบใส่ตะกร้าสำเร็จ สามารถใช้บรรทัดล่างนี้ได้ครับ
        // toast.success("เพิ่มสินค้าลงตะกร้าแล้ว!");
    };

    const removeFromCart = (productId) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
        toast.error("ลบสินค้าออกจากตะกร้าแล้ว");
    };

    const updateQuantity = (productId, type) => {

        const itemToUpdate = cartItems.find((item) => item.id === productId);
        if (!itemToUpdate) return;

        const stock = Number(itemToUpdate.Stock || itemToUpdate.stock || 999);

        if (type === 'plus' && itemToUpdate.quantity >= stock) {
            toast.info(`มีสินค้าใน Stock เพียง ${stock} ชิ้น ถ้าสนใจกรุณาติดต่อช่องทาง Support ของเรา`);
            return;
        }
        setCartItems((prevItems) => {
            return prevItems.map((item) => {
                if (item.id === productId) {
                    if (type === 'plus') {
                        return { ...item, quantity: item.quantity + 1 };
                    }
                    else if (type === 'minus' && item.quantity > 1) {
                        return { ...item, quantity: item.quantity - 1 };
                    }
                }
                return item;
            });
        });
    };

    const getCartCount = () => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => total + (item.Price * item.quantity), 0);
    };

    const updateCartItem = (product, newQuantity) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                if (newQuantity <= 0) {
                    // ลบสินค้าออกจากตะกร้า
                    return prevItems.filter((item) => item.id !== product.id);
                }

                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }
            else {
                if (newQuantity > 0) {
                    return [...prevItems, { ...product, quantity: newQuantity }];
                }
                return prevItems;
            }
        });
    }


    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, getCartCount, getCartTotal, setCartItems, updateCartItem }}>
            {children}
        </CartContext.Provider>
    );
}




