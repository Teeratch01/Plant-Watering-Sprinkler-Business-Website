import React, { useState, useEffect } from 'react';
import { LogOut, User, LayoutDashboard, ClipboardList, MessageSquare, ChevronDown, Package, HandHelping, ShieldUser, UsersRound } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';


const AdminNavbar = () => {

    const [userData, setUserData] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const [pendingAdminCount, setPendingAdminCount] = useState(0);
    const [pendingProductCount, setPendingProductCount] = useState(0);
    const [pendingOrderCount, setPendingOrderCount] = useState(0);
    const [pendingChatCount, setPendingChatCount] = useState(0);
    const [pendingSupportCount, setPendingSupportCount] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData(data);

                        if (data.role === 'adminManager') {
                            const q = query(collection(db, 'admin_requests'), where('status', '==', 'PENDING'));
                            const unsubscribeRequests = onSnapshot(q, (snapshot) => {
                                let adminReq = 0;
                                let productReq = 0;

                                // 🌟 วนลูปเช็คเอกสารแต่ละตัวว่ามาจากระบบไหน
                                snapshot.docs.forEach(doc => {
                                    const reqData = doc.data();
                                    // ถ้า type ขึ้นต้นด้วย PRODUCT_ ให้นับเป็นของสินค้า
                                    if (reqData.type && reqData.type.startsWith('PRODUCT_')) {
                                        productReq++;
                                    } else {
                                        // ถ้าไม่ใช่ ให้นับเป็นของ Admin Management (เช่น ADD_USER, CHANGE_STATUS)
                                        adminReq++;
                                    }
                                });

                                setPendingAdminCount(adminReq);       // อัปเดตตัวเลขฝั่ง Admin
                                setPendingProductCount(productReq);
                            }
                            );
                            return () => unsubscribeRequests();
                        } else {
                            setPendingAdminCount(0);
                            setPendingProductCount(0);
                        }

                    }
                } catch (error) {
                    console.error("Error fetching admin data:", error);
                }
            } else {
                setUserData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const qOrders = query(collection(db, 'orders'));
        const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            // กรองเอาเฉพาะออเดอร์ที่ "กำลังดำเนินการ" (ยังไม่ส่งเสร็จ และ ไม่ถูกยกเลิก)
            const activeOrders = snapshot.docs.filter(doc => {
                const status = doc.data().OrderStatus || doc.data().Status || doc.data().status;
                return status !== 'Deliver Complete' && status !== 'Cancelled';
            });
            // อัปเดตตัวเลขแจ้งเตือน
            setPendingOrderCount(activeOrders.length);
        });

        return () => unsubscribeOrders(); // ล้างการทำงานเมื่อเปลี่ยนหน้า
    }, []);

    useEffect(() => {
        // --- ดึงจำนวนแชทที่แอดมินยังไม่ได้อ่าน (อ้างอิงจาก unreadAdmin) ---
        const qChats = query(collection(db, 'chats'), where('unreadAdmin', '==', true));
        const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
            setPendingChatCount(snapshot.docs.length);
        });

        // --- ดึงจำนวนคำร้อง (Support) ที่ยังไม่ได้รับการแก้ไข ---
        // 💡 หมายเหตุ: ตรวจสอบในฐานข้อมูลของคุณว่าใช้คำว่า 'pending' หรือ 'รอดำเนินการ' ในฟิลด์สถานะ
        const qSupport = query(collection(db, 'support_requests'), where('status', '==', 'pending'));
        const unsubscribeSupport = onSnapshot(qSupport, (snapshot) => {
            setPendingSupportCount(snapshot.docs.length);
        });

        return () => {
            unsubscribeChats();
            unsubscribeSupport();
        };
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const adminMenu = [
        {
            name: 'Home',
            path: '/admin/dashboard',
            icon: <LayoutDashboard size={18} />
        },
        {
            name: 'User MGMT',
            path: '#', // ไม่มี path ตรงๆ เพราะเป็น Dropdown
            icon: <ClipboardList size={18} />,
            hasBadge: pendingAdminCount > 0,
            subItems: [
                { name: 'Customer Management (ลูกค้า)', path: '/admin/customers', icon: <UsersRound size={16} /> },
                {
                    name: 'Admin Management (ผู้ดูแลระบบ)',
                    path: '/admin/admins',
                    icon: <ShieldUser size={16} />,
                    badgeCount: pendingAdminCount
                }
            ]
        },
        {
            name: 'Order & Product MGMT',
            path: '#', // ไม่มี path ตรงๆ เพราะเป็น Dropdown
            icon: <ClipboardList size={18} />,
            hasBadge: pendingProductCount > 0 || pendingOrderCount > 0,
            subItems: [
                {
                    name: 'Managing Orders (คำสั่งซื้อ)',
                    path: '/admin/orders',
                    icon: <ClipboardList size={16} />,
                    badgeCount: pendingOrderCount
                },
                {
                    name: 'Managing Products & Stock (สินค้าและคลังสินค้า)',
                    path: '/admin/products',
                    icon: <Package size={16} />,
                    badgeCount: pendingProductCount
                }
            ]
        },
        {
            name: 'Helpdesk',
            path: '#', // ไม่มี path ตรงๆ เพราะเป็น Dropdown
            icon: <ClipboardList size={18} />,
            hasBadge: pendingChatCount > 0 || pendingSupportCount > 0,
            subItems: [
                {
                    name: 'Support Center (ตอบคำร้อง)',
                    path: '/admin/support',
                    icon: <HandHelping size={16} />,
                    badgeCount: pendingSupportCount
                },
                {
                    name: 'Chat (แชต)',
                    path: '/admin/chat',
                    icon: <MessageSquare size={16} />,
                    badgeCount: pendingChatCount
                }
            ]
        },
    ];

    const displayName = userData?.firstname ? `${userData.firstname} ${userData.surname || ''}` : "Admin";


    return (
        <nav className="flex items-center px-6 py-4 md:px-12 bg-gray-900 text-white sticky top-0 z-50 shadow-md rounded">

            {/* Logo ฝั่งแอดมิน (ปรับฟอนต์ให้บางเหมือนในรูป) */}
            <Link to="/admin/dashboard" className="text-3xl font-light tracking-wide text-white flex items-center gap-3">
                PWSB <span className="text-2xl font-extralight text-gray-400">|</span> <span className="text-xl font-normal">Admin Site</span>
            </Link>

            {/* Menu Center */}
            <div className="hidden md:flex space-x-8 text-base ml-auto mr-10 font-medium">
                {adminMenu.map((item) => {
                    // เช็คว่าหน้าปัจจุบันตรงกับเมนูนี้ หรือเมนูย่อยของมันหรือไม่
                    const isActive = location.pathname.includes(item.path) ||
                        (item.subItems && item.subItems.some(sub => location.pathname.includes(sub.path)));

                    return (
                        <div key={item.name} className="relative group">
                            {/* เมนูหลัก */}
                            <Link to={item.path === '#' ? '#' : item.path} className="focus:outline-none">
                                <div className={`flex items-center gap-2 pb-1 transition-all duration-300 cursor-pointer
                                    ${isActive ? 'border-b-2 border-blue-400 text-blue-400' : 'border-b-2 border-transparent text-gray-300 hover:text-white hover:border-gray-500'}`}
                                >
                                    {item.name}
                                    {/* ถ้ามี subItems ให้แสดงลูกศรชี้ลง */}

                                    {item.hasBadge && (
                                        <span className="absolute -top-1 -right-3 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                    )}

                                    {item.subItems && <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />}
                                </div>
                            </Link>

                            {/* Dropdown Menu (แสดงเมื่อ Hover) */}
                            {item.subItems && (
                                <div className="absolute left-0 top-full pt-4 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                    <div className="bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                                        {item.subItems.map((sub, idx) => (
                                            <Link
                                                key={idx}
                                                to={sub.path}
                                                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {sub.icon}
                                                    {sub.name}
                                                </div>

                                                {/* 🌟 6. ตัวเลขบอกจำนวนใน Dropdown 🌟 */}
                                                {sub.badgeCount > 0 && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-fade-in-up">
                                                        {sub.badgeCount}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* User Dropdown (ด้านขวาสุด) */}
            <div className="flex items-center relative">
                <div className="cursor-pointer flex items-center gap-3" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold">{displayName}</p>
                        <p className="text-xs text-gray-400 capitalize">{userData?.role || 'Admin'}</p>
                    </div>
                    {/* ไอคอน User วงกลมแบบในรูป */}
                    <div className="w-10 h-10 rounded-full border-2 border-gray-400 flex items-center justify-center text-gray-300 hover:border-white hover:text-white transition">
                        <User size={20} />
                    </div>
                </div>

                {/* เมนูย่อยของ User */}
                {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-4 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-down">
                        <ul className="py-2">
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                                >
                                    <LogOut size={16} /> ออกจากระบบ
                                </button>
                            </li>
                        </ul>
                    </div>
                )}

                {/* ฉากกั้นใสสำหรับคลิกปิด Dropdown */}
                {isDropdownOpen && (
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsDropdownOpen(false)}></div>
                )}
            </div>
        </nav>
    );



}
export default AdminNavbar;