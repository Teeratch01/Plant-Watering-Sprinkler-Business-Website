import React, { use, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { MapPin, Phone, Mail, Clock, Send, Facebook, Instagram, Twitter, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { siFacebook, siInstagram } from 'simple-icons';
import { auth ,db} from '../FirebaseConfig';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';


function ContactUsPage() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        details: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        const fullName = `${data.firstname || ''} ${data.surname || ''}`.trim();

                        setFormData(prev => ({
                            ...prev,
                            name: fullName || currentUser.displayName || '',
                            email: currentUser.email || '',
                            phone: data.phone || ''
                        }));
                    }
                } catch (error) {
                    console.error("Error fetching user data", error);
                }
            }
        });
        return () => unsubscribe();

    }, []);

    const handleChatClick = () => {
        if (auth.currentUser) {
            navigate('/chat');
        } else {
            toast.info("กรุณาเข้าสู่ระบบเพื่อใช้งานแชต");
            navigate('/login');
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        };
    

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.details) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "support_requests"), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || '',
                details: formData.details,
                userID: auth.currentUser ? auth.currentUser.uid : 'guest',
                status: 'pending',
                createdAt: serverTimestamp()
            });
            toast.success("ส่งคำขอเรียบร้อยแล้ว ทางเราจะติดต่อกลับโดยเร็วที่สุด");

            setFormData(prev => ({
                ...prev,
                phone: '',
                details: ''
            }));
        } catch (error) {
            console.error("Error submitting support request", error);
            toast.error("เกิดข้อผิดพลาดในการส่งคำขอ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Navbar />

            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 py-12 md:py-16">
                <div className="container mx-auto px-4 text-center animate-fade-in-up">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">ติดต่อเรา (Contact Us)</h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                        หากมีข้อสงสัยเกี่ยวกับสินค้าหรือบริการ สามารถติดต่อเราได้ตามช่องทางด้านล่าง หรือส่งข้อความหาเราได้ทันที
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 max-w-6xl">

                <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-start">

                    {/* --- Left Column: Contact Info --- */}
                    <div className="w-full lg:w-1/3 bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in-up h-fit">
                        <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">
                            ข้อมูลการติดต่อ
                        </h2>

                        <div className="space-y-6">
                            {/* Address */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">ที่อยู่ (Address)</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        65 ซอยศาลธนบุรี 17 แยก 7  <br />
                                        แขวงบางหว้า เขตภาษีเจริญ<br />
                                        กรุงเทพมหานคร 10160
                                    </p>
                                </div>
                            </div>

                            {/* Phone & Email */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">เบอร์โทรศัพท์</h3>
                                    <p className="text-gray-600 text-sm hover:text-green-600 transition"> 080-082-1331, 084-325-1666</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">อีเมล</h3>
                                    <p className="text-gray-600 text-sm hover:text-red-500 transition">pwsbs1@outlook.com</p>
                                </div>
                            </div>

                            {/* Business Hours */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center shrink-0">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">เวลาทำการ</h3>
                                    <p className="text-gray-600 text-sm">จันทร์ - ศุกร์: 09:00 - 18:00 น.</p>
                                    <p className="text-gray-500 text-xs">(หยุดวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)</p>
                                </div>
                            </div>
                        </div>

                        {/* Social Media */}
                        <div className="mt-10 pt-6 border-t border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Social Media</h3>

                            <div className="flex gap-3">
                                <a href="https://www.facebook.com/sprinklerntk/" className="w-10 h-10 bg-gray-100 hover:bg-blue-500 hover:text-white text-gray-600 rounded-full flex items-center justify-center transition">

                                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg>

                                </a>
                                <a href="https://www.instagram.com/sprinkler_ntk/" className="w-10 h-10 bg-gray-100 hover:bg-pink-500 hover:text-white text-gray-600 rounded-full flex items-center justify-center transition">
                                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Instagram</title><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" /></svg>
                                </a>
                                {/* <a href="#" className="w-10 h-10 bg-gray-100 hover:bg-black hover:text-white text-gray-600 rounded-full flex items-center justify-center transition">
                                     <Twitter si
                                     
                                     ze={20} />
                                 </a> */}


                            </div>


                        </div>

                    </div>

                    <div className=" lg:w-2/3 flex flex-col gap-4">
                        <iframe
                            className='bg-white p-4 rounded-2xl shadow-sm border border-gray-200 animate-fade-in-up delay-200 w-fill'
                            title="Google Map"
                            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7752.800039562374!2d100.4319846116023!3d13.69420570071332!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e297fde0a2fb77%3A0xf94076dcfb64beae!2z4Lia4Lij4Li04Lip4Lix4LiXIOC4meC4p-C4mOC4suC4meC4teC4geC4tOC4leC4leC4tCDguIjguLPguIHguLHguJQ!5e0!3m2!1sen!2sth!4v1770795933584!5m2!1sen!2sth"
                            width="100%" height="500" style={{ border: 0, borderRadius: '1rem' }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade">
                        </iframe>

                        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in-up delay-300">
                            <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">ติดต่อเรา</h2>
                                    <p className="text-sm text-gray-500">กรุณากรอกข้อมูลไว้และทางเราจะติดต่อกลับหาคุณโดยเร็วที่สุด</p>
                                </div>
                            
                                <button
                                    onClick={handleChatClick}
                                    className="hidden md:flex bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2 px-4 rounded-lg transition items-center gap-2 text-sm"
                                >
                                    <MessageCircle size={18} /> สอบถามผ่านแชตทันที
                                </button>
                            </div>



                            <form onSubmit={handleSubmitForm} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" name="name" required
                                            value={formData.name} onChange={handleChange}
                                            placeholder="ชื่อ - นามสกุล"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล <span className="text-red-500">*</span></label>
                                        <input
                                            type="email" name="email" required
                                            value={formData.email} onChange={handleChange}
                                            placeholder="example@mail.com"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text" name="phone"
                                        value={formData.phone} onChange={handleChange}
                                        placeholder="08X-XXX-XXXX"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดเพิ่มเติม <span className="text-red-500">*</span></label>
                                    <textarea
                                        name="details" required rows="4"
                                        value={formData.details} onChange={handleChange}
                                        placeholder="พิมพ์ข้อความ แจ้งปัญหา หรือข้อเสนอแนะที่นี่..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gray-800 hover:bg-black text-white font-bold py-3 px-8 rounded-lg shadow-md transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                >
                                    {isSubmitting ? (
                                        <span className="animate-pulse">กำลังส่ง...</span>
                                    ) : (
                                        <>
                                            <Send size={18} /> ยืนยันการส่ง
                                        </>
                                    )}
                                </button>
                            </form>



                            <button
                                onClick={handleChatClick}
                                className="md:hidden w-full mt-4 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                            >
                                <MessageCircle size={18} /> สอบถามผ่านแชตทันที
                            </button>

                        </div>



                    </div>








                </div>






            </div>

        </div>
    );

}

export default ContactUsPage;