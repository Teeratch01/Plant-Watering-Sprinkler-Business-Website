import React, { createContext, useState, useContext, useEffect, use } from 'react';

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
        setCartItems((prevItems) => {

            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                // เช็ค Stock ก่อนบวกเพิ่ม (ถ้ามีข้อมูล Stock)
                const currentQty = existingItem.quantity;
                const stock = Number(product.Stock || 999);

                if (currentQty + quantity > stock) {
                    toast.warn(`สินค้ามีเพียง ${stock} ชิ้น`);
                    return prevItems;
                }

                return prevItems.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevItems, { ...product, quantity }];
            }
        })

    }

    const removeFromCart = (productId) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
        toast.error("ลบสินค้าออกจากตะกร้าแล้ว");
    };

    const updateQuantity = (productId, type) => {
        setCartItems((prevItems) => {
            return prevItems.map((item) => {
                if (item.id === productId) {
                    const stock = Number(item.Stock || 999);

                    if (type === 'plus') {
                        if (item.quantity < stock) {
                            return { ...item, quantity: item.quantity + 1 };
                        } else {
                            toast.info(`มีสินค้าเพียง ${stock} ชิ้น`);
                        }
                    }

                    if (type === 'minus') {
                        // ถ้าเหลือ 1 แล้วกดลบ -> ไม่ทำอะไร (หรือจะให้ลบเลยก็ได้ แต่ปกติ UI จะมีปุ่มลบแยก)
                        if (item.quantity > 1) {
                            return { ...item, quantity: item.quantity - 1 };
                        }
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
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, getCartCount, getCartTotal, setCartItems,updateCartItem }}>
            {children}
        </CartContext.Provider>
    );
}




