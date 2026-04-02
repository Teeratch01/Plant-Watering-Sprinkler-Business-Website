import React, { useState, useEffect, useRef, use } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import { Search, Plus, MoreHorizontal, Edit, DollarSign, Package, Activity, X, ImagePlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { onAuthStateChanged } from 'firebase/auth';


function AdminProductPage() {

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [currentUser, setCurrentUser] = useState(null);

    const [openDropdownId, setOpenDropdownId] = useState(null);
    const dropdownRef = useRef(null);

    const [requests, setRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('PRODUCTS');

    const [modalState, setModalState] = useState({
        type: null,
        isOpen: false,
        selectedProduct: null,
        selectedRequest: null
    });

    const [formData, setFormData] = useState({
        ProductName: '', ProductCategory: '', CostPrice: 0, Price: 0,
        ProductDetail: '', AreaType: [], PlantType: [], Pressure: 'Low',
        Stock: 0, YoutubeURL: '-', ProductStatus: 'Active'
    });

    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingImages, setExistingImages] = useState([]);

    const areaOptions = ["สวนหน้าบ้าน/จัดสวน", "สวนเกษตรขนาดใหญ่", "โรงเรือนเพาะชำ", "ไร่พืช/สวนผลไม้", "สนามหญ้า/สนามฟุตบอล"];
    const plantOptions = ["ไม้ดอก/ไม้ประดับ", "ผักสวนครัว", "สนามหญ้า", "ไม้ผล (ทุเรียน/เงาะ)", "พืชไร่ (ข้าวโพด/อ้อย)"];

    // --- ฟังก์ชันจัด Format ราคาให้มี .00 เสมอ ---
    const formatPriceDisplay = (price) => {
        return Number(price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // ==========================================
    // 1. ตรวจสอบสถานะ User และ Role
    // ==========================================
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docSnap = await getDoc(doc(db, 'users', user.uid));
                if (docSnap.exists()) {
                    setCurrentUser({ uid: user.uid, ...docSnap.data() });
                }
            } else {
                setCurrentUser(null);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // ==========================================
    // 2. ดึงข้อมูลรายการสินค้า (Products)
    // ==========================================
    useEffect(() => {
        const q = query(collection(db, 'products'));
        const unsubscribeProducts = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setLoading(false);
        });
        return () => unsubscribeProducts();
    }, []);

    // ==========================================
    // 3. ดึงข้อมูลคำขออนุมัติ
    // ==========================================
    useEffect(() => {
        if (currentUser?.role === 'adminManager') {
            const q = query(collection(db, 'admin_requests'), where('status', '==', 'PENDING'));
            const unsubscribeRequests = onSnapshot(q, (snapshot) => {
                console.log("พบรายการรออนุมัติ: ", snapshot.docs.length, " รายการ");
                setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(req => req.type && req.type.startsWith('PRODUCT_')));
            }, (error) => {
                console.error("เกิดข้อผิดพลาดในการดึงข้อมูล Request: ", error);
            });

            return () => unsubscribeRequests();
        } else {
            setRequests([]);
        }
    }, [currentUser]);

    // ==========================================
    // 4. จัดการการคลิกพื้นที่ว่างเพื่อปิด Dropdown
    // ==========================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isManager = currentUser?.role === 'adminManager';
    const categories = ['All', ...new Set(products.map(p => p.ProductCategory).filter(Boolean))];

    const openModal = (type, product = null, request = null) => {
        setOpenDropdownId(null);
        if (product) {
            setFormData({
                ProductName: product.ProductName || '',
                ProductCategory: product.ProductCategory || '',
                CostPrice: product.CostPrice || 0,
                Price: product.Price || 0,
                ProductDetail: product.ProductDetail || '',
                Pressure: product.Pressure || 'Low',
                Stock: product.Stock || 0,
                ReasonSelect: '',
                ReasonDetail: '',
                YoutubeURL: product.YoutubeURL || '',
                ProductStatus: product.ProductStatus || 'Active',
                AreaType: Array.isArray(product.AreaType) ? product.AreaType : [],
                PlantType: Array.isArray(product.PlantType) ? product.PlantType : []
            });
            if (product.ProductPic) {
                setExistingImages(Array.isArray(product.ProductPic) ? product.ProductPic : [product.ProductPic]);
            } else {
                setExistingImages([]);
            }
        } else {
            setFormData({
                ProductName: '', ProductCategory: '', CostPrice: 0, Price: 0,
                ProductDetail: '', AreaType: [], PlantType: [], Pressure: 'Low',
                Stock: 0, ReasonSelect: '', ReasonDetail: '', YoutubeURL: '-', ProductStatus: 'Active'
            });
            setImageFiles([]);
            setImagePreviews([]);
        }
        setModalState({ type, isOpen: true, selectedProduct: product, selectedRequest: request });
    }

    const closeModal = () => {
        setModalState({ type: null, isOpen: false, selectedProduct: null, selectedRequest: null });
        setImageFiles([]);
        setImagePreviews([]);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setImageFiles(files);
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(previews);
    };

    const handleUploadImages = async (targetId) => {
        if (imageFiles.length === 0) return [];
        const imageUrls = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const storageRef = ref(storage, `Product IMG/${targetId}/${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
        }
        return imageUrls;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { type, selectedProduct } = modalState;

        try {
            if (type === 'INFO') {
                const updateData = {
                    ProductName: formData.ProductName,
                    ProductDetail: formData.ProductDetail,
                    ProductCategory: formData.ProductCategory,
                    YoutubeURL: formData.YoutubeURL,
                    Pressure: formData.Pressure,
                    AreaType: formData.AreaType,
                    PlantType: formData.PlantType,
                }
                await updateDoc(doc(db, 'products', selectedProduct.id), updateData);
                toast.success('แก้ไขข้อมูลสินค้าสำเร็จ');
                closeModal();
                setIsSubmitting(false);
                return;
            }
            if (type === 'IMAGE') {
                let newUploadedUrls = [];
                if (imageFiles.length > 0) {
                    newUploadedUrls = await handleUploadImages(selectedProduct.id);
                }
                const finalImages = [...existingImages, ...newUploadedUrls];
                await updateDoc(doc(db, "products", selectedProduct.id), { ProductPic: finalImages });
                toast.success('อัปเดตรูปภาพสินค้าสำเร็จ');
                closeModal();
                setIsSubmitting(false);
                return;
            }

            let requestData = {};
            let actionText = '';

            const newProductRef = doc(collection(db, "products"));
            const targetProductId = selectedProduct ? selectedProduct.id : newProductRef.id;

            if (type === 'ADD') {
                actionText = 'เพิ่มสินค้าใหม่';
                const uploadedPicUrls = await handleUploadImages(targetProductId);
                requestData = {
                    ...formData,
                    CostPrice: Number(formData.CostPrice),
                    Price: Number(formData.Price),
                    Stock: Number(formData.Stock),
                    AreaType: formData.AreaType,
                    PlantType: formData.PlantType,
                    ProductPic: uploadedPicUrls
                };
            }
            else if (type === 'PRICE') {
                actionText = 'แก้ไขราคา';
                requestData = {
                    NewPrice: Number(formData.Price),
                    OldPrice: Number(selectedProduct.Price)
                };
            }
            else if (type === 'STOCK') {
                actionText = 'แก้ไขจำนวนสินค้า';
                const finalReason = formData.ReasonSelect === 'อื่นๆ' ? formData.ReasonDetail : formData.ReasonSelect;
                requestData = {
                    Stock: Number(formData.Stock),
                    Reason: finalReason
                };
            }
            else if (type === 'STATUS') {
                actionText = 'แก้ไขสถานะสินค้า';
                requestData = { ProductStatus: formData.ProductStatus };
            }

            if (isManager) {
                if (type === 'ADD') {
                    await setDoc(newProductRef, requestData);
                }
                else if (type === 'STOCK') {
                    await updateDoc(doc(db, 'products', selectedProduct.id), { Stock: requestData.Stock });
                    await addDoc(collection(db, "stock_transactions"), {
                        productId: selectedProduct.id,
                        productName: formData.ProductName,
                        oldStock: selectedProduct.Stock,
                        newStock: requestData.Stock,
                        reason: requestData.Reason,
                        actionBy: currentUser.uid,
                        actionByName: `${currentUser.firstname} ${currentUser.surname || ''}`,
                        actionType: 'DIRECT_EDIT',
                        createdAt: serverTimestamp()
                    });
                }
                else if (type === 'PRICE') {
                    await updateDoc(doc(db, 'products', selectedProduct.id), {
                        Price: requestData.NewPrice
                    });
                }
                else {
                    await updateDoc(doc(db, 'products', selectedProduct.id), requestData);
                }
                toast.success(`${actionText} สำเร็จ`);
            } else {
                await addDoc(collection(db, "admin_requests"), {
                    type: `PRODUCT_${type}`,
                    targetProductId: targetProductId,
                    targetProductName: formData.ProductName,
                    data: requestData,
                    requestedBy: currentUser.uid,
                    requestedByName: `${currentUser.firstname} ${currentUser.surname || ''}`,
                    status: 'PENDING',
                    createdAt: serverTimestamp()
                });
                toast.success(`ส่งคำขอ ${actionText} สำเร็จ รอการอนุมัติจากผู้จัดการ`);
            }

            closeModal();
        } catch (error) {
            console.error(error);
            toast.error(`เกิดข้อผิดพลาดในการ ${actionText}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.ProductName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id?.includes(searchTerm);

        const matchesCategory = selectedCategory === 'All' || product.ProductCategory === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        const stockA = Number(a.Stock || 0);
        const stockB = Number(b.Stock || 0);

        const getStockPriority = (stock) => {
            if (stock === 0) return 0;
            if (stock < 5) return 1;
            return 2;
        };

        const priorityA = getStockPriority(stockA);
        const priorityB = getStockPriority(stockB);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return a.ProductName?.localeCompare(b.ProductName || '') || 0;
    });

    const handleCheckboxChange = (field, value) => {
        setFormData(prev => {
            const currentArray = prev[field] || [];
            if (currentArray.includes(value)) {
                return { ...prev, [field]: currentArray.filter(v => v !== value) };
            } else {
                return { ...prev, [field]: [...currentArray, value] };
            }
        });
    };

    const handleApproveRequest = async (request) => {
        try {
            if (request.type === 'PRODUCT_ADD') {
                await setDoc(doc(db, "products", request.targetProductId), request.data);
            }
            else if (request.type === 'PRODUCT_STOCK') {
                const originalProduct = products.find(p => p.id === request.targetProductId);

                await updateDoc(doc(db, 'products', request.targetProductId), { Stock: request.data.Stock });
                await addDoc(collection(db, "stock_transactions"), {
                    productId: request.targetProductId,
                    productName: request.targetProductName,
                    oldStock: originalProduct?.Stock || 0,
                    newStock: request.data.Stock,
                    reason: request.data.Reason,
                    actionBy: currentUser.uid,
                    actionByName: `${currentUser.firstname} ${currentUser.surname || ''}`,
                    requestedBy: request.requestedByName,
                    actionType: 'APPROVED_REQUEST',
                    createdAt: serverTimestamp()
                });
            }
            else if (request.type === 'PRODUCT_PRICE') {
                await updateDoc(doc(db, 'products', request.targetProductId), {
                    Price: request.data.NewPrice
                });
            }
            else {
                await updateDoc(doc(db, 'products', request.targetProductId), request.data);
            }

            await updateDoc(doc(db, 'admin_requests', request.id), {
                status: 'APPROVED',
                updatedAt: serverTimestamp()
            });
            toast.success('อนุมัติรายการสำเร็จ ข้อมูลอัปเดตลงคลังสินค้าแล้ว');
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาดในการอนุมัติ');
        }
    }

    const handleRejectRequest = async (requestId) => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำขอรายการนี้?')) {
            try {
                await updateDoc(doc(db, 'admin_requests', requestId), {
                    status: 'REJECTED',
                    updatedAt: serverTimestamp()
                });
                toast.success('ปฏิเสธรายการคำขอสำเร็จ');
            } catch (error) {
                console.error(error);
                toast.error('เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
            }
        }
    }

    const getRequestDetails = (req) => {

        const originalProduct = products.find(p => p.id === req.targetProductId);

        switch (req.type) {
            case 'PRODUCT_PRICE':
                return (
                    <div className="flex items-center gap-2">
                        {/* ใช้ฟังก์ชัน formatPriceDisplay ตรงนี้ */}
                        <span className="text-gray-400 line-through">฿{formatPriceDisplay(originalProduct?.Price)}</span>
                        <span className="text-green-600 font-bold">➔ ฿{formatPriceDisplay(req.data.NewPrice)}</span>
                    </div>
                );
            case 'PRODUCT_STOCK':
                return (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 line-through">{originalProduct?.Stock || 0} ชิ้น</span>
                            <span className="text-blue-600 font-bold">➔ {req.data.Stock} ชิ้น</span>
                        </div>
                        {req.data.Reason && (
                            <div className="text-[11px] text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                <span className="font-bold text-gray-700">เหตุผล:</span> {req.data.Reason}
                            </div>
                        )}
                    </div>
                );
            case 'PRODUCT_STATUS':
                return (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400 line-through">{originalProduct?.ProductStatus || 'Active'}</span>
                        <span className="text-orange-600 font-bold">➔ {req.data.ProductStatus}</span>
                    </div>
                );
            case 'PRODUCT_ADD':
                return (
                    <div className="flex flex-col gap-2">
                        <div className="text-emerald-600 text-xs font-semibold">
                            เพิ่มสินค้าใหม่ (ราคา: ฿{formatPriceDisplay(req.data.Price)} | สต็อก: {req.data.Stock})
                        </div>
                        <button
                            onClick={() => openModal('VIEW_ADD_DETAILS', null, req)}
                            className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded hover:bg-emerald-100 transition w-fit flex items-center gap-1 shadow-sm font-bold"
                        >
                            <Search size={12} /> ดูรายละเอียดสินค้า
                        </button>
                    </div>
                );

            default:
                return <span className="text-gray-400">-</span>;
        }
    }

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

    const insertKeyword = (keyword) => {
        setFormData(prev => {
            const currentText = prev.ProductDetail || '';
            const newText = currentText.length > 0 ? `${currentText}\n\n${keyword}\n` : `${keyword}\n`;
            return { ...prev, ProductDetail: newText };
        });
    };

    const detailKeywords = ["คุณสมบัติ", "วิธีใช้งาน", "คำแนะนำ", "ข้อควรระวัง", "รายละเอียดสินค้า", "ข้อมูลทางเทคนิค", "ข้อมูลจำเพาะ", "ขนาดมิติ"];


    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-800 flex flex-col">
            <AdminNavbar />

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* --- แก้ไขส่วน Header ตรงนี้ --- */}
                <div className="flex flex-col gap-4 mb-6">

                    {/* แถวที่ 1: ชื่อหน้า (และปุ่ม Add Product กรณีไม่ใช่ Manager) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900">จัดการข้อมูลสินค้า (Product Management)</h1>

                        {/* สำหรับ Admin ทั่วไป (ที่ไม่มี Tabs) ให้ดึงปุ่มมาไว้บรรทัดเดียวกับหัวข้อเลย */}
                        {!isManager && activeTab === 'PRODUCTS' && (
                            <button onClick={() => openModal('ADD')} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm">
                                <Plus size={16} /> เพิ่มสินค้า
                            </button>
                        )}
                    </div>

                    {/* แถวที่ 2: เมนู Tabs และ ปุ่ม Add Product (จะแสดงเฉพาะ Manager เท่านั้น) */}
                    {isManager && (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            {/* ฝั่งซ้าย: เมนู Tabs */}
                            <div className="flex bg-gray-200 p-1 rounded-lg w-fit">
                                <button
                                    onClick={() => setActiveTab('PRODUCTS')}
                                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${activeTab === 'PRODUCTS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    คลังสินค้า
                                </button>
                                <button
                                    onClick={() => setActiveTab('REQUESTS')}
                                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition flex items-center gap-2 ${activeTab === 'REQUESTS' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    รออนุมัติ
                                    {requests.length > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
                                    )}
                                </button>
                            </div>

                            {/* ฝั่งขวา: ปุ่ม Add Product สำหรับ Manager */}
                            {activeTab === 'PRODUCTS' && (
                                <button onClick={() => openModal('ADD')} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm">
                                    <Plus size={16} /> เพิ่มสินค้า
                                </button>
                            )}
                        </div>
                    )}
                </div>


                {activeTab === 'PRODUCTS' ? (

                    <>

                        <div className="bg-white rounded-t-xl p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition
                                    ${selectedCategory === cat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {cat} {cat === 'All' && <span className="ml-1 text-gray-400 font-normal">({products.length})</span>}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-64 shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search product name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
                                />
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            </div>
                        </div>

                        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 overflow-visible">
                            <div className="overflow-x-auto overflow-y-visible">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-[#F8FAFC] border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                                            <th className="px-6 py-4">Product Name</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4 text-center">Stock</th>
                                            <th className="px-6 py-4 text-right">Price</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-center w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {loading ? (
                                            <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Loading products...</td></tr>
                                        ) : sortedProducts.length === 0 ? (
                                            <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">No products found.</td></tr>
                                        ) : (
                                            sortedProducts.map((product) => {
                                                const stockQty = Number(product.Stock || 0);

                                                let rowBgClass = "hover:bg-gray-50/50 transition group";
                                                if (stockQty === 0) {
                                                    rowBgClass = "bg-red-50 hover:bg-red-100 transition group";
                                                } else if (stockQty < 5) {
                                                    rowBgClass = "bg-yellow-50 hover:bg-yellow-100 transition group";
                                                }

                                                let stockTextClass = "text-gray-700 font-semibold";
                                                if (stockQty === 0) {
                                                    stockTextClass = "text-red-600 font-bold";
                                                } else if (stockQty < 5) {
                                                    stockTextClass = "text-amber-600 font-bold";
                                                }

                                                return (
                                                    <tr key={product.id} className={rowBgClass}>

                                                        <td className="px-6 py-4 flex items-center gap-4">
                                                            <img
                                                                src={Array.isArray(product.ProductPic) ? product.ProductPic[0] : product.ProductPic || 'https://placehold.co/150'}
                                                                alt={product.ProductName}
                                                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-white"
                                                            />
                                                            <div>
                                                                <p className="font-bold text-gray-900">{product.ProductName}</p>
                                                                <p className="text-[10px] text-gray-400">ID: {product.id}</p>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-gray-600 font-medium">
                                                            {product.ProductCategory}
                                                        </td>

                                                        <td className={`px-6 py-4 text-center ${stockTextClass}`}>
                                                            {product.Stock}
                                                        </td>

                                                        {/* --- ใช้ฟังก์ชัน formatPriceDisplay ตรงนี้ --- */}
                                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                            ฿{formatPriceDisplay(product.Price)}
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border 
                    ${product.ProductStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                                            >
                                                                {product.ProductStatus || 'Active'}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-center relative" ref={openDropdownId === product.id ? dropdownRef : null}>
                                                            <button
                                                                onClick={() => setOpenDropdownId(openDropdownId === product.id ? null : product.id)}
                                                                className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </button>

                                                            {openDropdownId === product.id && (
                                                                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-2 animate-fade-in text-left">
                                                                    <button onClick={() => openModal('INFO', product)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><Edit size={14} /> แก้ไขข้อมูลทั่วไป</button>
                                                                    <button onClick={() => openModal('IMAGE', product)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><ImagePlus size={14} /> จัดการรูปภาพ</button>
                                                                    <button onClick={() => openModal('PRICE', product)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><DollarSign size={14} /> แก้ไขราคา</button>
                                                                    <button onClick={() => openModal('STOCK', product)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><Package size={14} /> แก้ไขจำนวน (Stock)</button>
                                                                    <button onClick={() => openModal('STATUS', product)} className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><Activity size={14} /> แก้ไขสถานะ</button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-orange-50 border-b border-orange-100 text-[11px] text-orange-700 uppercase tracking-wider font-bold">
                                    <th className="px-6 py-4">ผู้ขออนุมัติ</th>
                                    <th className="px-6 py-4">ประเภทรายการ</th>
                                    <th className="px-6 py-4 w-1/4">ชื่อสินค้าเป้าหมาย</th>
                                    <th className="px-6 py-4">รายละเอียดการแก้ไข</th>
                                    <th className="px-6 py-4">วันที่ส่งคำขอ</th>
                                    <th className="px-6 py-4 text-center">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {requests.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">ไม่มีรายการรออนุมัติ</td></tr>
                                ) : (
                                    requests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900">{req.requestedByName}</td>

                                            <td className="px-6 py-4">
                                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-200">
                                                    {req.type === 'PRODUCT_ADD' ? 'เพิ่มสินค้า' :
                                                        req.type === 'PRODUCT_PRICE' ? 'แก้ไขราคา' :
                                                            req.type === 'PRODUCT_STOCK' ? 'แก้ไขสต็อก' :
                                                                req.type === 'PRODUCT_STATUS' ? 'แก้ไขสถานะ' :
                                                                    req.type?.replace('PRODUCT_', '')}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-gray-600 font-bold">
                                                {req.targetProductName}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 inline-block">
                                                    {getRequestDetails(req)}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                                {formatTimestamp(req.createdAt)}
                                            </td>

                                            <td className="px-6 py-4 flex justify-center gap-2">
                                                <button onClick={() => handleApproveRequest(req)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-bold transition shadow-sm">อนุมัติ</button>
                                                <button onClick={() => handleRejectRequest(req.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded text-xs font-bold transition shadow-sm">ปฏิเสธ</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* ========================================= */}
            {/* ============= MODAL SECTION ============= */}
            {/* ========================================= */}

            {modalState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className={`bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in-down w-full max-h-[90vh] overflow-y-auto custom-scrollbar
                        ${['PRICE', 'STOCK', 'STATUS'].includes(modalState.type) ? 'max-w-md' : 'max-w-3xl'}`}
                    >
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {modalState.type === 'ADD' && "เพิ่มสินค้าใหม่"}
                                {modalState.type === 'INFO' && "แก้ไขข้อมูลสินค้า (ทั่วไป)"}
                                {modalState.type === 'IMAGE' && "จัดการรูปภาพสินค้า"}
                                {modalState.type === 'PRICE' && "แก้ไขราคาสินค้า"}
                                {modalState.type === 'STOCK' && "แก้ไขจำนวนสินค้า"}
                                {modalState.type === 'STATUS' && "แก้ไขสถานะสินค้า"}
                                {modalState.type === 'VIEW_ADD_DETAILS' && "รายละเอียดคำขอเพิ่มสินค้า"}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* --- FORM: แก้ไขราคา --- */}
                            {modalState.type === 'PRICE' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">ราคาขาย (บาท) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        inputMode="decimal" // เด้งคีย์บอร์ดตัวเลขบนมือถือ
                                        required
                                        value={formData.Price}
                                        onChange={e => {
                                            const val = e.target.value;

                                            // ดักให้พิมพ์ได้เฉพาะตัวเลข และจุดทศนิยมไม่เกิน 2 ตำแหน่ง
                                            if (/^\d*\.?\d{0,2}$/.test(val)) {
                                                const priceVal = Number(val);
                                                const costVal = Number(formData.CostPrice);

                                                // ย้าย Custom Validity มาไว้ตรงนี้แทน
                                                if (!val) {
                                                    e.target.setCustomValidity('กรุณากรอกราคาสินค้า');
                                                } else if (priceVal <= 0) {
                                                    e.target.setCustomValidity('ไม่สามารถกำหนดราคาที่ติดลบหรือเท่ากับ 0 ได้');
                                                } else if (priceVal <= costVal) {
                                                    e.target.setCustomValidity('ราคาขายต้องมากกว่าราคาต้นทุน');
                                                } else {
                                                    e.target.setCustomValidity('');
                                                }

                                                setFormData({ ...formData, Price: val });
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 outline-none text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">ราคาต้นทุนเดิม: ฿{formatPriceDisplay(formData.CostPrice)}</p>
                                </div>
                            )}

                            {/* --- FORM: แก้ไข Stock --- */}
                            {modalState.type === 'STOCK' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">จำนวนสินค้าคงเหลือ <span className="text-red-500">*</span></label>
                                        <input type="number" required min="0" value={formData.Stock} onChange={e => setFormData({ ...formData, Stock: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 outline-none text-sm" />
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">สาเหตุการแก้ไข <span className="text-red-500">*</span></label>

                                        <select
                                            required
                                            value={formData.ReasonSelect || ''}
                                            onChange={e => {
                                                e.target.setCustomValidity('');
                                                setFormData({ ...formData, ReasonSelect: e.target.value });
                                            }}
                                            onInvalid={e => e.target.setCustomValidity('กรุณาเลือกสาเหตุการแก้ไขสต็อก')}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm cursor-pointer"
                                        >
                                            <option value="" disabled>-- โปรดเลือกสาเหตุ --</option>
                                            <option value="รับสินค้าเข้าเพิ่ม (Restock)">รับสินค้าเข้าเพิ่ม (Restock)</option>
                                            <option value="นับสต็อกประจำเดือน (Audit)">นับสต็อกประจำเดือน (Audit)</option>
                                            <option value="สินค้าชำรุด / สูญหาย (Damaged/Lost)">สินค้าชำรุด / สูญหาย (Damaged/Lost)</option>
                                            <option value="ส่งคืนผู้ผลิต (Return)">ส่งคืนผู้ผลิต (Return)</option>
                                            <option value="อื่นๆ">อื่นๆ (โปรดระบุเพิ่มเติม)</option>
                                        </select>

                                        {formData.ReasonSelect === 'อื่นๆ' && (
                                            <div className="mt-3 animate-fade-in-down">
                                                <textarea
                                                    required
                                                    rows="2"
                                                    value={formData.ReasonDetail || ''}
                                                    onChange={e => {
                                                        e.target.setCustomValidity('');
                                                        setFormData({ ...formData, ReasonDetail: e.target.value });
                                                    }}
                                                    onInvalid={e => e.target.setCustomValidity('กรุณาระบุสาเหตุเพิ่มเติมที่ช่องนี้')}
                                                    className="w-full px-4 py-2 bg-white border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm resize-none"
                                                    placeholder="กรุณาระบุสาเหตุที่ต้องการแก้ไขสต็อก..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- FORM: แก้ไข Status --- */}
                            {modalState.type === 'STATUS' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">สถานะสินค้า <span className="text-red-500">*</span></label>
                                    <select value={formData.ProductStatus} onChange={e => setFormData({ ...formData, ProductStatus: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 outline-none text-sm">
                                        <option value="Active">Active - พร้อมจำหน่าย</option>
                                        <option value="Inactive">Inactive - ไม่พร้อมจำหน่าย</option>
                                    </select>
                                </div>
                            )}

                            {modalState.type === 'IMAGE' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">รูปภาพปัจจุบัน (กดกากบาทเพื่อลบ)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            {existingImages.length === 0 ? (
                                                <p className="text-sm text-gray-400 col-span-full text-center py-4">ไม่มีรูปภาพ</p>
                                            ) : (
                                                existingImages.map((url, idx) => (
                                                    <div key={idx} className="relative group aspect-square">
                                                        <img src={url} alt="product" className="w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-red-700"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">เพิ่มรูปภาพใหม่ (เลือกพร้อมกันได้หลายรูป)</label>
                                        <input
                                            type="file" multiple accept="image/*"
                                            onChange={handleFileChange}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer"
                                        />

                                        {imagePreviews.length > 0 && (
                                            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
                                                {imagePreviews.map((src, index) => (
                                                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-300 shadow-sm">
                                                        <img src={src} alt={`preview-${index}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- FORM: เพิ่มสินค้า หรือ แก้ไขข้อมูลทั่วไป --- */}
                            {['ADD', 'INFO'].includes(modalState.type) && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อสินค้า <span className="text-red-500">*</span></label>
                                            <input type="text" required value={formData.ProductName} onChange={e => setFormData({ ...formData, ProductName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">หมวดหมู่ (Category) <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.ProductCategory || ''}
                                                onChange={e => setFormData({ ...formData, ProductCategory: e.target.value })}
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            >
                                                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                                                <option value="Pump">ปั๊มน้ำ (Pump)</option>
                                                <option value="SolenoidValve">วาล์วไฟฟ้า (Solenoid Valve)</option>
                                                <option value="Sprinkler">หัวจ่ายน้ำ (Sprinkler)</option>
                                                <option value="Controller&Timer">ตัวควบคุม (Controller & Timer)</option>
                                                <option value="Fitting&Pipe">ท่อและอุปกรณ์ข้อต่อ (Fitting & Pipe)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {modalState.type === 'ADD' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">ต้นทุน (Cost) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    required
                                                    value={formData.CostPrice}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (/^\d*\.?\d{0,2}$/.test(val)) {
                                                            setFormData({ ...formData, CostPrice: val });
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">ราคาขาย (Price) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    required
                                                    value={formData.Price}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (/^\d*\.?\d{0,2}$/.test(val)) {
                                                            setFormData({ ...formData, Price: val });
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">สต็อก (Stock) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    value={formData.Stock}
                                                    onChange={e => setFormData({ ...formData, Stock: e.target.value })}
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-2 gap-2">
                                            <label className="block text-sm font-bold text-gray-700">รายละเอียดสินค้า</label>

                                            <div className="flex flex-wrap gap-1.5">
                                                {detailKeywords.map(kw => (
                                                    <button
                                                        key={kw}
                                                        type="button"
                                                        onClick={() => insertKeyword(kw)}
                                                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition shadow-sm"
                                                    >
                                                        + {kw}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <textarea
                                            rows="7"
                                            value={formData.ProductDetail}
                                            onChange={e => setFormData({ ...formData, ProductDetail: e.target.value })}
                                            placeholder="พิมพ์รายละเอียดสินค้าที่นี่... (สามารถกดปุ่มด้านบนเพื่อแทรกหัวข้อหลักได้)"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-y text-sm min-h-[150px] leading-relaxed">
                                        </textarea>
                                    </div>

                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">พื้นที่เหมาะสม</label>
                                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                                {areaOptions.map(option => (
                                                    <label key={option} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.AreaType?.includes(option)}
                                                            onChange={() => handleCheckboxChange('AreaType', option)}
                                                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 pt-3">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">ชนิดพืชที่เหมาะสม</label>
                                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                                {plantOptions.map(option => (
                                                    <label key={option} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.PlantType?.includes(option)}
                                                            onChange={() => handleCheckboxChange('PlantType', option)}
                                                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">แรงดันน้ำ</label>
                                            <select value={formData.Pressure || 'Low'} onChange={e => setFormData({ ...formData, Pressure: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer">
                                                <option value="Low">Low</option>
                                                <option value="Low-Medium">Low-Medium</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Medium-High">Medium-High</option>
                                                <option value="High">High</option>
                                                <option value="Very High">Very High</option>

                                            </select>
                                        </div>
                                        <div className={modalState.type === 'ADD' ? "md:col-span-1" : "md:col-span-2"}>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Youtube URL</label>
                                            <input type="text" value={formData.YoutubeURL} onChange={e => setFormData({ ...formData, YoutubeURL: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>

                                        {modalState.type === 'ADD' && (
                                            <div className="md:col-span-2 mt-2 pt-2 border-t border-gray-100">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">อัปโหลดรูปภาพ (เลือกพร้อมกันได้หลายรูป) <span className="text-red-500">*</span></label>
                                                <input
                                                    type="file" multiple accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="w-full px-4 py-[5px] bg-gray-50 border border-gray-200 rounded-lg text-sm cursor-pointer"
                                                    required
                                                />

                                                {imagePreviews.length > 0 && (
                                                    <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                        {imagePreviews.map((src, index) => (
                                                            <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-300 shadow-sm">
                                                                <img src={src} alt={`preview-${index}`} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                    </div>
                                </>
                            )}

                            {/* --- FORM: ดูรายละเอียดคำขอเพิ่มสินค้า (Read-only) --- */}
                            {modalState.type === 'VIEW_ADD_DETAILS' && modalState.selectedRequest && (
                                <div className="space-y-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><span className="font-bold text-gray-700">ชื่อสินค้า:</span> {modalState.selectedRequest.data.ProductName}</div>
                                        <div><span className="font-bold text-gray-700">หมวดหมู่:</span> {modalState.selectedRequest.data.ProductCategory}</div>
                                        <div><span className="font-bold text-gray-700">ราคาต้นทุน:</span> ฿{formatPriceDisplay(modalState.selectedRequest.data.CostPrice)}</div>
                                        <div><span className="font-bold text-gray-700">ราคาขาย:</span> ฿{formatPriceDisplay(modalState.selectedRequest.data.Price)}</div>
                                        <div><span className="font-bold text-gray-700">สต็อกเริ่มต้น:</span> {modalState.selectedRequest.data.Stock} ชิ้น</div>
                                        <div><span className="font-bold text-gray-700">แรงดันน้ำ:</span> {modalState.selectedRequest.data.Pressure}</div>
                                    </div>

                                    <div>
                                        <span className="font-bold text-gray-700 block mb-1">รายละเอียดสินค้า:</span>
                                        <div className="bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                            {modalState.selectedRequest.data.ProductDetail || '-'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-bold text-gray-700 block mb-1">พื้นที่เหมาะสม:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {modalState.selectedRequest.data.AreaType?.length > 0
                                                    ? modalState.selectedRequest.data.AreaType.map((area, i) => <span key={i} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded border border-blue-100 font-bold">{area}</span>)
                                                    : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-700 block mb-1">ชนิดพืชที่เหมาะสม:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {modalState.selectedRequest.data.PlantType?.length > 0
                                                    ? modalState.selectedRequest.data.PlantType.map((plant, i) => <span key={i} className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded border border-emerald-100 font-bold">{plant}</span>)
                                                    : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {modalState.selectedRequest.data.ProductPic?.length > 0 && (
                                        <div>
                                            <span className="font-bold text-gray-700 block mb-2">รูปภาพสินค้า:</span>
                                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                                {modalState.selectedRequest.data.ProductPic.map((pic, i) => (
                                                    <a href={pic} target="_blank" rel="noopener noreferrer" key={i}>
                                                        <img src={pic} alt="preview" className="w-full aspect-square object-cover rounded-lg border border-gray-200 hover:opacity-80 transition bg-white" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isManager && !['INFO', 'IMAGE'].includes(modalState.type) && (
                                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-xs font-medium flex items-start gap-2 border border-orange-100 mt-4">
                                    <p>เนื่องจากคุณเป็น Employee การบันทึกข้อมูลส่วนนี้จะต้องรอให้ Manager อนุมัติก่อนถึงจะแสดงผลจริง</p>
                                </div>
                            )}

                            {/* --- ส่วนปุ่มกดยกเลิก/บันทึก (แก้ไขให้ซ่อนในหน้า VIEW_ADD_DETAILS) --- */}
                            {modalState.type !== 'VIEW_ADD_DETAILS' ? (
                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">ยกเลิก</button>
                                    <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2">
                                        {isSubmitting ? 'กำลังบันทึก...' : (isManager || modalState.type === 'INFO' ? 'บันทึกข้อมูล' : 'ส่งคำขออนุมัติ')}
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">ปิดหน้าต่าง</button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminProductPage;