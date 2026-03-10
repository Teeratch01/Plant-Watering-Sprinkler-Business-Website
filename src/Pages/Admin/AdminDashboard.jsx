import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Package, Map, DollarSign, ShoppingCart, MapPin } from 'lucide-react';

import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps';
import { scaleLinear } from "d3-scale";

import geoUrlData from '../../../public/thailand.json';


const provinceMap = {
    "กรุงเทพมหานคร": "Bangkok Metropolis",
    "กระบี่": "Krabi",
    "กาญจนบุรี": "Kanchanaburi",
    "กาฬสินธุ์": "Kalasin",
    "กำแพงเพชร": "Kamphaeng Phet",
    "ขอนแก่น": "Khon Kaen",
    "จันทบุรี": "Chanthaburi",
    "ฉะเชิงเทรา": "Chachoengsao",
    "ชลบุรี": "Chon Buri", // บางไฟล์ใช้ Chonburi
    "ชัยนาท": "Chai Nat",
    "ชัยภูมิ": "Chaiyaphum",
    "ชุมพร": "Chumphon",
    "เชียงราย": "Chiang Rai",
    "เชียงใหม่": "Chiang Mai",
    "ตรัง": "Trang",
    "ตราด": "Trat",
    "ตาก": "Tak",
    "นครนายก": "Nakhon Nayok",
    "นครปฐม": "Nakhon Pathom",
    "นครพนม": "Nakhon Phanom",
    "นครราชสีมา": "Nakhon Ratchasima",
    "นครศรีธรรมราช": "Nakhon Si Thammarat",
    "นครสวรรค์": "Nakhon Sawan",
    "นนทบุรี": "Nonthaburi",
    "นราธิวาส": "Narathiwat",
    "น่าน": "Nan",
    "บึงกาฬ": "Bueng Kan",
    "บุรีรัมย์": "Buri Ram",
    "ปทุมธานี": "Pathum Thani",
    "ประจวบคีรีขันธ์": "Prachuap Khiri Khan",
    "ปราจีนบุรี": "Prachin Buri",
    "ปัตตานี": "Pattani",
    "พระนครศรีอยุธยา": "Phra Nakhon Si Ayutthaya",
    "พะเยา": "Phayao",
    "พังงา": "Phangnga",
    "พัทลุง": "Phatthalung",
    "พิจิตร": "Phichit",
    "พิษณุโลก": "Phitsanulok",
    "เพชรบุรี": "Phetchaburi",
    "เพชรบูรณ์": "Phetchabun",
    "แพร่": "Phrae",
    "ภูเก็ต": "Phuket",
    "มหาสารคาม": "Maha Sarakham",
    "มุกดาหาร": "Mukdahan",
    "แม่ฮ่องสอน": "Mae Hong Son",
    "ยโสธร": "Yasothon",
    "ยะลา": "Yala",
    "ร้อยเอ็ด": "Roi Et",
    "ระนอง": "Ranong",
    "ระยอง": "Rayong",
    "ราชบุรี": "Ratchaburi",
    "ลพบุรี": "Lop Buri",
    "ลำปาง": "Lampang",
    "ลำพูน": "Lamphun",
    "เลย": "Loei",
    "ศรีสะเกษ": "Si Sa Ket",
    "สกลนคร": "Sakon Nakhon",
    "สงขลา": "Songkhla",
    "สตูล": "Satun",
    "สมุทรปราการ": "Samut Prakan",
    "สมุทรสงคราม": "Samut Songkhram",
    "สมุทรสาคร": "Samut Sakhon",
    "สระแก้ว": "Sa Kaeo",
    "สระบุรี": "Saraburi",
    "สิงห์บุรี": "Sing Buri",
    "สุโขทัย": "Sukhothai",
    "สุพรรณบุรี": "Suphan Buri",
    "สุราษฎร์ธานี": "Surat Thani",
    "สุรินทร์": "Surin",
    "หนองคาย": "Nong Khai",
    "หนองบัวลำภู": "Nong Bua Lam Phu",
    "อ่างทอง": "Ang Thong",
    "อำนาจเจริญ": "Amnat Charoen",
    "อุดรธานี": "Udon Thani",
    "อุตรดิตถ์": "Uttaradit",
    "อุทัยธานี": "Uthai Thani",
    "อุบลราชธานี": "Ubon Ratchathani"
};


