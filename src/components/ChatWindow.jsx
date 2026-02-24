import React, { useState, useEffect, useRef, use } from 'react';
import { db } from '../FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * @param {string} chatRoomId - ID ของห้องแชท (ปกติคือ UID ของลูกค้า)
 * @param {string} currentRole - บทบาทของคนดู ('admin' หรือ 'customer')
 * @param {string} customerName - ชื่อลูกค้า (ส่งมาจาก ClientChatPage)
 */

const ChatWindow = ({ chatRoomId, currentRole, customerName }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);

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

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm
                                ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                                }`}
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
            <div className="p-3 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
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