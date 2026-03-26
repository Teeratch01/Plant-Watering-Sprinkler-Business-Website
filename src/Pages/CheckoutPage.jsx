import React, { useState, useEffect, use } from 'react';
import Navbar from '../components/Navbar';
import { useCart } from '../components/CartContext';
import { CreditCard, QrCode, Building, MapPin, ChevronLeft, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CreateInput } from "thai-address-autocomplete-react";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from '../FirebaseConfig';
import QRCode_payment from '../assets/Checkout/QRCode_payment.jpg';
import emailjs from '@emailjs/browser';

const InputThaiAddress = CreateInput();

function CheckoutPage() {
    const { cartItems, getCartTotal, setCartItems } = useCart(); // ดึง setCartItems มาเผื่อเคลียร์ตะกร้า
    const navigate = useNavigate();

    // State สำหรับฟอร์ม
    const [paymentMethod, setPaymentMethod] = useState('card'); // card, qr, counter

    const [isEditing, setIsEditing] = useState(true);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [user, setUser] = useState(null);


    const [address, setAddress] = useState({
        district: '',
        amphoe: '',
        province: '',
        zipcode: ''
    });

    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        address: ''
    });

    const [cardData, setCardData] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardHolderName: ''
    });

    const handleCardInputChange = (e) => {
        let { name, value } = e.target;

        if (name === 'expiryDate') {
            const cleaned = value.replace(/\D/g, '');

            // 2. จำกัดตัวเลขไม่เกิน 4 ตัว (MMYY)
            const limited = cleaned.slice(0, 4);

            // 3. จัดรูปแบบ: ถ้าตัวเลขเกิน 2 ตัว ให้ใส่ / คั่นตรงกลาง
            if (limited.length >= 3) {
                value = `${limited.slice(0, 2)}/${limited.slice(2)}`;
            } else {
                value = limited;
            }
        }

        else if (name === 'cardNumber') {
            const cleaned = value.replace(/\D/g, ''); // เอาแต่เลข
            // แบ่งกลุ่มละ 4 ตัวแล้วคั่นด้วยช่องว่าง
            value = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
            // จำกัดความยาว (ปกติบัตร 16 หลัก รวมเว้นวรรคเป็น 19)
            if (value.length > 19) value = value.slice(0, 19);
        }

        // อัปเดต State
        setCardData({ ...cardData, [name]: value });
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setFormData({
                            name: data.firstname || '',
                            surname: data.surname || '',
                            email: data.email || user.email || '',
                            phone: data.phone || '',
                            address: data.address?.address || ''
                        });

                        if (data.address) {
                            setAddress({
                                amphoe: data.address.district || '',
                                district: data.address.sub_district || '',
                                province: data.address.province || '',
                                zipcode: data.address.zipcode || ''
                            });

                            setIsEditing(false);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user data: ", error);
                }
                setIsLoadingUser(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePurchase = async (e) => {
        e.preventDefault();

        // 1. Validation
        if (!formData.name || !formData.surname || !formData.phone || !formData.email || !address.district || !address.amphoe || !address.province || !address.zipcode) {
            toast.warn("กรุณากรอกข้อมูลที่อยู่และข้อมูลติดต่อให้ครบถ้วน");
            return;
        }

        if (paymentMethod === 'card') {
            if (!cardData.cardNumber || !cardData.expiryDate || !cardData.cvv || !cardData.cardHolderName) {
                toast.warn("กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน");
                return;
            }
        }

        if (cartItems.length === 0) {
            toast.warn("ตะกร้าสินค้าว่างเปล่า");
            return;
        }

        try {
            // เริ่มต้น Transaction
            const generatedOrderNumber = Date.now();
            const newOrderRef = doc(collection(db, "orders"));
            await runTransaction(db, async (transaction) => {

                // ---------------------------------------------------
                // PHASE 1: อ่านข้อมูลทั้งหมดก่อน (READ ONLY)
                // ---------------------------------------------------

                // ประกาศตัวแปร productsToUpdate ไว้ตรงนี้ (ภายใน transaction scope)
                const productsToUpdate = [];

                for (const item of cartItems) {
                    const productRef = doc(db, "products", item.id);
                    const productDoc = await transaction.get(productRef); // อ่าน

                    if (!productDoc.exists()) {
                        throw new Error(`ไม่พบสินค้า: ${item.ProductName}`);
                    }

                    const currentStock = Number(productDoc.data().Stock);
                    if (currentStock < item.quantity) {
                        throw new Error(`สินค้า "${item.ProductName}" มีไม่พอ (เหลือ ${currentStock} ชิ้น)`);
                    }

                    // เก็บข้อมูลไว้ก่อน "อย่าเพิ่งสั่ง update ตรงนี้"
                    productsToUpdate.push({
                        ref: productRef,
                        newStock: currentStock - item.quantity
                    });
                }

                // ---------------------------------------------------
                // PHASE 2: เขียนข้อมูลทั้งหมด (WRITE ONLY)
                // *ห้ามมีคำสั่ง get หรือ read หลังจากบรรทัดนี้เด็ดขาด*
                // ---------------------------------------------------

                // A. อัปเดต Stock สินค้า (วนลูปจากตัวแปรที่เก็บไว้)
                productsToUpdate.forEach((p) => {
                    transaction.update(p.ref, { Stock: p.newStock });
                });

                // B. เตรียมและบันทึกข้อมูล User
                const currentUser = auth.currentUser;
                // ถ้ามี User Login ให้ใช้ UID เดิม ถ้าไม่มีให้สร้าง ID ใหม่
                const userId = currentUser ? currentUser.uid : doc(collection(db, "users")).id;
                const userRef = doc(db, "users", userId);

                const userDataToSave = {
                    firstname: formData.name,
                    surname: formData.surname,
                    email: formData.email,
                    phone: formData.phone,
                    updatedAt: serverTimestamp(),
                    address: {
                        address: formData.address || "",
                        district: address.amphoe,          // แขวง/ตำบล
                        sub_district: address.district,        // เขต/อำเภอ
                        province: address.province,
                        zipcode: address.zipcode
                    }
                };

                if (!currentUser) {
                    userDataToSave.createdAt = serverTimestamp();
                }
                transaction.set(userRef, userDataToSave, { merge: true });

                // C. สร้าง Order

                const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
                const subtotal = getCartTotal();
                const discount = 0;
                const finalPrice = subtotal - discount;

                const orderData = {
                    OrderNumber: generatedOrderNumber,
                    UserID: userId,
                    OrderStatus: paymentMethod === 'qr' ? 'Payment In Progress' : 'Payment Success',
                    TotalQuantity: totalQty,
                    TotalPrice: finalPrice,
                    OrderDate: serverTimestamp(),

                    CustomerName: `${formData.name} ${formData.surname}`,
                    CustomerEmail: formData.email,
                    CustomerPhone: formData.phone,

                    ShippingAddress: {
                        Address: formData.address || "",      // บ้านเลขที่
                        SubDistrict: address.district,        // ตำบล/แขวง
                        District: address.amphoe,             // อำเภอ/เขต
                        Province: address.province,           // จังหวัด
                        Zipcode: address.zipcode              // รหัสไปรษณีย์
                    },

                    Items: cartItems.map(item => ({
                        ProductID: item.id,
                        ProductName: item.ProductName,
                        Price: item.Price,
                        Quantity: item.quantity,
                        ProductPic: Array.isArray(item.ProductPic) ? item.ProductPic[0] : item.ProductPic
                    }))
                };
                transaction.set(newOrderRef, orderData);

                // D. สร้าง Payment
                const newPaymentRef = doc(collection(db, "payments"));
                const paymentData = {
                    OrderID: newOrderRef.id,
                    Method: paymentMethod,
                    TotalPrice: finalPrice,
                    PaymentDate: serverTimestamp(),
                    Status: "Completed"
                };
                transaction.set(newPaymentRef, paymentData);
            });

            // --- Success Handling (ทำงานเมื่อ Transaction ผ่านฉลุย) ---


            // Email Sent Section
            const itemsText = cartItems.map(item =>
                `- ${item.ProductName} (จำนวน: ${item.quantity} ชิ้น) : ${(item.Price * item.quantity).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })} บาท`
            ).join('\n');

            const fullAddress = `${formData.address} ต.${address.district} อ.${address.amphoe} จ.${address.province} ${address.zipcode}`;

            let instructionMessage = '';
            if (paymentMethod === 'qr') {
                instructionMessage = '⚠️ สำคัญ: เนื่องจากคุณเลือกชำระเงินแบบโอนเงิน (QR Code) คำสั่งซื้อนี้จะสมบูรณ์ก็ต่อเมื่อคุณได้ "อัปโหลดสลิปโอนเงิน" แล้ว กรุณาเข้าสู่ระบบเว็บไซต์ และไปที่เมนู "Orders (ประวัติการสั่งซื้อ)" เพื่อแนบสลิปให้แอดมินตรวจสอบครับ';
            } else {
                instructionMessage = '✅ การชำระเงินผ่านบัตรเครดิต/เดบิตของคุณเสร็จสมบูรณ์แล้ว ทางเราได้รับยอดเงินและกำลังดำเนินการเตรียมจัดส่งสินค้าให้คุณโดยเร็วที่สุดครับ';
            }

            const templateParams = {
                customer_name: `${formData.name} ${formData.surname}`,
                customer_email: formData.email, // ต้องสร้างตัวแปรรับอีเมลใน EmailJS เป็น To Email: {{customer_email}}
                order_number: generatedOrderNumber,
                total_price: finalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                payment_method: paymentMethod === 'qr' ? 'โอนเงินผ่าน QR Code' : 'บัตรเครดิต/เดบิต',
                order_details: itemsText,
                shipping_address: fullAddress,
                payment_message: instructionMessage
            };

            emailjs.send(
                'service_ggjvrgp',
                'template_ba6dokd', // ใช้ Template ID ของ Order Confirmation
                templateParams,
                'l0FcJmRFJUKMjF1sG'
            ).catch((err) => console.error("EmailJS Error:", err));

            toast.success("สั่งซื้อสินค้าสำเร็จ!");
            setCartItems([]);
            localStorage.removeItem('shopping-cart');


            setTimeout(() => {
                navigate('/order-success', {
                    state: {
                        orderNumber: generatedOrderNumber,
                        orderId: newOrderRef.id,
                        paymentMethod: paymentMethod,
                        totalPrice: finalPrice
                    }
                });
            }, 1000);

        } catch (error) {
            console.error("Transaction failed: ", error);
            toast.error(error.message || "เกิดข้อผิดพลาดในการสั่งซื้อ");
        }
    };

    const handleAddressChange = (scope) => (value) => {
        setAddress((oldAddr) => ({
            ...oldAddr,
            [scope]: value
        }));
    }

    const handleSelect = (address) => {
        setAddress(address);
    };

    // คำนวณยอด
    const subtotal = getCartTotal();
    const discount = 0; // ใส่ Logic ส่วนลดตรงนี้ถ้ามี
    const finalPrice = subtotal - discount;

    const toggleEdit = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            toast.info("พร้อมสำหรับการแก้ไขข้อมูล");
        }
    }

    useEffect(() => {
        const inputs = document.querySelectorAll('.check-out-address input');
        if (inputs.length >= 4) {
            inputs[0].setAttribute('placeholder', 'อำเภอ/ เขต / District');
            inputs[1].setAttribute('placeholder', 'ตำบล / แขวง /Sub-district');
            inputs[2].setAttribute('placeholder', 'จังหวัด / Province');
            inputs[3].setAttribute('placeholder', 'รหัสไปรษณีย์ / Zipcode');
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-12 max-w-6xl">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 decoration-4 decoration-gray-300 underline-offset-8">
                        ชำระเงินและที่อยู่จัดส่ง
                    </h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* --- Left Column: Forms (formData & Payment) --- */}
                    <div className="flex-1 w-full space-y-6">

                        {/* 1. Shipping formData Section */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">

                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <MapPin className="text-blue-600" /> ที่อยู่จัดส่ง
                                </h2>
                                {user && (
                                    <button
                                        onClick={toggleEdit}
                                        className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg transition
                                        ${isEditing
                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {isEditing ? <><Check size={16} /> เสร็จสิ้น</> : <><Edit2 size={16} /> แก้ไขข้อมูล</>}
                                    </button>)}

                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                                    <input
                                        type="text" name="name" placeholder="ระบุชื่อผู้รับ"
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 border rounded-lg outline-none transition ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                        value={formData.name} onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                                    <input
                                        type="text" name="surname" placeholder="ระบุนามสกุลผู้รับ"
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 border rounded-lg outline-none transition ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                        value={formData.surname} onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text" name="phone" placeholder="0xx-xxx-xxxx"
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 border rounded-lg outline-none transition ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                        value={formData.phone} onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                    <input
                                        type="text" name="email" placeholder="xxxxxxxx@xxxx.xx"
                                        disabled={!isEditing || user}  // ถ้ามี user จะไม่ให้แก้ไข email
                                        className={`w-full px-4 py-3 border rounded-lg outline-none transition 
                                            ${(!isEditing || user)
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                                                : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                        value={formData.email} onChange={handleInputChange}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
                                    <input
                                        type="text" name="address" placeholder="บ้านเลขที่ / หมู่บ้าน / ซอย / ถนน"
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-3 border rounded-lg outline-none transition ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500'}`}
                                        value={formData.address} onChange={handleInputChange}
                                    />
                                </div>

                                <div className={`grid grid-cols-2 gap-x-4 gap-y-6 md:col-span-2 check-out-address mb-4 ${!isEditing ? 'pointer-events-none opacity-70' : ''}`}>
                                    <div>
                                        <label className="block text-gray-700 font-medium text-sm mb-1">เขค/อำเภอ</label>


                                        <InputThaiAddress.Amphoe
                                            value={address['amphoe']}
                                            onChange={handleAddressChange('amphoe')}
                                            onSelect={handleSelect}
                                            className={`w-full ${!isEditing ? 'bg-gray-100' : ''}`}
                                            placeholder='Amphoe'
                                            required
                                        />

                                    </div>
                                    <div>

                                        <label className="block text-gray-700 font-medium text-sm mb-1">แขวง/ตำบล</label>

                                        <InputThaiAddress.District
                                            value={address['district']}
                                            onChange={handleAddressChange('district')}
                                            onSelect={handleSelect}
                                            className={`w-full ${!isEditing ? 'bg-gray-100' : ''}`}
                                            placeholder='District'
                                            required
                                        />

                                    </div>

                                    <div>
                                        <label className="block text-gray-700 font-medium text-sm mb-1 mt-3">จังหวัด</label>
                                        <InputThaiAddress.Province
                                            value={address['province']}
                                            onChange={handleAddressChange('province')}
                                            onSelect={handleSelect}
                                            className={`w-full ${!isEditing ? 'bg-gray-100' : ''}`}
                                            placeholder='Province'
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium text-sm mb-1 mt-3">รหัสไปรษณีย์</label>
                                        <InputThaiAddress.Zipcode
                                            value={address['zipcode']}
                                            onChange={handleAddressChange('zipcode')}
                                            onSelect={handleSelect}
                                            className={`w-full ${!isEditing ? 'bg-gray-100' : ''}`}
                                            placeholder='Zipcode'
                                            required
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* 2. Payment Method Section */}
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <CreditCard className="text-blue-600" /> วิธีชำระเงิน
                            </h2>

                            <div className="space-y-3">
                                {/* Option 1: Credit Card */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio" name="payment" value="card"
                                        checked={paymentMethod === 'card'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-md border border-gray-200"><CreditCard size={20} /></div>
                                        <span className="font-semibold text-gray-700">Credit / Debit Card</span>
                                    </div>
                                </label>

                                {/* Form Credit Card (Show only if selected) */}
                                {paymentMethod === 'card' && (
                                    <div className="ml-9 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4 animate-fade-in">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number</label>
                                            <input
                                                type="text"
                                                name="cardNumber"
                                                value={cardData.cardNumber}
                                                onChange={handleCardInputChange}
                                                placeholder="xxxx xxxx xxxx xxxx"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                                                <input
                                                    type="text"
                                                    name="expiryDate"
                                                    value={cardData.expiryDate}
                                                    onChange={handleCardInputChange}
                                                    placeholder="MM/YY"
                                                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white" />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                                                <input
                                                    type="text"
                                                    name="cvv"
                                                    value={cardData.cvv}
                                                    onChange={handleCardInputChange}
                                                    placeholder="123"
                                                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Holder Name</label>
                                            <input
                                                type="text"
                                                name="cardHolderName"
                                                value={cardData.cardHolderName}
                                                onChange={handleCardInputChange}
                                                placeholder="Name on card"
                                                className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white" />
                                        </div>
                                    </div>
                                )}

                                {/* Option 2: QR Payment */}
                                <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${paymentMethod === 'qr' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio" name="payment" value="qr"
                                        checked={paymentMethod === 'qr'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-md border border-gray-200"><QrCode size={20} /></div>
                                        <span className="font-semibold text-gray-700">QR Payment</span>
                                    </div>
                                </label>

                                {/* ส่วนแสดงรูปและรายละเอียด (ย้ายลงมาข้างล่าง ตรงนี้!) */}
                                {paymentMethod === 'qr' && (
                                    <div className="ml-9 mt-3 p-6 bg-white rounded-lg border border-gray-200 flex flex-row items-center gap-6 animate-fade-in shadow-sm">

                                        {/* รูป QR Code */}
                                        <div className="bg-white p-2 rounded-xl border border-gray-200 shrink-0">
                                            <img
                                                src={QRCode_payment}
                                                alt="QR Payment"
                                                className="w-64 h-auto object-contain"
                                            />
                                        </div>

                                        {/* รายละเอียดบัญชี (อยู่ด้านขวาของ QR) */}
                                        <div className="text-sm text-gray-600 space-y-2">
                                            <p><span className="font-bold text-gray-800">พร้อมเพย์</span> นาย ธีรัช จิตต์อารี</p>
                                            <p><span className="font-bold text-gray-800">ธนาคาร:</span> กรุงไทย (KTB)</p>
                                            <p><span className="font-bold text-gray-800">เลขที่พร้อมเพย์:</span> 083-047-8226</p>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Purchase Button (Mobile only - optional) */}
                    </div>


                    {/* --- Right Column: Order Summary --- */}
                    <div className="w-full lg:w-96 sticky top-24">
                        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                                รายการสินค้า
                            </h2>

                            {/* Cart Items List */}
                            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                                            <img
                                                src={Array.isArray(item.ProductPic) ? item.ProductPic[0] : (item.ProductPic || "https://placehold.co/100")}
                                                alt={item.ProductName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{item.ProductName}</h4>
                                            <p className="text-xs text-gray-500 mt-1">จำนวน: {item.quantity}</p>
                                        </div>
                                        <div className="text-sm font-bold text-gray-700">
                                            {Number(item.Price * item.quantity).toLocaleString('th-TH', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Price Breakdown */}
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>ราคารวมทั้งหมด :</span>
                                    <span>{subtotal.toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} บาท</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>ส่วนลด :</span>
                                    <span>{discount.toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} บาท</span>
                                </div>

                                <div className="border-t-2 border-gray-200 pt-4 mt-2 flex justify-between items-center">
                                    <span className="text-base font-bold text-gray-900">ราคาสุทธิที่ต้องชำระ :</span>
                                    <span className="text-xl font-bold text-gray-900">{finalPrice.toLocaleString('th-TH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} บาท</span>
                                </div>
                            </div>

                            {/* Purchase Button */}
                            <button
                                onClick={handlePurchase}
                                className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 active:scale-95"
                            >
                                สั่งซื้อสินค้า
                            </button>

                            <button
                                onClick={() => navigate('/cart')}
                                className="w-full mt-4 text-gray-500 text-sm hover:text-black flex items-center justify-center gap-1"
                            >
                                <ChevronLeft size={16} /> กลับไปที่ตะกร้าสินค้า
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default CheckoutPage;