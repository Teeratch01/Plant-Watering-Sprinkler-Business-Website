import React, { useState, useEffect, use } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import { Search, Plus, Shield, ShieldAlert, CheckCircle, XCircle, AlertCircle, UserCog } from 'lucide-react';
import { toast } from 'react-toastify';
import { onAuthStateChanged } from 'firebase/auth';

import { secondaryAuth } from '../../FirebaseConfig'; // ดึงแอปสำรองมาใช้
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // เพิ่มคำสั่งสร้างรหัสผ่าน
import { setDoc } from 'firebase/firestore'; // เปลี่ยนมาใช้ setDoc เพื่อกำหนด ID เอง

function AdminManagementPage() {
    const [admins, setAdmins] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('List');
    const [searchTerm, setSearchTerm] = useState('');

    const [currentUser, setCurrentUser] = useState(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstname: '',
        surname: '',
        email: '',
        password: '',
        role: 'admin',
        adminStatus: 'Active'
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    setCurrentUser({ uid: user.uid, ...docSnap.data() });
                }
            } else {
                setCurrentUser(null);
            }
        });
        return () => unsubscribeAuth();
    }, []);


    // --- 2. ดึงข้อมูลตารางและคำขอ (ทำหลังจากรู้แล้วว่าใคร Login) ---
    useEffect(() => {
        // ถ้ายืนยันตัวตนยังไม่เสร็จ ให้รอไปก่อน
        if (!currentUser) return;

        // A: ดึงรายชื่อ Admin ทั้งหมด (ทุกคนเห็นเหมือนกัน)
        const qAdmins = query(collection(db, "users"), where("role", "in", ["admin", "adminManager"]));
        const unsubscribeAdmins = onSnapshot(qAdmins, (snapshot) => {
            const adminData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAdmins(adminData);
            setLoading(false);
        });

        // B: . ดึงข้อมูลคำขอ (แบ่งตาม Role) .
        let qRequests;
        if (currentUser.role === 'adminManager') {
            // Manager: ดึงมาทั้งหมด เพื่อรออนุมัติ
            qRequests = query(collection(db, "admin_requests"));
        } else {
            // Employee: ดึงเฉพาะที่ requestedBy ตรงกับ UID ของตัวเอง
            qRequests = query(collection(db, "admin_requests"), where("requestedBy", "==", currentUser.uid));
        }

        const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
            const reqData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                // . กรองเอาเฉพาะ Request ที่ "ไม่ได้" ขึ้นต้นด้วยคำว่า 'PRODUCT_' 
                .filter(req => req.type && !req.type.startsWith('PRODUCT_'));

            // เรียงจากใหม่ไปเก่า
            reqData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setRequests(reqData);
        });

        // คืนค่าฟังก์ชันสำหรับยกเลิกการดึงข้อมูลเมื่อสลับหน้า
        return () => {
            unsubscribeAdmins();
            unsubscribeRequests();
        };

    }, [currentUser])

    const handleAddAdmin = async (e) => {
        e.preventDefault();

        const isManager = currentUser?.role === 'adminManager';
        try {
            if (isManager) {

                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
                const newUserUid = userCredential.user.uid;

                await setDoc(doc(db, 'users', newUserUid), {
                    firstname: formData.firstname,
                    surname: formData.surname,
                    email: formData.email,
                    role: formData.role,
                    adminStatus: formData.adminStatus,
                    createdAt: serverTimestamp()
                });

                await signOut(secondaryAuth);
                toast.success('เพิ่มผู้ดูแลระบบใหม่เรียบร้อยแล้ว');
            } else {
                await addDoc(collection(db, 'admin_requests'), {
                    type: 'ADD_USER',
                    data: formData,
                    requestedBy: currentUser.uid,
                    requestedByName: `${currentUser.firstname} ${currentUser.surname || ''}`,
                    status: 'PENDING',
                    createdAt: serverTimestamp()
                });
                toast.success('ส่งคำขอเพิ่มผู้ดูแลระบบแล้ว กรุณารอ Manager อนุมัติ');
            }
            setIsAddModalOpen(false);
            setFormData({
                firstname: '',
                surname: '',
                email: '',
                password: '',
                role: 'admin',
                adminStatus: 'Active'
            }
            );
        } catch (error) {
            console.error('Error adding admin:', error);
            toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ');
        }
    }

    const handleStatusChange = async (targetUserId, targetUserName, currentStatus, targetRole) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        const isManager = currentUser?.role === 'adminManager';

        if (!isManager && targetRole === 'adminManager') {
            toast.error('คุณไม่มีสิทธิ์เปลี่ยนสถานะของ Manager ได้');
            return;
        }

        try {
            if (isManager) {
                await updateDoc(doc(db, 'users', targetUserId), { adminStatus: newStatus });
                toast.success(`เปลี่ยนสถานะผู้ดูแลระบบ ${targetUserName} เป็น ${newStatus} แล้ว`);
            } else {
                await addDoc(collection(db, 'admin_requests'), {
                    type: 'CHANGE_STATUS',
                    targetUserId: targetUserId,
                    targetUserName: targetUserName,
                    newStatus: newStatus,
                    requestedBy: currentUser.uid,
                    requestedByName: `${currentUser.firstname} ${currentUser.surname || ''}`,
                    status: 'PENDING',
                    createdAt: serverTimestamp()
                });
                toast.success(`ส่งคำขอเปลี่ยนสถานะผู้ดูแลระบบ ${targetUserName} เป็น ${newStatus} แล้ว กรุณารอ Manager อนุมัติ`);
            }

        } catch (error) {
            console.error('Error changing admin status:', error);
            toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ดูแลระบบ');
        }
    }

    const handleApproveRequest = async (request) => {
        try {
            if (request.type === 'ADD_USER') {

                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, request.data.email, request.data.password);
                const newUserUid = userCredential.user.uid;

                const userDataToSave = { ...request.data, createdAt: serverTimestamp() };
                delete userDataToSave.password;

                await setDoc(doc(db, 'users', newUserUid), userDataToSave);
                await signOut(secondaryAuth);
            } else if (request.type === 'CHANGE_STATUS') {
                await updateDoc(doc(db, 'users', request.targetUserId), { adminStatus: request.newStatus });
            }
            await updateDoc(doc(db, 'admin_requests', request.id), { status: 'APPROVED', actedAt: serverTimestamp() });
            toast.success('อนุมัติคำขอเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error approving request:', error);
            toast.error('เกิดข้อผิดพลาดในการอนุมัติคำขอ');
        }
    }

    const handleRejectRequest = async (requestId) => {
        try {
            await updateDoc(doc(db, 'admin_requests', requestId), { status: 'REJECTED', actedAt: serverTimestamp() });
            toast.success('ปฏิเสธคำขอเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
        }
    }

    const filteredAdmins = admins.filter(admin =>
        admin.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isManager = currentUser?.role === 'adminManager';

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '-';
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
        return '-';
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <AdminNavbar />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <UserCog size={28} className="text-blue-600" /> การจัดการผู้ดูแลระบบ (Admin Management)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">จัดการบัญชีผู้ใช้งาน และกำหนดสิทธิ์การเข้าถึงระบบ</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ หรือ อีเมล..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                            />
                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm"
                        >
                            <Plus size={16} /> เพิ่มผู้ดูแล
                        </button>
                    </div>
                </div>

                {/* Tabs (แสดง Pending Tab เฉพาะ Manager) */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
                    <button
                        onClick={() => setActiveTab('List')}
                        className={`px-6 py-3 text-center font-bold text-sm border-b-2 transition duration-200 
                            ${activeTab === 'List' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        รายชื่อผู้ดูแลระบบ ({admins.length})
                    </button>


                    <button
                        onClick={() => setActiveTab('Pending')}
                        className={`px-6 py-3 text-center font-bold text-sm border-b-2 transition duration-200 flex items-center gap-2
                            ${activeTab === 'Pending' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                        สถานะคำขอ
                        {/* . นับจำนวนเฉพาะรายการที่สถานะเป็น PENDING มาโชว์ที่ Badge */}
                        {requests.filter(req => req.status === 'PENDING').length > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                                {requests.filter(req => req.status === 'PENDING').length}
                            </span>
                        )}
                    </button>

                </div>

                {/* --- Tab 1: Admin List --- */}
                {activeTab === 'List' && (
                    <div className="bg-white rounded-b-xl rounded-t-sm shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">ชื่อ-นามสกุล</th>
                                    <th className="px-6 py-4 font-bold">อีเมล</th>
                                    <th className="px-6 py-4 font-bold">ตำแหน่ง (Role)</th>
                                    <th className="px-6 py-4 font-bold">สถานะ (Status)</th>
                                    <th className="px-6 py-4 font-bold text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td></tr>
                                ) : filteredAdmins.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูลผู้ดูแลระบบ</td></tr>
                                ) : (
                                    filteredAdmins.map((admin) => (
                                        <tr key={admin.id} className="hover:bg-gray-50 transition duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{admin.firstname} {admin.surname}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{admin.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {admin.role === 'adminManager' ? (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md w-fit border border-purple-200">
                                                        <ShieldAlert size={12} /> Manager
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit border border-blue-200">
                                                        <Shield size={12} /> Employee
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full border 
                                                    ${admin.adminStatus === 'Active' || !admin.adminStatus ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                                >
                                                    {admin.adminStatus || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {/* ป้องกันไม่ให้เปลี่ยนสถานะตัวเอง */}
                                                {admin.id !== currentUser?.uid && !(currentUser?.role === 'admin' && admin.role === 'adminManager') ? (
                                                    <button
                                                        onClick={() => handleStatusChange(admin.id, `${admin.firstname} ${admin.surname}`, admin.adminStatus || 'Active')}
                                                        className="text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        เปลี่ยนสถานะ
                                                    </button>
                                                ) : (
                                                    admin.id !== currentUser?.uid && (
                                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                            ไม่มีสิทธิ์จัดการ
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- Tab 2: Pending Approvals (Manager Only) --- */}
                {activeTab === 'Pending' && (
                    <div className="bg-white rounded-b-xl rounded-t-sm shadow-sm border border-gray-200 overflow-hidden p-6">
                        {requests.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <CheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
                                <p>ไม่มีรายการรออนุมัติ</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition shadow-sm">
                                        <div className="mb-4 md:mb-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider
                                                    ${req.type === 'ADD_USER' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {req.type === 'ADD_USER' ? 'ขอเพิ่มบัญชีใหม่' : 'ขอเปลี่ยนสถานะ'}
                                                </span>
                                                <span className="text-xs text-gray-400">ร้องขอโดย: {req.requestedByName}</span>

                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs text-gray-500 font-medium">{formatTimestamp(req.createdAt)}</span>
                                            </div>

                                            {req.type === 'ADD_USER' ? (
                                                <p className="text-sm text-gray-800 font-medium">
                                                    ต้องการเพิ่ม <span className="font-bold text-black">{req.data.firstname} {req.data.surname}</span> ({req.data.email}) เป็น {req.data.role === 'adminManager' ? 'Manager' : 'Employee'}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-800 font-medium">
                                                    ต้องการเปลี่ยนสถานะของ <span className="font-bold text-black">{req.targetUserName}</span> เป็น <span className={`font-bold ${req.newStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>{req.newStatus}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto items-center justify-end">
                                            {/* . เงื่อนไข: ถ้าเป็น Manager "และ" สถานะยัง PENDING ถึงจะแสดงปุ่มให้กด */}
                                            {isManager && req.status === 'PENDING' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleRejectRequest(req.id)}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1"
                                                    >
                                                        <XCircle size={16} /> ปฏิเสธ
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveRequest(req)}
                                                        className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        <CheckCircle size={16} /> อนุมัติ
                                                    </button>
                                                </>
                                            ) : (
                                                /* . ถ้าไม่ใช่ Manager หรือรายการนี้ถูกพิจารณาไปแล้ว ให้แสดงแค่ "ป้ายสถานะ" */
                                                <span className={`text-xs font-bold px-4 py-2 rounded-full border flex items-center gap-1
                                                    ${req.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                        req.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                                                            'bg-red-50 text-red-600 border-red-200'}`}
                                                >
                                                    {req.status === 'PENDING' && <AlertCircle size={14} />}
                                                    {req.status === 'APPROVED' && <CheckCircle size={14} />}
                                                    {req.status === 'REJECTED' && <XCircle size={14} />}

                                                    {req.status === 'PENDING' ? 'กำลังรออนุมัติ' :
                                                        req.status === 'APPROVED' ? 'อนุมัติเรียบร้อย' :
                                                            'ไม่อนุมัติ'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Modal เพิ่ม User --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in-up">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Plus size={24} className="text-blue-600" /> เพิ่มผู้ดูแลระบบใหม่
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required
                                        value={formData.firstname} onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">นามสกุล <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required
                                        value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">อีเมล (E-mail) <span className="text-red-500">*</span></label>
                                <input
                                    type="email" required
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">รหัสผ่าน (Password) <span className="text-red-500">*</span></label>
                                <input
                                    type="password" required
                                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ตำแหน่ง (Role) <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    >
                                        <option value="admin">Employee - ระดับทั่วไป</option>
                                        <option value="adminManager">Manager - ระดับผู้จัดการ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ (Status) <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.adminStatus} onChange={(e) => setFormData({ ...formData, adminStatus: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    >
                                        <option value="Active">Active - ใช้งานปกติ</option>
                                        <option value="Inactive">Inactive - ระงับการใช้งาน</option>
                                    </select>
                                </div>
                            </div>

                            {!isManager && (
                                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-xs font-medium flex items-start gap-2 border border-orange-100 mt-4">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p>เนื่องจากคุณเป็น Admin ระดับ Employee การเพิ่มผู้ใช้ใหม่จะต้องรอให้ Manager อนุมัติก่อนถึงจะเสร็จสมบูรณ์</p>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                                    ยกเลิก
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
                                    {isManager ? 'เพิ่มผู้ดูแลระบบทันที' : 'ส่งคำขออนุมัติ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
export default AdminManagementPage;