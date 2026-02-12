import React, { useState, useEffect, use } from 'react';
import { db } from '../FirebaseConfig'; // ตรวจสอบ path ให้ถูก
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
    getAuth,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "firebase/auth";
import { X, User, Lock, Save } from 'lucide-react';
import { CreateInput } from "thai-address-autocomplete-react";
import { toast } from 'react-toastify';

const InputThaiAddress = CreateInput();

const ReAuthModal = ({ isOpen, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-80 animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันตัวตน</h3>
                <p className="text-sm text-gray-600 mb-4">กรุณากรอกรหัสผ่านปัจจุบันเพื่อดำเนินการต่อ</p>
                <input
                    type="password"
                    className="w-full p-2.5 border border-gray-300 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="รหัสผ่านปัจจุบัน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button
                        onClick={() => onConfirm(password)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        ยืนยัน
                    </button>
                </div>
            </div>
        </div>
    );
}

const EditProfileModal = ({ userId, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('general');



    const [formData, setFormData] = useState({
        firstname: '',
        surname: '',
        phone: '',
        address: '',
        district: '',
        amphoe: '',
        province: '',
        zipcode: ''
    });
    const [loading, setLoading] = useState(true);

    const [passData, setPassData] = useState({
        oldPass: '',
        newPass: '',
        confirmPass: ''
    });
    const [passMsg, setPassMsg] = useState({ type: '', text: '' });
    const [isReAuthOpen, setIsReAuthOpen] = useState(false);
    const [pendingNewPassword, setPendingNewPassword] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (isOpen && userId) {

                setActiveTab('general');
                setPassMsg({ type: '', text: '' });
                setPassData({ oldPass: '', newPass: '', confirmPass: '' });
                setLoading(true);
                try {
                    const docRef = doc(db, "users", userId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setFormData({
                            firstname: data.firstname || '',
                            surname: data.surname || '',
                            phone: data.phone || '',
                            address: data.address?.address || '',
                            district: data.address?.sub_district || '',
                            amphoe: data.address?.district || '',
                            province: data.address?.province || '',
                            zipcode: data.address?.zipcode || ''
                        });
                    } else {
                        console.log("No such document!");
                    }
                }
                catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }

            setLoading(false);
        };
        fetchUserData();

    }, [isOpen, userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: e.target.value
        }));
    }

    const handleAddressChange = (scope) => (value) => {
        setFormData((oldAddr) => ({
            ...oldAddr,
            [scope]: value
        }));
    }

    const handleSelect = (addressData) => {
        setFormData(prev => ({
            ...prev,
            district: addressData.district,
            amphoe: addressData.amphoe,
            province: addressData.province,
            zipcode: addressData.zipcode
        }));
    };

    const handleUpdate = async () => {

        if (!userId) return;

        try {
            const docRef = doc(db, "users", userId);
            await updateDoc(docRef, {
                firstname: formData.firstname,
                surname: formData.surname,
                phone: formData.phone,
                address: {
                    address: formData.address,
                    district: formData.amphoe,
                    sub_district: formData.district,
                    province: formData.province,
                    zipcode: formData.zipcode
                },
                updatedAt: new Date()
            });
            toast.success("แก้ไขข้อมูลสำเร็จ!");
            onClose();
            window.location.reload();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("แก้ไขข้อมูลไม่สำเร็จ! : " + error.message);
        }
    }


    const handleChangePasswordInit = async () => {
        setPassMsg({ type: '', text: '' });

        if (!passData.oldPass) {
            setPassMsg({ type: 'error', text: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
            return;
        }
        if (passData.newPass !== passData.confirmPass) {
            setPassMsg({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' });
            return;
        }
        if (passData.newPass.length < 6) {
            setPassMsg({ type: 'error', text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
            return;
        }

        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            try {
                const credential = EmailAuthProvider.credential(user.email, passData.oldPass);
                await reauthenticateWithCredential(user, credential);

                // 3. ถ้ารหัสเก่าถูก ค่อยเปลี่ยนเป็นรหัสใหม่
                await updatePassword(user, passData.newPass);
                setPassMsg({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ' });
                setPassData({ newPass: '', confirmPass: '', oldPass: '' });
            }
            catch (error) {
                if (error.code === 'auth/requires-recent-login') {
                    setPendingNewPassword(passData.newPass);
                    setIsReAuthOpen(true);
                }
                else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    setPassMsg({
                        type: 'error',
                        text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
                    });
                }
                else if (error.code === 'auth/too-many-requests') {
                    setPassMsg({
                        type: 'error',
                        text: 'คุณกรอกรหัสผิดบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
                    });
                }

                else {
                    setPassMsg({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + error.message });
                }
            }
        }
    };

    const handleReAuthConfirm = async (currentPassword) => {
        const auth = getAuth();
        const user = auth.currentUser;
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            setIsReAuthOpen(false);
            await updatePassword(user, pendingNewPassword);
            setPassMsg({ type: 'success', text: 'ยืนยันตัวตนและเปลี่ยนรหัสผ่านสำเร็จ!' });
            setPendingNewPassword(null);
            setPassData({ newPass: '', confirmPass: '' });
        } catch (error) {
            toast.error("รหัสผ่านไม่ถูกต้อง: " + error.message);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px] animate-fadeIn">

                <aside className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        Settings
                    </h2>
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm
                                ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <User size={18} className="mr-3" /> General
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm
                                ${activeTab === 'security' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Lock size={18} className="mr-3" /> Security
                        </button>
                    </nav>
                </aside>


                <main className="flex-1 flex flex-col relative bg-white">

                    <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {activeTab === 'general' ? 'ข้อมูลผู้ใช้งาน' : 'เปลี่ยน Password'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8">

                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                        ) : (
                            <>

                                {activeTab === 'general' && (


                                    <form className="space-y-6 mx-4 my-6">
                                        {/* Firstname and Lastname */}
                                        <h1 className="text-l font-bold text-gray-800 mb-6">ข้อมูลส่วนตัว</h1>
                                        <div className="grid grid-cols-2 gap-6">

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">ชื่อ</label>
                                                <input
                                                    type="text"
                                                    name="firstname"
                                                    value={formData.firstname || ''}
                                                    onChange={handleChange}
                                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">นามสกุล</label>
                                                <input
                                                    type="text"
                                                    name="surname"
                                                    value={formData.surname || ''}
                                                    onChange={handleChange}
                                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">เบอร์โทรศัพท์</label>
                                                <input
                                                    type="text"
                                                    name="phone"
                                                    value={formData.phone || ''}
                                                    onChange={handleChange}
                                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <h1 className="text-l font-bold text-gray-800 mb-6">ข้อมูลที่อยู่</h1>

                                        <div className="grid grid-cols-2 gap-6 profile-edit-address">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">ที่อยู่</label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={formData.address || ''}
                                                    onChange={handleChange}
                                                    className="w-full"

                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">เขต/อำเภอ</label>
                                                <InputThaiAddress.Amphoe
                                                    // name="district"
                                                    value={formData.amphoe || ''}
                                                    onChange={handleAddressChange('amphoe')}
                                                    onSelect={handleSelect}
                                                    className="w-full"

                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">แขวง/ตำบล</label>
                                                <InputThaiAddress.District
                                                    // name="sub_district"
                                                    value={formData.district || ''}
                                                    onChange={handleAddressChange('district')}
                                                    onSelect={handleSelect}
                                                    className="w-full"

                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">จังหวัด</label>
                                                <InputThaiAddress.Province
                                                    // name="province"
                                                    value={formData.province || ''}
                                                    onChange={handleAddressChange('province')}
                                                    onSelect={handleSelect}
                                                    className="w-full"

                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">รหัสไปรษณีย์</label>
                                                <InputThaiAddress.Zipcode
                                                    // name="zipcode"
                                                    value={formData.zipcode || ''}
                                                    onChange={handleAddressChange('zipcode')}
                                                    onSelect={handleSelect}
                                                    className="w-full"

                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 text-right">
                                            <button
                                                type="button"
                                                onClick={handleUpdate}
                                                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg"
                                            >
                                                แก้ไขข้อมูลผู้ใช้งาน
                                            </button>
                                        </div>

                                    </form>
                                )}


                                {activeTab === 'security' && (
                                    <div className="space-y-6 max-w-lg">
                                        <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm mb-6">
                                            เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password ปัจจุบัน</label>
                                            <input
                                                type="password"
                                                value={passData.oldPass}
                                                onChange={(e) => setPassData({ ...passData, oldPass: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"

                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password ใหม่</label>
                                            <input
                                                type="password"
                                                value={passData.newPass}
                                                onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password ใหม่</label>
                                            <input
                                                type="password"
                                                value={passData.confirmPass}
                                                onChange={(e) => setPassData({ ...passData, confirmPass: e.target.value })}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        {passMsg.text && (
                                            <div className={`p-3 rounded-lg text-sm ${passMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {passMsg.text}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={handleChangePasswordInit}
                                                className="flex items-center px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg transition-all"
                                            >
                                                แก้ไข Password
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </>
                        )
                        }

                    </div>


                </main>


            </div>


            <ReAuthModal
                isOpen={isReAuthOpen}
                onClose={() => setIsReAuthOpen(false)}
                onConfirm={handleReAuthConfirm}
            />


        </div>
    );


}

export default EditProfileModal;