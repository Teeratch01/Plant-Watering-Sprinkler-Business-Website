import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Plus, Package, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
/**
 * @param {string} chatRoomId - ID ของห้องแชต (ปกติคือ UID ของลูกค้า)
 * @param {string} currentRole - บทบาทของคนดู ('admin' หรือ 'customer')
 * @param {string} customerName - ชื่อลูกค้า (ส่งมาจาก ClientChatPage)
 */

const ChatWindow = ({ chatRoomId, currentRole, customerName, initialMessage = '' }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState(initialMessage);
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const [showOrderModal, setShowOrderModal] = useState(false);
    const [myOrders, setMyOrders] = useState([]);

    const [imageFiles, setImageFiles] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);


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
        if (currentRole === 'admin' || currentRole === 'adminManager') {
            updateDoc(doc(db, 'chats', chatRoomId), { lastReadByAdmin: serverTimestamp() }).catch((error) => {
                console.error("Error updating lastReadByAdmin: ", error);
            });
        }

        return () => unsubscribe();
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

      const getDisplayStatus = (order) => {
        if (order.OrderStatus === 'Payment In Progress') {
            return order.PaymentSlipUrl ? 'รอตรวจสอบสลิปโอนเงิน' : 'รออัปโหลดสลิป';
        }

        switch (order.OrderStatus) {
            case 'Payment Success': return 'ชำระเงินสำเร็จ';
            case 'Prepare Order': return 'กำลังเตรียมสินค้า';
            case 'Packaging Complete': return 'บรรจุสินค้าเรียบร้อย';
            case 'In transit': return 'อยู่ระหว่างจัดส่ง';
            case 'Deliver Complete': return 'จัดส่งสำเร็จ';
            case 'Cancelled': return 'ยกเลิกคำสั่งซื้อ';
            default: return order.OrderStatus;
        }
    };

    const handleSendOrder = async (order) => {
        setShowOrderModal(false); // ปิด modal

        const thaiStatus = getDisplayStatus(order);

        // สร้างข้อความรูปแบบพิเศษสำหรับออเดอร์
const messageText = `📦 อ้างอิงคำสั่งซื้อ: #${order.OrderNumber}\nสถานะ: ${thaiStatus}\nยอดรวม: ฿${Number(order.TotalPrice).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
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
    const handleImageSelect = (e) => {
        const files = e.target.files[0];
        if (files) {
            if (files.size > 5 * 1024 * 1024) { // จำกัดขนาดไฟล์ไม่เกิน 5MB
                toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
                return;
            }
            setImageFiles(files);
            setImagePreview(URL.createObjectURL(files));
        }
    }

    const removeImage = () => {
        setImageFiles(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

    }


    const handleSendMessage = async (e) => {
        e.preventDefault();

        // ถ้าไม่มีทั้งข้อความและรูปภาพ ให้กดส่งไม่ได้
        if (!newMessage.trim() && !imageFiles) return;

        setIsUploading(true);
        try {
            let imageUrl = null;

            // --- 3.1 ถ้ามีการแนบรูปภาพ ให้อัปโหลดขึ้น Storage ก่อน ---
            if (imageFiles) {
                const storageRef = ref(storage, `chat_images/${chatRoomId}/${Date.now()}_${imageFiles.name}`);
                await uploadBytes(storageRef, imageFiles);
                imageUrl = await getDownloadURL(storageRef);
            }

            const messageText = newMessage.trim();
            setNewMessage('');
            removeImage(); // เคลียร์รูปภาพหลังจากกดส่ง

            // --- 3.2 สร้าง Payload สำหรับส่งเข้า Firestore ---
            const messageData = {
                text: messageText, // อาจจะเป็นค่าว่างถ้าส่งรูปอย่างเดียว
                sender: currentRole,
                createdAt: serverTimestamp()
            };

            // ถ้ารูปส่งผ่าน ค่อยยัด URL ลงไป
            if (imageUrl) {
                messageData.imageUrl = imageUrl;
            }

            await addDoc(collection(db, 'chats', chatRoomId, 'messages'), messageData);

            // --- 3.3 อัปเดตข้อมูลของห้องแชต (Last Message) ---
            const chatDocRef = doc(db, 'chats', chatRoomId);

            // สร้างข้อความแจ้งเตือนล่าสุด
            let lastMsgSnippet = messageText;
            if (imageUrl) {
                lastMsgSnippet = messageText ? `[รูปภาพ] ${messageText}` : '[ส่งรูปภาพ]';
            }

            const updateData = {
                lastMessage: lastMsgSnippet,
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
            toast.error("เกิดข้อผิดพลาดในการส่งข้อความ");
        } finally {
            setIsUploading(false);
        }
    }

    const formatDateDivider = (date) => {
        if (!date) return '';

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'วันนี้';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'เมื่อวาน';
        } else {
            return date.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }); // จะได้ format "12 มี.ค. 2569"
        }
    };

  










    return (
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">

            {/* --- พื้นที่แสดงข้อความ --- */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/subtle-grey.png')]">
                {loading && <p className="text-center text-gray-400 text-sm">กำลังโหลด...</p>}

                {!loading && messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10 text-sm">
                        เริ่มการสนทนาได้เลย
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = msg.sender === currentRole;
                    const isOrderMessage = msg.text && msg.text.includes("อ้างอิงคำสั่งซื้อ:");

                    const currDate = msg.createdAt?.toDate();
                    const prevDate = index > 0 ? messages[index - 1].createdAt?.toDate() : null;
                    let showDateDivider = false;

                    // ถ้ามีวันที่ปัจจุบัน และ (เป็นข้อความแรก หรือ วันที่ไม่ตรงกับข้อความก่อนหน้า)
                    if (currDate) {
                        if (!prevDate) {
                            showDateDivider = true;
                        } else if (currDate.toDateString() !== prevDate.toDateString()) {
                            showDateDivider = true;
                        }
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {/* . 3. แสดงป้ายวันที่คั่นกลางแชต ถ้า showDateDivider เป็นจริง */}
                            {showDateDivider && (
                                <div className="flex justify-center my-6">
                                    <span className="bg-gray-200/60 text-gray-500 text-[11px] px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm">
                                        {formatDateDivider(currDate)}
                                    </span>
                                </div>
                            )}

                            <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>

                                    {msg.imageUrl && (
                                        <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                                            <img
                                                src={msg.imageUrl}
                                                alt="Chat attachment"
                                                className={`rounded-xl max-h-48 md:max-h-64 object-contain border border-gray-200 shadow-sm transition hover:opacity-90 bg-white
                                                    ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                                            />
                                        </a>
                                    )}

                                    {msg.text && (
                                        <div className={`px-4 py-2 text-sm shadow-sm
                                            ${isMe
                                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                                : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-200'
                                            }
                                            ${isOrderMessage ? 'border-2 border-blue-300 bg-blue-50 text-blue-900' : ''}
                                            `}
                                        >
                                            {msg.text}
                                        </div>
                                    )}

                                    <div className={`text-[10px] mt-1 ${isMe ? 'text-gray-400 text-right' : 'text-gray-400 text-left'}`}>
                                        {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* --- Input Area --- */}
            <div className="p-3 bg-white border-t border-gray-100 relative">

                {imagePreview && (
                    <div className="absolute bottom-full left-0 mb-2 ml-4 p-2 bg-white border border-gray-200 shadow-xl rounded-xl z-20 animate-fade-in-up">
                        <div className="relative">
                            <img src={imagePreview} alt="Preview" className="h-24 md:h-32 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                            <button
                                type="button"
                                onClick={removeImage}
                                disabled={isUploading}
                                className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md transition"
                            >
                                <X size={14} />
                            </button>
                            {isUploading && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showOrderModal && (
                    <div className="absolute bottom-full left-2 mb-2 w-72 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-20 animate-fade-in-up">
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
                                            <span>{getDisplayStatus(order)}</span>
                                            <span className="font-bold">฿{Number(order.TotalPrice).toLocaleString('th-TH', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">

                    {currentRole === 'customer' && (
                        <button
                            type="button"
                            onClick={fetchMyOrders}
                            disabled={isUploading}
                            className={`p-2 rounded-full transition-colors flex-shrink-0
                                ${showOrderModal ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                            title="แนบคำสั่งซื้อ"
                        >
                            <Plus size={20} className={`transform transition-transform ${showOrderModal ? 'rotate-45' : ''}`} />
                        </button>
                    )}

                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition flex-shrink-0 disabled:opacity-50"
                        title="แนบรูปภาพ"
                    >
                        <ImageIcon size={20} />
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="พิมพ์ข้อความ..."
                        disabled={isUploading}
                        className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm disabled:opacity-50"
                    />

                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !imageFiles) || isUploading}
                        className="bg-blue-600 text-white p-2 w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChatWindow;