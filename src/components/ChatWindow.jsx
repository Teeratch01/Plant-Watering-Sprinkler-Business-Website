import React, { useState, useEffect, useRef, use } from 'react';
import { db } from '../FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { Send, Plus, Package, X } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * @param {string} chatRoomId - ID ของห้องแชท (ปกติคือ UID ของลูกค้า)
 * @param {string} currentRole - บทบาทของคนดู ('admin' หรือ 'customer')
 * @param {string} customerName - ชื่อลูกค้า (ส่งมาจาก ClientChatPage)
 */

const ChatWindow = ({ chatRoomId, currentRole, customerName ,initialMessage = ''}) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState(initialMessage);
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const [showOrderModal, setShowOrderModal] = useState(false);
    const [myOrders, setMyOrders] = useState([]);

    useEffect(() => {
        if (!chatRoomId) return;

        setLoading(true);
        const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        });
        if (currentRole === 'admin') {
            updateDoc(doc(db, 'chats', chatRoomId), { lastReadByAdmin: serverTimestamp() }).catch((error) => {
                console.error("Error updating lastReadByAdmin: ", error);
            });
        }
    }, [chatRoomId, currentRole]);

    const fetchMyOrders = async () => {
        if (currentRole !== 'customer') return;

        if (showOrderModal) {
            setShowOrderModal(false);
            return;
        }
        try {
            const q = query(collection(db, 'orders'), where('UserID', '==', chatRoomId));
            const snap = await getDocs(q);
            const ordersData = snap.docs.map(doc => doc.data());

            ordersData.sort((a, b) => {
                const dateA = a.OrderDate?.toDate() || 0;
                const dateB = b.OrderDate?.toDate() || 0;
                return dateB - dateA;
            });
            setMyOrders(ordersData);
            setShowOrderModal(true);

        } catch (error) {
            console.error("Error fetching orders: ", error);
            toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        }
    }

    const handleSendOrder = async (order) => {
        setShowOrderModal(false); // ปิด modal

        // สร้างข้อความรูปแบบพิเศษสำหรับออเดอร์
        const messageText = `📦 อ้างอิงคำสั่งซื้อ: #${order.OrderNumber}\nสถานะ: ${order.OrderStatus}\nยอดรวม: ฿${Number(order.TotalPrice).toLocaleString()}`;

        try {
            await addDoc(collection(db, 'chats', chatRoomId, 'messages'), {
                text: messageText,
                sender: currentRole,
                createdAt: serverTimestamp()
            });

            const chatDocRef = doc(db, 'chats', chatRoomId);
            const updateData = {
                lastMessage: `ส่งข้อมูลคำสั่งซื้อ #${order.OrderNumber}`,
                lastMessageAt: serverTimestamp(),
                unreadAdmin: true
            };
            if (customerName) updateData.customerName = customerName;

            await setDoc(chatDocRef, updateData, { merge: true });
        } catch (error) {
            console.error("Error sending order message: ", error);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อมูลออเดอร์");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;


        try {
            const messageText = newMessage;
            setNewMessage('');

            await addDoc(collection(db, 'chats', chatRoomId, 'messages'), {
                text: messageText,
                sender: currentRole,
                createdAt: serverTimestamp()
            });

            const chatDocRef = doc(db, 'chats', chatRoomId);
            const updateData = {
                lastMessage: messageText,
                lastMessageAt: serverTimestamp()
            }
            if (currentRole === 'customer') {
                updateData.unreadAdmin = true;

                if (customerName) {
                    updateData.customerName = customerName;
                }
            } else {
                updateData.unreadAdmin = false;
            }
            await setDoc(chatDocRef, updateData, { merge: true });
        } catch (error) {
            console.error("Error sending message: ", error);
            toast.error("เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง");
        }
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

            {/* --- พื้นที่แสดงข้อความ --- */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[url('https://www.transparenttextures.com/patterns/subtle-grey.png')]">
                {loading && <p className="text-center text-gray-400 text-sm">กำลังโหลด...</p>}

                {!loading && messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        เริ่มการสนทนาได้เลย
                    </div>
                )}

                {messages.map((msg) => {
                    // Logic: "ข้อความนี้เป็นของฉันไหม?"
                    const isMe = msg.sender === currentRole;

                    const isOrderMessage = msg.text.includes("อ้างอิงคำสั่งซื้อ:");

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm
                                ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                                }
                                ${isOrderMessage ? 'border-2 border-blue-300 bg-blue-50 text-blue-900' : ''}
                                `}
                            >
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>




            {/* --- Input Area --- */}
            <div className="p-3 bg-white border-t border-gray-100 relative">

                {showOrderModal && (
                    <div className="absolute bottom-16 left-2 w-72 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-20 animate-fade-in-up">
                        <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                <Package size={16} className="text-blue-600" /> เลือกคำสั่งซื้อ
                            </span>
                            <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-red-500">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {myOrders.length === 0 ? (
                                <p className="text-center text-gray-500 text-xs py-4">ไม่มีประวัติคำสั่งซื้อ</p>
                            ) : (
                                myOrders.map(order => (
                                    <div
                                        key={order.OrderNumber}
                                        onClick={() => handleSendOrder(order)}
                                        className="p-2 bg-white border border-gray-100 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition"
                                    >
                                        <div className="font-bold text-blue-600 text-xs mb-1">Order #{order.OrderNumber}</div>
                                        <div className="flex justify-between text-[10px] text-gray-500">
                                            <span>{order.OrderStatus}</span>
                                            <span className="font-bold">฿{Number(order.TotalPrice).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">

                    {currentRole === 'customer' && (
                        <button
                            type="button"
                            onClick={fetchMyOrders}
                            className={`p-2 rounded-full transition-colors flex-shrink-0
                                ${showOrderModal ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                            <Plus size={20} className={`transform transition-transform ${showOrderModal ? 'rotate-45' : ''}`} />
                        </button>
                    )}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="พิมพ์ข้อความ..."
                        className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );

}

export default ChatWindow;