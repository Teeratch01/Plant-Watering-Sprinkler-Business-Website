import React, { useState, useEffect } from 'react';
import { db } from '../../FirebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { MessageSquare, Search } from 'lucide-react';
import ChatWindow from '../../components/ChatWindow'; // Import Component กลาง
import AdminNavbar from '../../components/Admin/AdminNavbar'; 

function AdminChatPage() {
    const [chatRooms, setChatRooms] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null); // เก็บแค่ ID ก็พอ

    // ดึงรายชื่อห้องแชท
    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    return (
        
        <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

            
            <AdminNavbar />
            <div className="flex flex-1 overflow-hidden">
            
            {/* --- Sidebar (เหมือนเดิม) --- */}
            <div className="w-1/3 md:w-1/4 bg-white border-r border-gray-200 flex flex-col">
            
                <div className="p-4 border-b bg-gray-50 font-bold flex gap-2">
                    
                    <MessageSquare className="text-blue-600"/> แชทลูกค้า
                </div>
                <div className="flex-1 overflow-y-auto">
                    
                    {chatRooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => setSelectedChatId(room.id)}
                            className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition relative
                                ${selectedChatId === room.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                        >
                            <h3 className={`font-bold ${room.unreadAdmin ? 'text-black' : 'text-gray-600'}`}>
                                {room.customerName || 'Customer'}
                            </h3>
                            <p className="text-xs text-gray-400 truncate">{room.lastMessage}</p>
                            {room.unreadAdmin && <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full"/>}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Main Area (ใช้ ChatWindow) --- */}
            <div className="flex-1 p-4 bg-gray-100 flex flex-col">
                {selectedChatId ? (
                    <ChatWindow 
                        chatRoomId={selectedChatId} 
                        currentRole="admin" 
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        เลือกรายการเพื่อเริ่มแชท
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}

export default AdminChatPage;