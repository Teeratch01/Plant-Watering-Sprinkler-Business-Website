import React, { useState, useEffect, use } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import { Search, Edit, Users, UserX, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { auth } from '../../FirebaseConfig'; // . โหลด auth เข้ามา
import { sendPasswordResetEmail } from 'firebase/auth'; // . ฟังก์ชันสำหรับส่งอีเมลรีเซ็ตรหัสผ่าน

import { CreateInput } from "thai-address-autocomplete-react";

const InputThaiAddress = CreateInput();

function AdminCustomerPage() {

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({
        firstname: '',
        surname: '',
        phone: '',
        // ข้อมูลที่อยู่ (ดึงตามโครงสร้างใน Firebase ของคุณ)
        addressLocation: '',
        sub_district: '',
        district: '',
        province: '',
        zipcode: ''
    });


    useEffect(() => {
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const customerOnly = usersData.filter(user => !user.role);

            customerOnly.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setCustomers(customerOnly);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ฟิลเตอร์ลูกค้าตามคำค้นหา
    const filteredCustomers = customers.filter(c => {
        const search = searchTerm.toLowerCase();
        return (
            c.firstname.toLowerCase().includes(search) ||
            c.surname.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            c.phone.toLowerCase().includes(search)
        );
    }
    );

    // ฟังก์ชันสำหรับเปิด Modal แก้ไขข้อมูล
    const openEditModal = (customer) => {
        setSelectedCustomer(customer);
        setFormData({
            firstname: customer.firstname || '',
            surname: customer.surname || '',
            phone: customer.phone || '',
            // ดึงข้อมูลที่อยู่จาก Object address ใน Firebase
            addressLocation: customer.address?.address || '',
            sub_district: customer.address?.sub_district || '',
            district: customer.address?.district || '',
            province: customer.address?.province || '',
            zipcode: customer.address?.zipcode || ''
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedCustomer(null);
    }

    // ฟังก์ชันสำหรับบันทึกข้อมูลที่แก้ไข
    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        try {
            const customerRef = doc(db, 'users', selectedCustomer.id);
            await updateDoc(customerRef, {
                firstname: formData.firstname,
                surname: formData.surname,
                phone: formData.phone,
                address: {
                    address: formData.addressLocation,
                    sub_district: formData.sub_district,
                    district: formData.district,
                    province: formData.province,
                    zipcode: formData.zipcode
                },
                updatedAt: serverTimestamp()
            });
            toast.success('อัปเดตข้อมูลลูกค้าสำเร็จ');
            closeEditModal();
        } catch (error) {
            console.error("Error updating customer:", error);
            toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูลลูกค้า');
        }
    };

    // ฟังก์ชันสำหรับจัดการแสดงที่อยู่
    const formatAddress = (addressObj) => {
        if (!addressObj) return <span className="text-gray-400">ไม่ได้ระบุที่อยู่</span>;
        const { address, sub_district, district, province, zipcode } = addressObj;
        const parts = [address, sub_district, district, province, zipcode].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : <span className="text-gray-400">ไม่ได้ระบุที่อยู่</span>;
    };

    // ฟังก์ชันสำหรับส่งอีเมลรีเซ็ตรหัสผ่าน
    const handleSendPasswordReset = async () => {
        if (!selectedCustomer?.email) {
            toast.error('ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ เนื่องจากไม่มีอีเมลของลูกค้า');
            return;
        }
        if (window.confirm(`ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมล: ${selectedCustomer.email}\nคุณแน่ใจหรือไม่?`)) {
            try {
                await sendPasswordResetEmail(auth, selectedCustomer.email);
                toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของลูกค้าสำเร็จ');
            } catch (error) {
                console.error("Error sending password reset email:", error);
                toast.error('เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน');
            }
        }
    };

    const handleAddressChange = (scope) => (value) => {
        setFormData(prev => ({
            ...prev,
            [scope]: value
        }));
    };

    // 2. ฟังก์ชันเมื่อกดเลือกที่อยู่จาก Dropdown
    const handleAddressSelect = (addressData) => {
        setFormData(prev => ({
            ...prev,
            // จับคู่ตัวแปรจากไลบรารี เข้ากับตัวแปร State ของเรา
            sub_district: addressData.district, // ไลบรารีส่ง district (ตำบล) -> เราเก็บใน sub_district
            district: addressData.amphoe,       // ไลบรารีส่ง amphoe (อำเภอ) -> เราเก็บใน district
            province: addressData.province,
            zipcode: addressData.zipcode
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
            <AdminNavbar />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* --- Header Section --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users size={28} className="text-blue-600" /> การจัดการข้อมูลลูกค้า (Customer Management)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">ตรวจสอบและจัดการข้อมูลส่วนตัวของลูกค้ารายย่อย</p>
                    </div>

                    <div className="relative w-full md:w-80 shrink-0">
                        <input
                            type="text"
                            placeholder="ค้นหา ชื่อ, นามสกุล หรือ เบอร์โทรศัพท์..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm bg-white"
                        />
                        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                    </div>
                </div>

                {/* --- Table Section --- */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">ชื่อ-นามสกุล</th>
                                    <th className="px-6 py-4 font-bold">ข้อมูลการติดต่อ</th>
                                    <th className="px-6 py-4 font-bold">ที่อยู่จัดส่ง</th>
                                    <th className="px-6 py-4 font-bold text-center">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูลลูกค้า...</td></tr>
                                ) : filteredCustomers.length === 0 ? (
                                    // . แจ้งเตือนเมื่อค้นหาไม่พบ (ตาม Use Case 16)
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <UserX size={40} className="mx-auto text-gray-300 mb-3" />
                                            <p className="text-gray-500 font-medium">ไม่พบข้อมูลลูกค้าที่ตรงกับข้อมูลที่ต้องการค้นหา</p>
                                            <p className="text-xs text-gray-400 mt-1">รบกวนตรวจสอบข้อมูลที่กรอกเข้ามาอีกครั้ง</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-blue-50/50 transition duration-150">

                                            {/* ชื่อ */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{customer.firstname} {customer.surname}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">ID: {customer.id.substring(0, 8)}...</div>
                                            </td>

                                            {/* ข้อมูลติดต่อ */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Mail size={14} className="text-gray-400" /> {customer.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Phone size={14} className="text-gray-400" /> {customer.phone || '-'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ที่อยู่ */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-2 text-gray-600 max-w-xs">
                                                    <MapPin size={16} className="text-red-400 shrink-0 mt-0.5" />
                                                    <span className="line-clamp-2 leading-tight">
                                                        {formatAddress(customer.address)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* ปุ่มแก้ไข */}
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => openEditModal(customer)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                                                >
                                                    <Edit size={14} /> แก้ไขข้อมูล
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* ========================================= */}
            {/* ============= MODAL SECTION ============= */}
            {/* ========================================= */}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in-down w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">

                        <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                                    <Edit size={20} className="text-blue-600" /> แก้ไขข้อมูลลูกค้า
                                </h2>
                                <div className="flex items-center gap-3 mt-2">
                                    <p className="text-sm text-gray-600 font-medium bg-gray-100 px-3 py-1.5 rounded-md">
                                        E-mail: {selectedCustomer?.email}
                                    </p>
                                    {/* . ปุ่มส่งอีเมลรีเซ็ตรหัสผ่าน */}
                                    <button
                                        type="button"
                                        onClick={handleSendPasswordReset}
                                        className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-md transition"
                                    >
                                        ส่งลิงก์รีเซ็ตรหัสผ่าน (Reset Password)
                                    </button>
                                </div>
                            </div>
                            <button onClick={closeEditModal} className="text-gray-400 hover:text-red-500 transition mt-1">✕</button>
                        </div>

                        <form onSubmit={handleUpdateCustomer} className="space-y-6">

                            {/* ข้อมูลส่วนตัว */}
                            <div>
                                <h3 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-100 pb-1">ข้อมูลส่วนตัว</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อ</label>
                                        <input type="text" required value={formData.firstname} onChange={e => setFormData({ ...formData, firstname: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">นามสกุล</label>
                                        <input type="text" required value={formData.surname} onChange={e => setFormData({ ...formData, surname: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* ข้อมูลที่อยู่ */}
                            <div>
                                <h3 className="text-sm font-bold text-blue-800 mb-3 border-b border-blue-100 pb-1">ที่อยู่สำหรับจัดส่ง</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">บ้านเลขที่ / หมู่บ้าน / ถนน</label>
                                        <input type="text" value={formData.addressLocation} onChange={e => setFormData({ ...formData, addressLocation: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                    </div>

                                    {/* . เปลี่ยนมาใช้ InputThaiAddress . */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">แขวง / ตำบล</label>
                                        {/* . สังเกตว่าเราใช้แค่ admin-address-box ครอบเอาไว้ และข้างในไม่มี className แล้ว */}
                                        <div className="admin-address-box w-full">
                                            <InputThaiAddress.District
                                                value={formData.sub_district || ''}
                                                onChange={handleAddressChange('sub_district')}
                                                onSelect={handleAddressSelect}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">เขต / อำเภอ</label>
                                        <div className="admin-address-box w-full">
                                            <InputThaiAddress.Amphoe
                                                value={formData.district || ''}
                                                onChange={handleAddressChange('district')}
                                                onSelect={handleAddressSelect}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">จังหวัด</label>
                                        <div className="admin-address-box w-full">
                                            <InputThaiAddress.Province
                                                value={formData.province || ''}
                                                onChange={handleAddressChange('province')}
                                                onSelect={handleAddressSelect}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">รหัสไปรษณีย์</label>
                                        <div className="admin-address-box w-full">
                                            <InputThaiAddress.Zipcode
                                                value={formData.zipcode || ''}
                                                onChange={handleAddressChange('zipcode')}
                                                onSelect={handleAddressSelect}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* หมายเหตุเรื่องรหัสผ่าน */}
                            <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-xs font-medium border border-orange-100">
                                * หมายเหตุ: การเปลี่ยนรหัสผ่าน (Password) จะต้องมีการส่ง E-mail Reset รหัสผ่านไปให้ลูกค้าหรือให้ลูกค้าดำเนินการกด "ลืมรหัสผ่าน" ผ่านหน้า Login ของลูกค้าเองเพื่อความปลอดภัยของข้อมูล
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={closeEditModal} className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">ยกเลิก</button>
                                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm">
                                    บันทึกข้อมูล
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );

}

export default AdminCustomerPage;