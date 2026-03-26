import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Check, ShoppingBag, Home, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../FirebaseConfig';
import { toast } from 'react-toastify';

function OrderSuccessPage() {

    const location = useLocation();
    const navigate = useNavigate();
    const { orderNumber, orderId, paymentMethod, totalPrice } = location.state || {};

    const [slipFile, setSlipFile] = useState(null);
    const [slipPreview, setSlipPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSlipFile(file);
            setSlipPreview(URL.createObjectURL(file)); // สร้าง URL จำลองให้รูปขึ้นพรีวิว
        }
    };

    const handleUploadSlip = async () => {

        if (!slipFile) {
            toast.error("กรุณาเลือกรูปภาพสลิปก่อนอัปโหลด");
            return;
        }
        if (!orderId) {
            toast.error("ไม่พบรหัสคำสั่งซื้อ ไม่สามารถอัปโหลดได้");
            return;
        }
        setIsUploading(true);
        try {
            const storageRef = ref(storage, `payment_slips/${orderId}_${Date.now()}`);
            await uploadBytes(storageRef, slipFile);
            const downloadURL = await getDownloadURL(storageRef);

            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, {
                PaymentSlipUrl: downloadURL,
                OrderStatus: 'Payment In Progress', // เปลี่ยนสถานะเป็น รอตรวจสอบสลิป
                UpdatedAt: new Date()
            });
            setIsUploaded(true);
            toast.success("อัปโหลดสลิปสำเร็จ ระบบกำลังตรวจสอบการชำระเงิน");

        }
        catch (error) {
            console.error("Error uploading slip: ", error);
            toast.error("เกิดข้อผิดพลาดในการอัปโหลดสลิป");
        }
        finally {
            setIsUploading(false);
        }
    }




    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-16 flex flex-col items-center">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 decoration-4 decoration-gray-300 underline underline-offset-8">
                        {paymentMethod === 'qr' && !isUploaded
                            ? 'รอการยืนยันการชำระเงิน'
                            : 'ขอบคุณสำหรับการสั่งซื้อ'}
                    </h1>
                </div>

                <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 max-w-lg w-full text-center animate-fade-in-up">

                    {/* 🌟 4. เช็คว่าถ้าจ่ายด้วย QR และยังไม่ได้อัปโหลดสลิป ให้โชว์หน้าอัปโหลด */}
                    {paymentMethod === 'qr' && !isUploaded ? (
                        <>
                            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Clock size={48} className="text-yellow-500 drop-shadow-sm" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">สถานะ: อยู่ระหว่างดำเนินการ</h2>

                            {totalPrice && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg py-3 px-4 mb-4 inline-block">
                                    <p className="text-gray-600 text-sm">ยอดที่ต้องชำระ</p>
                                    <p className="text-2xl font-black text-blue-600">฿{Number(totalPrice).toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}</p>
                                </div>
                            )}
                            <p className="text-gray-500 mb-6">กรุณาแนบสลิปโอนเงิน เพื่อให้ผู้ดูแลระบบตรวจสอบและยืนยันคำสั่งซื้อของคุณภายใน 24 ชั่วโมงหลังจากดำเนินการสั่งซื้อ</p>

                            {/* กล่องอัปโหลด */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-6 bg-gray-50 relative hover:bg-gray-100 transition">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {slipPreview ? (
                                    <div className="flex flex-col items-center">
                                        <img src={slipPreview} alt="Slip" className="h-40 object-contain mb-3 rounded-lg shadow-sm" />
                                        <p className="text-sm text-blue-600 font-medium">คลิกเพื่อเปลี่ยนรูป</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon size={40} className="mb-2" />
                                        <p className="text-sm font-medium">คลิกหรือลากไฟล์สลิปมาวางที่นี่</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleUploadSlip}
                                disabled={isUploading || !slipFile}
                                className="w-full mb-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition"
                            >
                                {isUploading ? 'กำลังอัปโหลด...' : <><Upload size={20} /> ยืนยันการโอนเงิน</>}
                            </button>
                        </>
                    ) : (
                        /* 🌟 5. ถ้าจ่ายด้วยวิธีอื่น หรือ อัปโหลดสลิปเสร็จแล้ว ให้โชว์หน้าสำเร็จปกติ */
                        <>
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Check size={48} className="text-green-500 drop-shadow-sm" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">
                                {isUploaded ? 'ส่งสลิปสำเร็จ!' : 'สั่งซื้อสำเร็จ!'}
                            </h2>
                            <p className="text-gray-500 mb-6">
                                {isUploaded
                                    ? 'ทางเรากำลังตรวจสอบสลิปโอนเงินของคุณ และจะดำเนินการในลำดับถัดไป'
                                    : 'เราได้รับคำสั่งซื้อของคุณเรียบร้อยแล้ว กำลังเตรียมจัดส่งสินค้า'}
                            </p>
                        </>
                    )}

                    {/* แสดงหมายเลข Order */}
                    {orderNumber && (
                        <div className="bg-gray-50 py-3 px-4 rounded-lg mb-8 inline-block border border-gray-100">
                            <span className="text-gray-500 text-sm">หมายเลขคำสั่งซื้อ: </span>
                            <span className="font-mono font-bold text-gray-800 tracking-wider">{orderNumber}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/products')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95"
                        >
                            <ShoppingBag size={20} /> เลือกซื้อสินค้าต่อ
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                        >
                            <Home size={20} /> กลับหน้าหลัก
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default OrderSuccessPage;