function AdminDashboard() {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const [tooltipContent, setTooltipContent] = useState("");
    const [viewMode, setViewMode] = useState('REVENUE')



    const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1'];
    useEffect(() => {
        // ดึงเฉพาะออเดอร์ที่ไม่ถูกยกเลิกมาวิเคราะห์
        const q = query(collection(db, "orders"), where("OrderStatus", "!=", "Cancelled"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(orderData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.TotalPrice) || 0), 0);
    const totalOrders = orders.length;

    const getMonthlySalesData = () => {
        const sortedData = {};
        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

        orders.forEach(order => {
            let date;
            if (order.OrderDate && typeof order.OrderDate.toDate === 'function') {
                date = order.OrderDate.toDate();
            } else if (order.OrderDate) {
                date = new Date(order.OrderDate); // เผื่อกรณีเป็น String
            } else {
                return;
            }

            const month = date.getMonth();
            const year = date.getFullYear();
            // สร้าง Key รูปแบบ YYYY-MM เพื่อให้เรียงลำดับเวลาได้ถูกต้อง
            const sortKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;

            if (!sortedData[sortKey]) {
                sortedData[sortKey] = {
                    label: `${monthNames[month]} ${(year + 543).toString().slice(-2)}`, // เช่น ก.พ. 69
                    totalRevenue: 0,
                    totalQuantity: 0
                };
            }
            sortedData[sortKey].totalRevenue += Number(order.TotalPrice || order.TotalAmount || 0);

            let orderQty = 0
            if (order.Items && Array.isArray(order.Items)) {
                orderQty = order.Items.reduce((sum, item) => sum + (Number(item.Quantity) || 1), 0);
            }
            sortedData[sortKey].totalQuantity += orderQty;
        });

        // แปลงเป็น Array แล้วเรียงตาม Key (เรียงจากเดือนเก่าไปเดือนใหม่)
        return Object.keys(sortedData).sort().map(key => ({
            name: sortedData[key].label,
            value: viewMode === 'REVENUE' ? sortedData[key].totalRevenue : sortedData[key].totalQuantity
        }));
    };



    const getTopProducts = () => {
        const productCount = {};
        orders.forEach(order => {
            (order.Items || []).forEach(item => {
                const name = item.ProductName || 'Unknown';
                const qty = Number(item.Quantity) || 1;
                // 🌟 คำนวณยอดขายของสินค้านั้นๆ ด้วย
                const price = Number(item.Price || 0);
                const revenue = qty * price;

                if (!productCount[name]) {
                    productCount[name] = { qty: 0, revenue: 0 };
                }
                productCount[name].qty += qty;
                productCount[name].revenue += revenue;
            });
        });

        return Object.keys(productCount)
            .map(key => ({
                name: key,
                // 🌟 สร้างฟิลด์ value ไว้โชว์บนกราฟ
                value: viewMode === 'REVENUE' ? productCount[key].revenue : productCount[key].qty
            }))
            // 🌟 เรียงตาม value
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };


    const getLocationData = () => {
        const locationCount = {};
        orders.forEach(order => {
            // ดึงจังหวัดจาก Object Address
            const addr = order.ShippingAddress || order.Address || {};
            const province = addr.Province || addr.province || 'ไม่ระบุ';

            const revenue = Number(order.TotalPrice) || 0;

            let qty = 0;

            if (order.Items && Array.isArray(order.Items)) {
                qty = order.Items.reduce((sum, item) => sum + (Number(item.Quantity) || 1), 0);
            }

            if (!locationCount[province]) {
                locationCount[province] = { revenue: 0, qty: 0 };
            }
            locationCount[province].revenue += revenue;
            locationCount[province].qty += qty;
        });
        return Object.keys(locationCount)
            .map(key => ({
                name: key,
                // 🌟 ส่งค่าออกไปเป็น value ตาม viewMode
                value: viewMode === 'REVENUE' ? locationCount[key].revenue : locationCount[key].qty
            }))
            .sort((a, b) => b.value - a.value);
    };

    const monthlySales = getMonthlySalesData();
    const topProducts = getTopProducts();
    const locationData = getLocationData();

    const maxLocationValue = Math.max(...locationData.map(d => d.value), 0); // 🌟 เปลี่ยนเป็นหาค่ามากสุดจาก d.value
    const colorScale = scaleLinear()
        .domain([0, maxLocationValue === 0 ? 1 : maxLocationValue])
        .range(["#EFF6FF", "#1D4ED8"]);


    const getProductGrowthData = () => {

        if (orders.length === 0) return [];

        const dates = orders.map(o => {
            if (o.OrderDate?.toDate) return o.OrderDate.toDate();
            if (o.OrderDate) return new Date(o.OrderDate);
            return new Date();
        }).filter(d => d);

        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const currentMonth = latestDate.getMonth();
        const currentYear = latestDate.getFullYear();

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentData = {};
        const lastData = {};

        orders.forEach(order => {
            let date;
            if (order.OrderDate?.toDate) date = order.OrderDate.toDate();
            else if (order.OrderDate) date = new Date(order.OrderDate);
            else return;

            const m = date.getMonth();
            const y = date.getFullYear();

            const isCurrent = m === currentMonth && y === currentYear;
            const isLast = m === lastMonth && y === lastMonthYear;

            if (isCurrent || isLast) {
                (order.Items || []).forEach(item => {
                    const name = item.ProductName || 'Unknown';
                    const qty = Number(item.Quantity) || 1;
                    const revenue = qty * Number(item.Price || 0);

                    // เลือกข้อมูลตามปุ่มที่กด (ยอดขาย หรือ จำนวนชิ้น)
                    const value = viewMode === 'REVENUE' ? revenue : qty;

                    if (isCurrent) currentData[name] = (currentData[name] || 0) + value;
                    if (isLast) lastData[name] = (lastData[name] || 0) + value;
                });
            }
        });

        const topCurrent = Object.keys(currentData)
            .sort((a, b) => currentData[b] - currentData[a])
            .slice(0, 5);

        return topCurrent.map(name => {
            const current = currentData[name] || 0;
            const previous = lastData[name] || 0;
            let growth = 0;

            if (previous > 0) {
                // สูตรหาเปอร์เซ็นต์: ((ใหม่ - เก่า) / เก่า) * 100
                growth = ((current - previous) / previous) * 100;
            } else if (current > 0) {
                growth = 100; // ถ้าเดือนที่แล้วยอด 0 แต่เดือนนี้ขายได้ ตีเป็นบวก 100%
            }

            return {
                name,
                current,
                previous,
                growth: Number(growth.toFixed(1)) // ปัดทศนิยม 1 ตำแหน่ง
            };
        });
    };

    const productGrowth = getProductGrowthData();

    const getOverallGrowthKPI = () => {
        if (orders.length === 0) return { revenueGrowth: 0, qtyGrowth: 0, currentRevenue: 0, currentQty: 0 };

        // 1. หาเดือนและปีล่าสุดที่มีข้อมูลในระบบ (ช่วงเวลาปัจจุบัน)
        const dates = orders.map(o => {
            if (o.OrderDate?.toDate) return o.OrderDate.toDate();
            if (o.OrderDate) return new Date(o.OrderDate);
            return new Date();
        }).filter(d => d);

        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const currentMonth = latestDate.getMonth();
        const currentYear = latestDate.getFullYear();

        // 2. คำนวณหาเดือนก่อนหน้า (ช่วงเวลาก่อนหน้า)
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let currentRevenue = 0; let lastRevenue = 0;
        let currentQty = 0; let lastQty = 0;

        // 3. หา Sum(ยอดขาย) และ Sum(จำนวนขาย) ของทั้ง 2 ช่วงเวลา
        orders.forEach(order => {
            let date;
            if (order.OrderDate?.toDate) date = order.OrderDate.toDate();
            else if (order.OrderDate) date = new Date(order.OrderDate);
            else return;

            const m = date.getMonth();
            const y = date.getFullYear();

            const isCurrent = m === currentMonth && y === currentYear;
            const isLast = m === lastMonth && y === lastMonthYear;

            if (isCurrent || isLast) {
                const rev = Number(order.TotalPrice || order.TotalAmount || 0);
                let qty = 0;
                if (order.Items && Array.isArray(order.Items)) {
                    qty = order.Items.reduce((sum, item) => sum + (Number(item.Quantity) || 1), 0);
                }

                if (isCurrent) {
                    currentRevenue += rev;
                    currentQty += qty;
                }
                if (isLast) {
                    lastRevenue += rev;
                    lastQty += qty;
                }
            }
        });

        // 4. เข้าสูตรคำนวณเปอร์เซ็นต์: ((ปัจจุบัน - ก่อนหน้า) / ก่อนหน้า) * 100
        const calcGrowth = (current, prev) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return ((current - prev) / prev) * 100;
        };

        return {
            revenueGrowth: calcGrowth(currentRevenue, lastRevenue),
            qtyGrowth: calcGrowth(currentQty, lastQty),
            currentRevenue,
            currentQty,
            lastRevenue,
            lastQty
        };
    };

    const growthKPIs = getOverallGrowthKPI();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <AdminNavbar />

            {tooltipContent && (
                <div className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mt-[-10px]"
                    style={{ left: tooltipContent.x, top: tooltipContent.y }}>
                    <p className="font-bold text-center">{tooltipContent.name}</p>
                    {/* 🌟 เปลี่ยนข้อความให้สอดคล้องกับมุมมองและเปลี่ยนตัวแปรเป็น .value */}
                    <p className="text-gray-300">
                        {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                        {tooltipContent.value?.toLocaleString()}
                        {viewMode === 'QUANTITY' && ' ชิ้น'}
                    </p>
                </div>
            )}

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" /> Dashboard & Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">ระบบวิเคราะห์ยอดขายและพฤติกรรมลูกค้า (อัปเดตเรียลไทม์)</p>
                </div>

                {/* KPI Cards (สรุปภาพรวม) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <DollarSign size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500">ยอดขายรวมสุทธิ</p>
                            <h3 className="text-2xl font-black text-gray-800">฿{totalRevenue.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500">จำนวนคำสั่งซื้อ</p>
                            <h3 className="text-2xl font-black text-gray-800">{totalOrders.toLocaleString()} <span className="text-sm font-medium text-gray-400">ออเดอร์</span></h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <MapPin size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500">จังหวัดที่ซื้อเยอะที่สุด</p>
                            <h3 className="text-2xl font-black text-gray-800">
                                {locationData.length > 0 ? locationData[0].name : '-'}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Tabs แบบ Tableau */}
                <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center justify-center gap-2 flex-1 py-3 font-bold text-sm border-b-2 transition ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        <TrendingUp size={16} /> ภาพรวม (Overview)
                    </button>
                    <button onClick={() => setActiveTab('products')} className={`flex items-center justify-center gap-2 flex-1 py-3 font-bold text-sm border-b-2 transition ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        <Package size={16} /> วิเคราะห์สินค้า (Products)
                    </button>
                    <button onClick={() => setActiveTab('locations')} className={`flex items-center justify-center gap-2 flex-1 py-3 font-bold text-sm border-b-2 transition ${activeTab === 'locations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                        <Map size={16} /> วิเคราะห์พื้นที่ (Locations)
                    </button>
                </div>

                {/* Content Zone */}
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-gray-400">กำลังประมวลผลข้อมูล...</div>
                ) : (
                    <div className="bg-white p-10 rounded-b-xl rounded-t-sm shadow-sm border border-gray-200 min-h-[400px]">

                        {/* TAB 1: Overview */}
                        {activeTab === 'overview' && (

                            <div className="space-y-6">

                                <div className="flex justify-end">
                                    <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                        <button
                                            onClick={() => setViewMode('REVENUE')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'REVENUE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ยอดขาย (บาท)
                                        </button>
                                        <button
                                            onClick={() => setViewMode('QUANTITY')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'QUANTITY' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            จำนวน (ชิ้น)
                                        </button>
                                    </div>
                                </div>



                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* กราฟแท่ง */}
                                    <div className="h-[350px]">
                                        {/* 🌟 1. แก้ไขชื่อหัวข้อให้เปลี่ยนตามมุมมองที่เลือก */}
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">
                                            Top 5 สินค้าขายดี {viewMode === 'REVENUE' ? '(ตามยอดขาย)' : '(ตามจำนวนชิ้น)'}
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={topProducts} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name"
                                                    tick={{ fontSize: 12 }}
                                                    interval={0}
                                                    angle={-35}
                                                    textAnchor="end"
                                                    height={90}
                                                    tickFormatter={(name) => name.length > 15 ? `${name.substring(0, 15)}...` : name} />

                                                {/* 🌟 2. เพิ่ม Format แกน Y ให้แสดงเป็นจำนวนเงินหรือจำนวนชิ้นให้ถูกต้อง */}
                                                <YAxis
                                                    allowDecimals={false}
                                                    tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                />

                                                {/* 🌟 3. อัปเดต Tooltip ให้แสดงคำว่า 'ยอดขาย' หรือ 'จำนวนชิ้น' ตอนเอาเมาส์ชี้ */}
                                                <RechartsTooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                />

                                                {/* 🌟 4. เปลี่ยน dataKey ตรงนี้จาก "จำนวนชิ้น" เป็น "value" */}
                                                <Bar dataKey="value" fill="#4E79A7" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟโดนัท */}
                                    <div className="h-[350px]">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">สัดส่วนยอดขายแบ่งตามจังหวัด (บาท)</h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={locationData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                                    {locationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => `฿${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* TAB 2: Products */}
                        {activeTab === 'products' && (
                            <div className="space-y-6"> {/* 🌟 เอา <div className="space-y-6"> มาครอบตรงนี้แทน */}


                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">

                                    {/* KPI Cards (สอดคล้องกับตารางตัวชี้วัดเป๊ะๆ) */}
                                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                        {/* 1. Sale Amount Growth (%) */}
                                        <div className="bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4 flex-1">
                                            <div className={`p-2.5 rounded-full ${growthKPIs.revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {growthKPIs.revenueGrowth >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sale Amount Growth</p>
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className={`text-lg font-black ${growthKPIs.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {growthKPIs.revenueGrowth > 0 ? '+' : ''}{growthKPIs.revenueGrowth.toFixed(1)}%
                                                    </h3>
                                                    <span className="text-xs text-gray-500 font-medium">(เทียบเดือนก่อน)</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Sales Quantity Growth (%) */}
                                        <div className="bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4 flex-1">
                                            <div className={`p-2.5 rounded-full ${growthKPIs.qtyGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {growthKPIs.qtyGrowth >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sales Quantity Growth</p>
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className={`text-lg font-black ${growthKPIs.qtyGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {growthKPIs.qtyGrowth > 0 ? '+' : ''}{growthKPIs.qtyGrowth.toFixed(1)}%
                                                    </h3>
                                                    <span className="text-xs text-gray-500 font-medium">(เทียบเดือนก่อน)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ปุ่มสลับมุมมอง */}
                                    <div className="bg-gray-200/80 p-1 rounded-lg inline-flex w-full sm:w-auto mt-2 xl:mt-0">
                                        <button
                                            onClick={() => setViewMode('REVENUE')}
                                            className={`flex-1 sm:flex-none px-6 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'REVENUE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ยอดขาย (บาท)
                                        </button>
                                        <button
                                            onClick={() => setViewMode('QUANTITY')}
                                            className={`flex-1 sm:flex-none px-6 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'QUANTITY' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            จำนวน (ชิ้น)
                                        </button>
                                    </div>
                                </div>

                                {/* 🌟 ปุ่มสลับมุมมอง */}
                                {/* <div className="flex justify-end">
                                    <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                        <button
                                            onClick={() => setViewMode('REVENUE')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'REVENUE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ยอดขาย (บาท)
                                        </button>
                                        <button
                                            onClick={() => setViewMode('QUANTITY')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'QUANTITY' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            จำนวน (ชิ้น)
                                        </button>
                                    </div>
                                </div> */}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* กราฟแท่ง */}
                                    <div className="h-[350px]">
                                        {/* 🌟 เปลี่ยนข้อความให้เปลี่ยนตามมุมมอง */}
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">
                                            Top 5 สินค้าขายดี {viewMode === 'REVENUE' ? '(ตามยอดขาย)' : '(ตามจำนวนชิ้น)'}
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={topProducts} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                                    interval={0}
                                                    angle={-35}
                                                    textAnchor="end"
                                                    height={90}
                                                    tickFormatter={(name) => name.length > 15 ? `${name.substring(0, 15)}...` : name}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    allowDecimals={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 12, fill: '#6b7280', dx: -10 }}
                                                    // 🌟 จัด Format ตัวเลขแกน Y ให้สวยงาม
                                                    tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                    width={50}
                                                    domain={[0, 'auto']}
                                                />
                                                <RechartsTooltip
                                                    cursor={{ fill: '#f9fafb' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    // 🌟 จัด Format ใน Tooltip
                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                />
                                                {/* 🌟 เปลี่ยน dataKey เป็น 'value' เพื่อรองรับ 2 มุมมอง */}
                                                <Bar dataKey="value" fill="#4E79A7" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟเส้น */}
                                    <div className="h-[400px]">
                                        <div className="h-[350px] w-full">
                                            {/* 🌟 เปลี่ยนข้อความให้เปลี่ยนตามมุมมอง */}
                                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center justify-center gap-2">
                                                <TrendingUp size={16} className="text-blue-600" />
                                                แนวโน้ม{viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวนสินค้าที่ขายได้'}รายเดือน
                                            </h3>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={monthlySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />

                                                    {/* 🌟 จัด Format แกน Y */}
                                                    <YAxis
                                                        tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                                    />

                                                    {/* 🌟 จัด Format ใน Tooltip */}
                                                    <RechartsTooltip
                                                        formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    {/* 🌟 เปลี่ยน dataKey เป็น 'value' */}
                                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8, fill: '#2563eb' }} dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>


                            </div>


                        )}

                        {/* TAB 3: Locations */}
                        {activeTab === 'locations' && (
                            <div className="space-y-6"> {/* 🌟 เพิ่มกล่องครอบแบบเดียวกับ Products */}

                                {/* 🌟 ปุ่มสลับมุมมอง */}
                                <div className="flex justify-end">
                                    <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                                        <button
                                            onClick={() => setViewMode('REVENUE')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'REVENUE' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ยอดขาย (บาท)
                                        </button>
                                        <button
                                            onClick={() => setViewMode('QUANTITY')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'QUANTITY' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            จำนวน (ชิ้น)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-[450px]">

                                    {/* ฝั่งซ้าย: สัดส่วนยอดขาย */}
                                    <div className="w-full h-full">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center bg-gray-50 py-2 rounded-lg border border-gray-100">
                                            Top 6 จังหวัดที่มียอด{viewMode === 'REVENUE' ? 'ขายสูงสุด' : 'สั่งซื้อเยอะที่สุด'}
                                        </h3>
                                        <ResponsiveContainer width="100%" height="85%">
                                            <PieChart>
                                                {/* 🌟 เปลี่ยน dataKey เป็น "value" และใส่ slice(0,6) ตรงนี้แทนเพื่อให้กราฟโชว์แค่ 6 อันดับ */}
                                                <Pie data={locationData.slice(0, 6)} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {locationData.slice(0, 6).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                {/* 🌟 อัปเดต Tooltip วงกลมให้เปลี่ยนตามมุมมอง */}
                                                <RechartsTooltip formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 🌟 ฝั่งขวา: แผนที่ประเทศไทย */}
                                    <div className="w-full h-full border-l border-gray-100 pl-8 relative">
                                        <h3 className="text-sm font-bold text-gray-700 mb-2 text-center bg-gray-50 py-2 rounded-lg border border-gray-100">
                                            การกระจายตัวของ{viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวนชิ้น'}ทั่วประเทศ
                                        </h3>

                                        <div className="w-full h-[90%] flex justify-center overflow-hidden">
                                            <ComposableMap
                                                projection="geoMercator"
                                                projectionConfig={{
                                                    scale: 1800,
                                                    center: [100.9925, 13.5]
                                                }}
                                                className="w-full h-full outline-none"
                                            >

                                                <ZoomableGroup center={[100.9925, 13.5]} zoom={1} maxZoom={5}>
                                                    <Geographies geography={geoUrlData}>
                                                        {({ geographies }) =>
                                                            geographies.map((geo) => {
                                                                const geoProvinceName = geo.properties.name || geo.properties.NAME_1 || "";

                                                                const provinceData = locationData.find((s) => {
                                                                    const englishNameFromMap = provinceMap[s.name];
                                                                    const geoNameLower = geoProvinceName.toLowerCase();
                                                                    const mapNameLower = englishNameFromMap ? englishNameFromMap.toLowerCase() : "";
                                                                    const dbNameLower = s.name.toLowerCase();

                                                                    if (mapNameLower && (geoNameLower === mapNameLower || geoNameLower.includes(mapNameLower))) return true;
                                                                    if (geoNameLower === dbNameLower || geoNameLower.includes(dbNameLower) || dbNameLower.includes(geoNameLower)) return true;
                                                                    return false;
                                                                });

                                                                // 🌟 ดึงค่า mapValue มาจาก provinceData.value
                                                                const mapValue = provinceData ? provinceData.value : 0;

                                                                let displayProvinceName = geoProvinceName;
                                                                for (const [thaiName, engName] of Object.entries(provinceMap)) {
                                                                    if (geoProvinceName.toLowerCase().includes(engName.toLowerCase())) {
                                                                        displayProvinceName = thaiName;
                                                                        break;
                                                                    }
                                                                }

                                                                return (
                                                                    <Geography
                                                                        key={geo.rsmKey}
                                                                        geography={geo}
                                                                        // 🌟 เทสีตาม mapValue
                                                                        fill={mapValue > 0 ? colorScale(mapValue) : "#F3F4F6"}
                                                                        stroke="#FFFFFF"
                                                                        strokeWidth={0.5}
                                                                        className="outline-none hover:opacity-80 transition-opacity cursor-pointer"
                                                                        onMouseMove={(e) => {
                                                                            setTooltipContent({
                                                                                name: displayProvinceName,
                                                                                value: mapValue, // 🌟 ส่ง value เข้าไปที่ Tooltip ลอยตัว
                                                                                x: e.clientX,
                                                                                y: e.clientY
                                                                            });
                                                                        }}
                                                                        onMouseLeave={() => {
                                                                            setTooltipContent("");
                                                                        }}
                                                                    />
                                                                );
                                                            })
                                                        }
                                                    </Geographies>
                                                </ZoomableGroup>
                                            </ComposableMap>
                                        </div>

                                        <div className="absolute bottom-0 right-0 text-[10px] text-gray-500 flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                                            <span>{viewMode === 'REVENUE' ? 'ยอดขายน้อย' : 'จำนวนน้อย'}</span>
                                            <div className="w-16 h-2 bg-gradient-to-r from-blue-50 to-blue-700 rounded"></div>
                                            <span>{viewMode === 'REVENUE' ? 'ยอดขายมาก' : 'จำนวนมาก'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;