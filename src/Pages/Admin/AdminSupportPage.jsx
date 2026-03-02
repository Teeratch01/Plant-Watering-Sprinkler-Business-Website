import React, { useState, useEffect, use } from 'react';
import { db } from '../../FirebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Mail, Phone, Calendar, CheckCircle, Clock, Send,Type } from 'lucide-react';
import { toast } from 'react-toastify';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import emailjs from '@emailjs/browser';

function AdminSupportPage() {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [replyTitle, setReplyTitle] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "support_requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(ticketData);
        })
        return () => unsubscribe();
    }, []);

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;

        setIsSending(true);

        try {
            const templateParams = {
                title: replyTitle || 'ตอบคำร้องของคุณ',
                message: replyMessage,
                email: selectedTicket.email,
                name: selectedTicket.name
            };
            await emailjs.send(
                'service_ggjvrgp',     // 1. Service ID
                'template_6slcuhp',    // 2. Template ID
                templateParams,
                'l0FcJmRFJUKMjF1sG'      // 3. Public Key
            );
            const ticketRef = doc(db, "support_requests", selectedTicket.id);
            await updateDoc(ticketRef, {
                status: 'replied',
                repliedAt: serverTimestamp(),
                replyMessage: replyMessage,
                replyTitle: replyTitle
            });
            toast.success('ตอบคำร้องสำเร็จและส่งอีเมลแล้ว!');
            setSelectedTicket({ ...selectedTicket, status: 'replied', replyMessage: replyMessage, replyTitle: replyTitle });
            setReplyMessage('');
            setReplyTitle('');
        }
        catch (error) {
            console.error('Error sending email:', error);
            toast.error('เกิดข้อผิดพลาดในการส่งอีเมลตอบกลับ');
        }
        finally {
            setIsSending(false);
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
            <AdminNavbar />

            <div className="flex flex-1 overflow-hidden">
                {/* --- Left Column: Ticket List --- */}
                <div className="w-1/3 md:w-1/4 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
                        <h2 className="font-bold text-lg text-gray-800">Support Tickets</h2>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                            {tickets.filter(t => t.status === 'pending').length} Pending
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {tickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">ไม่มีคำร้องเรียนในระบบ</div>
                        ) : (
                            tickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => {
                                        setSelectedTicket(ticket);
                                        // เคลียร์ช่องกรอกข้อมูลทุกครั้งที่กดเปลี่ยนคน
                                        setReplyTitle('');
                                        setReplyMessage('');
                                    }}
                                    className={`p-4 border-b border-gray-50 cursor-pointer transition relative
                                        ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-sm text-gray-900 truncate pr-2">{ticket.name}</h3>
                                        {ticket.status === 'pending' ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded shrink-0">
                                                <Clock size={10} /> รอการตอบกลับ
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded shrink-0">
                                                <CheckCircle size={10} /> ตอบแล้ว
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mb-2">{ticket.details}</p>
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {ticket.createdAt?.toDate().toLocaleString('th-TH')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- Right Column: Ticket Detail & Reply --- */}
                <div className="flex-1 bg-[#F8FAFC] flex flex-col">
                    {selectedTicket ? (
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">

                            {/* ส่วนแสดงข้อมูลลูกค้าและปัญหา */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                                <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">รายละเอียดคำร้อง</h2>
                                        <p className="text-sm text-gray-500">Ticket ID: {selectedTicket.id}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                                        <a href={`mailto:${selectedTicket.email}`} className="flex items-center gap-2 hover:text-blue-600 transition"><Mail size={16} /> {selectedTicket.email}</a>
                                        {selectedTicket.phone && <a href={`tel:${selectedTicket.phone}`} className="flex items-center gap-2 hover:text-green-600 transition"><Phone size={16} /> {selectedTicket.phone}</a>}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">ข้อความจากลูกค้า</label>
                                    <div className="text-gray-800 text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        {selectedTicket.details}
                                    </div>
                                </div>
                            </div>

                            {/* ส่วนฟอร์มตอบกลับทาง Email */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block flex items-center gap-2">
                                    <Mail size={14} /> ตอบกลับไปยังอีเมลลูกค้า (Email Template)
                                </label>

                                {selectedTicket.status === 'replied' ? (
                                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                        <p className="text-green-800 text-sm font-bold mb-3 flex items-center gap-2"><CheckCircle size={16} /> แอดมินได้ทำการตอบกลับแล้ว</p>
                                        {/* แสดงประวัติหัวข้อที่ตอบกลับ */}
                                        <div className="text-sm mb-2 border-b border-green-200 pb-2">
                                            <span className="font-semibold text-green-900">หัวข้อ:</span> <span className="text-green-800">{selectedTicket.replyTitle || '-'}</span>
                                        </div>
                                        <div className="text-gray-700 text-sm whitespace-pre-wrap">{selectedTicket.replyText}</div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendReply}>

                                        {/* 4. เพิ่มช่องกรอก Title ตรงนี้ */}
                                        <div className="mb-3">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Type size={16} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={replyTitle}
                                                    onChange={(e) => setReplyTitle(e.target.value)}
                                                    placeholder="หัวข้ออีเมล (Subject)..."
                                                    required
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                                                />
                                            </div>
                                        </div>

                                        <textarea
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            placeholder={`สวัสดีคุณ ${selectedTicket.name},\n\n(พิมพ์ข้อความตอบกลับที่นี่...)`}
                                            required
                                            rows="6"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none mb-4"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isSending || !replyMessage.trim() || !replyTitle.trim()}
                                                className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                                            >
                                                {isSending ? 'กำลังส่งอีเมล...' : <><Send size={16} /> ส่งข้อความตอบกลับ</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Mail size={48} className="text-gray-300" />
                            <p>เลือกรายการคำร้องเรียนด้านซ้ายเพื่อดูรายละเอียดและตอบกลับ</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminSupportPage;