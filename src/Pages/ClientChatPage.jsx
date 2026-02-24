import React, { useState, useEffect, useRef, use } from 'react';
import Navbar from '../components/Navbar';
import { Send, User, MessageCircle } from 'lucide-react';
import { auth, db } from '../FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ChatWindow from '../components/ChatWindow';

function ClientChatPage() {

    const [user, setUser] = useState(null);
    // const [messages, setMessages] = useState([]);
    // const [newMessage, setNewMessage] = useState('');
    // const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    // const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                navigate('/login');
            } else {
                let userData = { ...currentUser };
                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        userData = { ...userData, ...userSnap.data() };
                    }
                } catch (error) {
                    console.error("Error fetching user data", error);
                }
                setUser(userData);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    if (!user) return null;

    const fullName = user.firstname 
        ? `${user.firstname} ${user.surname || ''}`.trim() 
        : user.displayName || user.email;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <Navbar />
            <div className="container mx-auto px-4 py-6 max-w-4xl flex-1 flex flex-col h-[calc(100vh-80px)]">

                {/* Header ง่ายๆ */}
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">ติดต่อเจ้าหน้าที่</h1>
                </div>

                {/* เรียกใช้ ChatWindow: ส่ง UID ตัวเองเป็น chatRoomId */}
                <div className="flex-1 h-full">
                    <ChatWindow
                        chatRoomId={user.uid}
                        currentRole="customer"
                        customerName={fullName}
                    />
                </div>
            </div>
        </div>
    );
}

export default ClientChatPage;