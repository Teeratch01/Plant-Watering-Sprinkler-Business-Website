import React, { useState, useEffect, use } from 'react';
import { ShoppingCart, User, LogOut, History, ClipboardClock, UserRoundCog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../FirebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import EditProfileModal from './EditProfileModal';
import { CreateInput } from "thai-address-autocomplete-react";
import { useCart } from './CartContext';


// src/components/Navbar.jsx

const Navbar = () => {

    const [activeMenu, setActiveMenu] = useState(false);
    const [userData, setUserData] = useState(null);
    const [user, setUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const navigate = useNavigate();
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const { getCartCount, setCartItems } = useCart();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        console.log("Document data:", docSnap.data());
                        setUserData(docSnap.data());
                    } else {
                        console.log("No such document!");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
            else {
                setUserData(null);
            }

        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);

            setCartItems([]); // เคลียร์ตะกร้าสินค้าเมื่อ logout
            localStorage.removeItem('shopping-cart'); // เคลียร์ localStorage ด้วย

            setIsDropdownOpen(false);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = [
        {
            key: 'หน้าหลัก',
            Linkto: '/'
        },
        {
            key: 'สินค้า',
            Linkto: '/products'
        },
        {
            key: 'คำสั่งซื้อ',
            Linkto: '/order-status'
        },
        {
            key: 'ติดต่อเรา',
            Linkto: '/contact'
        },
    ];

    const firestoreName = userData?.firstname ? `${userData.firstname} ${userData.surname || ''}` : null;

    const displayName = firestoreName || user?.displayName || user?.email || "My Account";

    return (
        <nav className="flex items-center px-6 py-4 md:px-12 bg-white sticky top-0 z-50 shadow-sm">


            <Link to="/">

                <div className="text-4xl font-light tracking-widest text-black">
                    PWSB
                </div>

            </Link>


            <div className="hidden md:flex space-x-8 text-lg ml-auto mr-8">

                {menuItems.map((item) => (
                    <Link to={item.Linkto} key={item.key}>
                        <div
                            key={item.key}
                            href={`#${item.key.toLowerCase().replace(" ", "-")}`}
                            onClick={() => setActiveMenu(item.key)}
                            className={`
              pb-1 border-b-2 transition-all duration-300 cursor-pointer
              ${activeMenu === item.key ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'}
            `}
                        >
                            {item.key}
                        </div>
                    </Link>
                ))}



            </div>


            <div className="flex items-center space-x-6">

                <Link to="/cart">
                    <div className="relative cursor-pointer hover:opacity-70 transition-opacity">
                        <ShoppingCart size={28} />
                        {getCartCount() > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                {getCartCount()}
                            </span>
                        )}
                    </div>
                </Link>


                <div className='relative'>

                    {user ? (
                        <div className="cursor-pointer relative">
                            <User
                                size={28}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                {/* <span className="hidden md:block font-medium text-gray-700">{user.displayName || "User"}</span> */}
                            </User>
                            {isDropdownOpen && (
                                <div className="absolute right-0 z-50 w-64 mt-2 origin-top-right bg-white rounded-lg shadow-lg border border-gray-100 animate-fade-in-down">

                                    {/* Header ของ Dropdown */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>

                                    {/* รายการเมนู */}
                                    <ul className="py-1">
                                        <li>
                                            <Link to="/order-history" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                                <ClipboardClock size={16} /> ประวัติการสั่งซื้อ
                                            </Link>
                                        </li>

                                        <li>
                                            <Link onClick={() => setIsEditProfileOpen(true)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                                <UserRoundCog size={16} /> แก้ไขข้อมูลผู้ใช้งาน
                                            </Link>
                                        </li>


                                        <hr className="my-1 border-gray-100" />

                                        <li>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <LogOut /> Logout
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {isDropdownOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setIsDropdownOpen(false)}
                                ></div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" >
                            <User
                                size={28}
                            />
                            {/* <span className="hidden md:block font-medium text-gray-700">{user.displayName || "User"}</span> */}

                        </Link>
                    )}
                </div>


            </div>

            {user && (
                <EditProfileModal
                    isOpen={isEditProfileOpen}
                    onClose={() => setIsEditProfileOpen(false)}
                    userId={user.uid}
                />
            )}
        </nav>
    );
};

export default Navbar;