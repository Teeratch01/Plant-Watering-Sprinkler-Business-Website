import React, { useState, useEffect, use, useRef } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
    ScatterChart, Scatter, ZAxis,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

import { TrendingUp, TrendingDown, Package, Map, DollarSign, ShoppingCart, MapPin, Activity, Download, ChevronDown, Search } from 'lucide-react';

import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps';
import { scaleLinear } from "d3-scale";

import geoUrlData from '../../assets/Geo/thailand.json';
import { toast } from 'react-toastify';


// แผนที่จังหวัดภาษาไทย -> อังกฤษ สำหรับแมปปิ้งข้อมูล
const provinceMap = {
    "กรุงเทพมหานคร": "Bangkok Metropolis",
    "กระบี่": "Krabi",
    "กาญจนบุรี": "Kanchanaburi",
    "กาฬสินธุ์": "Kalasin",
    "กำแพงเพชร": "Kamphaeng Phet",
    "ขอนแก่น": "Khon Kaen",
    "จันทบุรี": "Chanthaburi",
    "ฉะเชิงเทรา": "Chachoengsao",
    "ชลบุรี": "Chon Buri",
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
    const [products, setProducts] = useState([])
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const [tooltipContent, setTooltipContent] = useState("");
    const [viewMode, setViewMode] = useState('REVENUE')

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [selectedProvince, setSelectedProvince] = useState(null);

    // const [selectedProductId, setSelectedProductId] = useState('');

    const [selectedFilterCategories, setSelectedFilterCategories] = useState([]);
    const [selectedFilterProducts, setSelectedFilterProducts] = useState([]);

    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const productDropdownRef = useRef(null);

    // ฟังก์ชันสำหรับคลิกพื้นที่ว่างแล้วปิด Dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
                setIsProductDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const categoryThaiMap = {
        "Pump": "ปั๊มน้ำ (Pump)",
        "SolenoidValve": "วาล์วไฟฟ้า (Solenoid Valve)",
        "Sprinkler": "หัวจ่ายน้ำ (Sprinkler)",
        "Controller&Timer": "ตัวควบคุม / ตั้งเวลา (Controller & Timer)",
        "Fitting&Pipe": "ท่อและอุปกรณ์ข้อต่อ (Fitting & Pipe)",
        "Unknown": "ไม่ระบุหมวดหมู่"
    };


    // --- ฟังก์ชันจัดฟอร์แมตตัวเลข (ใส่ .00 ให้ยอดขาย) ---
    const formatValueDisplay = (val, mode = viewMode) => {
        if (val == null) return "0";
        if (mode === 'REVENUE') {
            // ถ้ายอดขาย บังคับแสดงทศนิยม 2 ตำแหน่ง
            return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        // ถ้าจำนวนชิ้น ให้แสดงจำนวนเต็มตามปกติ
        return Number(val).toLocaleString('th-TH');
    };


    const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1'];

    // ดึงข้อมูลจาก Firestore ทั้ง Orders, Products และ Payments
    useEffect(() => {
        const q = query(
            collection(db, "orders"),
            where("OrderStatus", "not-in", ["Cancelled", "Payment In Progress"])
        );
        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
            const orderData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(orderData);
            setLoading(false);
        });

        const qProducts = query(collection(db, "products"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(prodData);
        });

        const qPayments = query(collection(db, "payments"));
        const unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
            const payData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(payData);
        });

        return () => {
            unsubscribeOrders();
            unsubscribeProducts();
            unsubscribePayments();
        };
    }, []);



    const categoriesList = [...new Set(products.map(p => p.ProductCategory).filter(Boolean))];

    const filteredOrders = orders.map(order => {
        // 1. กรองวันที่ (Date Filter)
        if (startDate || endDate) {
            let orderDate;
            if (order.OrderDate?.toDate) orderDate = order.OrderDate.toDate();
            else if (order.OrderDate) orderDate = new Date(order.OrderDate);
            else return null;

            orderDate.setHours(0, 0, 0, 0);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (orderDate < start) return null;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (orderDate > end) return null;
            }
        }

        // 2. กรองสินค้าและหมวดหมู่ (Multiple Filters)
        if (selectedFilterCategories.length > 0 || selectedFilterProducts.length > 0) {
            const matchedItems = (order.Items || []).filter(item => {
                const productInfo = products.find(p => p.id === item.ProductID);
                const itemCategory = productInfo ? productInfo.ProductCategory : 'Unknown';

                // เช็คว่าสินค้านี้อยู่ในหมวดหมู่ที่เลือก หรือ เป็นสินค้าชิ้นที่เลือกไว้หรือไม่
                const isCategoryMatch = selectedFilterCategories.includes(itemCategory);
                const isProductMatch = selectedFilterProducts.includes(item.ProductID);

                return isCategoryMatch || isProductMatch;
            });

            // ถ้าออเดอร์นี้ไม่มีสินค้าที่ตรงกับเงื่อนไขเลย ให้ตัดบิลนี้ทิ้งไป
            if (matchedItems.length === 0) return null;

            // คำนวณยอดขายใหม่เฉพาะสินค้านั้นๆ (ไม่รวมตัวอื่นในบิลที่ไม่ได้เลือก)
            const newTotal = matchedItems.reduce((sum, item) => sum + (Number(item.Price || 0) * Number(item.Quantity || 1)), 0);

            return {
                ...order,
                Items: matchedItems,
                TotalPrice: newTotal
            };
        }

        return order;
    }).filter(Boolean);


    // ฟังก์ชันสำหรับจัดเรียงข้อมูลยอดขายรายเดือนและจำนวนชิ้นที่ขายได้
    const getMonthlySalesData = () => {
        const sortedData = {};
        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

        filteredOrders.forEach(order => {
            let date;
            if (order.OrderDate && typeof order.OrderDate.toDate === 'function') date = order.OrderDate.toDate();
            else if (order.OrderDate) date = new Date(order.OrderDate);
            else return;

            const month = date.getMonth();
            const year = date.getFullYear();
            const sortKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;

            if (!sortedData[sortKey]) {
                sortedData[sortKey] = { label: `${monthNames[month]} ${(year + 543).toString().slice(-2)}`, totalRevenue: 0, totalQuantity: 0 };
            }
            sortedData[sortKey].totalRevenue += Number(order.TotalPrice || order.TotalAmount || 0);

            let orderQty = 0
            if (order.Items && Array.isArray(order.Items)) {
                orderQty = order.Items.reduce((sum, item) => sum + (Number(item.Quantity) || 1), 0);
            }
            sortedData[sortKey].totalQuantity += orderQty;
        });

        const sortedKeys = Object.keys(sortedData).sort();
        return sortedKeys.map((key, index) => {
            const currentVal = viewMode === 'REVENUE' ? sortedData[key].totalRevenue : sortedData[key].totalQuantity;
            let growth = 0; let revGrowth = 0; let qtyGrowth = 0;

            if (index > 0) {
                const prevKey = sortedKeys[index - 1];
                const prevRev = sortedData[prevKey].totalRevenue;
                const prevQty = sortedData[prevKey].totalQuantity;

                if (prevRev > 0) revGrowth = ((sortedData[key].totalRevenue - prevRev) / prevRev) * 100; else if (sortedData[key].totalRevenue > 0) revGrowth = 100;
                if (prevQty > 0) qtyGrowth = ((sortedData[key].totalQuantity - prevQty) / prevQty) * 100; else if (sortedData[key].totalQuantity > 0) qtyGrowth = 100;

                const prevVal = viewMode === 'REVENUE' ? prevRev : prevQty;
                if (prevVal > 0) growth = ((currentVal - prevVal) / prevVal) * 100; else if (currentVal > 0) growth = 100;
            }

            return {
                name: sortedData[key].label, value: currentVal,
                revenue: sortedData[key].totalRevenue, quantity: sortedData[key].totalQuantity,
                growth: Number(growth.toFixed(1)), revenueGrowth: Number(revGrowth.toFixed(1)), quantityGrowth: Number(qtyGrowth.toFixed(1))
            };
        });
    };

    // ฟังก์ชันสำหรับจัดเรียงข้อมูลสินค้าขายดี (Top Products)
    const getTopProducts = () => {
        const productCount = {};
        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const name = item.ProductName || 'Unknown';
                const qty = Number(item.Quantity) || 1;
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
                value: viewMode === 'REVENUE' ? productCount[key].revenue : productCount[key].qty,
                revenue: productCount[key].revenue,
                quantity: productCount[key].qty
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };


    // ฟังก์ชันสำหรับจัดเรียงข้อมูลยอดขายตามจังหวัด
    const getLocationData = () => {
        const locationCount = {};
        filteredOrders.forEach(order => {
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
                value: (viewMode === 'REVENUE' || viewMode === 'BOTH') ? locationCount[key].revenue : locationCount[key].qty,
                revenue: locationCount[key].revenue,
                quantity: locationCount[key].qty
            }))
            .sort((a, b) => b.value - a.value);
    };

    // ฟังก์ชันสำหรับจัดเรียงข้อมูลยอดขายตามจังหวัด (รายละเอียดเมื่อคลิกที่จังหวัด)
    const getProvinceDetailData = (provinceName) => {
        if (!provinceName) return { categories: [], products: [] };

        const catMap = {};
        const prodMap = {};

        filteredOrders.forEach(order => {
            const addr = order.ShippingAddress || order.Address || {};
            const prov = addr.Province || addr.province || '';

            if (prov.includes(provinceName) || provinceName.includes(prov)) {
                (order.Items || []).forEach(item => {
                    const pid = item.ProductID;
                    const name = item.ProductName || 'Unknown';
                    const qty = Number(item.Quantity) || 1;
                    const price = Number(item.Price || 0);
                    const rev = qty * price;
                    const val = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? rev : qty;

                    const pInfo = products.find(p => p.id === pid);
                    const cat = pInfo ? (pInfo.ProductCategory || 'ไม่ระบุ') : 'ไม่ระบุ';

                    if (!catMap[cat]) catMap[cat] = { value: 0, revenue: 0, quantity: 0 };
                    catMap[cat].value += val;
                    catMap[cat].revenue += rev;
                    catMap[cat].quantity += qty;

                    if (!prodMap[name]) prodMap[name] = { value: 0, revenue: 0, quantity: 0 };
                    prodMap[name].value += val;
                    prodMap[name].revenue += rev;
                    prodMap[name].quantity += qty;
                })
            }
        })
        return {
            categories: Object.keys(catMap).map(k => ({ name: k, ...catMap[k] })).sort((a, b) => b.value - a.value),
            products: Object.keys(prodMap).map(k => ({ name: k, ...prodMap[k] })).sort((a, b) => b.value - a.value).slice(0, 5)
        };
    };
    const provinceDetails = getProvinceDetailData(selectedProvince);

    const monthlySales = getMonthlySalesData();
    const topProducts = getTopProducts();
    const locationData = getLocationData();

    const maxLocationValue = Math.max(...locationData.map(d => d.value), 0);

    // สร้างสเกลสีสำหรับแผนที่ โดยใช้ค่า locationData เพื่อกำหนดช่วงของสี
    const colorScale = scaleLinear()
        .domain([0, maxLocationValue === 0 ? 1 : maxLocationValue])
        .range(["#EFF6FF", "#1D4ED8"]);


    // ฟังก์ชันสำหรับจัดเรียงข้อมูลสินค้าขายดี (Top Products) เปรียบเทียบกับเดือนก่อนหน้า
    const getProductGrowthData = () => {
        if (filteredOrders.length === 0) return [];
        const dates = filteredOrders.map(o => {
            if (o.OrderDate?.toDate) return o.OrderDate.toDate();
            if (o.OrderDate) return new Date(o.OrderDate);
            return new Date();
        }).filter(d => d);

        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const currentMonth = latestDate.getMonth();
        const currentYear = latestDate.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentData = {}; const lastData = {};

        filteredOrders.forEach(order => {
            let date;
            if (order.OrderDate?.toDate) date = order.OrderDate.toDate();
            else if (order.OrderDate) date = new Date(order.OrderDate);
            else return;

            const m = date.getMonth(); const y = date.getFullYear();
            const isCurrent = m === currentMonth && y === currentYear;
            const isLast = m === lastMonth && y === lastMonthYear;

            if (isCurrent || isLast) {
                (order.Items || []).forEach(item => {
                    const name = item.ProductName || 'Unknown';
                    const qty = Number(item.Quantity) || 1;
                    const revenue = qty * Number(item.Price || 0);

                    if (isCurrent) {
                        if (!currentData[name]) currentData[name] = { rev: 0, qty: 0 };
                        currentData[name].rev += revenue; currentData[name].qty += qty;
                    }
                    if (isLast) {
                        if (!lastData[name]) lastData[name] = { rev: 0, qty: 0 };
                        lastData[name].rev += revenue; lastData[name].qty += qty;
                    }
                });
            }
        });

        const topCurrent = Object.keys(currentData)
            .sort((a, b) => {
                const valA = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? currentData[a].rev : currentData[a].qty;
                const valB = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? currentData[b].rev : currentData[b].qty;
                return valB - valA;
            })
            .slice(0, 5);

        return topCurrent.map(name => {
            const cRev = currentData[name]?.rev || 0; const pRev = lastData[name]?.rev || 0;
            const cQty = currentData[name]?.qty || 0; const pQty = lastData[name]?.qty || 0;

            let revGrowth = 0; let qtyGrowth = 0;
            if (pRev > 0) revGrowth = ((cRev - pRev) / pRev) * 100; else if (cRev > 0) revGrowth = 100;
            if (pQty > 0) qtyGrowth = ((cQty - pQty) / pQty) * 100; else if (cQty > 0) qtyGrowth = 100;

            const current = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? cRev : cQty;
            const previous = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? pRev : pQty;
            let growth = 0;
            if (previous > 0) growth = ((current - previous) / previous) * 100; else if (current > 0) growth = 100;

            return {
                name, current, previous, growth: Number(growth.toFixed(1)),
                revGrowth: Number(revGrowth.toFixed(1)), qtyGrowth: Number(qtyGrowth.toFixed(1)),
                cRev, pRev, cQty, pQty
            };
        });
    };

    const productGrowth = getProductGrowthData();

    // ฟังก์ชันสำหรับคำนวณ KPI การเติบโตของยอดขายและจำนวนชิ้นเปรียบเทียบกับเดือนก่อนหน้า
    const getOverallGrowthKPI = () => {
        if (filteredOrders.length === 0) return { revenueGrowth: 0, qtyGrowth: 0, currentRevenue: 0, currentQty: 0 };

        const dates = filteredOrders.map(o => {
            if (o.OrderDate?.toDate) return o.OrderDate.toDate();
            if (o.OrderDate) return new Date(o.OrderDate);
            return new Date();
        }).filter(d => d);

        const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const currentMonth = latestDate.getMonth();
        const currentYear = latestDate.getFullYear();

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let currentRevenue = 0; let lastRevenue = 0;
        let currentQty = 0; let lastQty = 0;

        filteredOrders.forEach(order => {
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


    // ฟังก์ชันสำหรับจัดเรียงข้อมูล Scatter Plot (ยอดขายตามประเภทพื้นที่และประเภทโรงงาน)
    const getScatterData = () => {
        if (orders.length === 0 || products.length === 0) return [];
        const matrix = {};

        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const productId = item.ProductID;
                const qty = Number(item.Quantity) || 1;
                const revenue = qty * Number(item.Price || 0);
                const value = (viewMode === 'REVENUE' || viewMode === 'BOTH') ? revenue : qty;

                const productInfo = products.find(p => p.id === productId);
                if (productInfo) {
                    const areas = Array.isArray(productInfo.AreaType) ? productInfo.AreaType : [];
                    const plants = Array.isArray(productInfo.PlantType) ? productInfo.PlantType : [];
                    areas.forEach(area => {
                        plants.forEach(plant => {
                            const key = `${area}_${plant}`;
                            if (!matrix[key]) matrix[key] = { area, plant, value: 0, revenue: 0, quantity: 0 };
                            matrix[key].value += value;
                            matrix[key].revenue += revenue;
                            matrix[key].quantity += qty;
                        });
                    });
                }
            });
        });
        return Object.values(matrix).filter(d => d.value > 0);
    };

    const scatterData = getScatterData();

    // ฟังก์ชันสำหรับจัดเรียงข้อมูลยอดขายตามหมวดหมู่สินค้า (รายละเอียดเมื่อคลิกที่จังหวัด)
    const getCategoryData = () => {
        if (orders.length === 0 || products.length === 0) return [];
        const categoryCount = {};

        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const productId = item.ProductID;
                const qty = Number(item.Quantity) || 1;
                const price = Number(item.Price || 0);
                const revenue = qty * price;

                const productInfo = products.find(p => p.id === productId);
                const category = productInfo ? (productInfo.ProductCategory || 'ไม่ระบุ') : 'ไม่ระบุ';

                if (!categoryCount[category]) {
                    categoryCount[category] = { revenue: 0, quantity: 0 };
                }
                categoryCount[category].revenue += revenue;
                categoryCount[category].quantity += qty;
            });
        });

        return Object.keys(categoryCount)
            .map(key => ({
                name: key,
                value: (viewMode === 'REVENUE' || viewMode === 'BOTH') ? categoryCount[key].revenue : categoryCount[key].quantity,
                revenue: categoryCount[key].revenue,
                quantity: categoryCount[key].quantity
            }))
            .sort((a, b) => b.value - a.value);
    };

    const categoryData = getCategoryData();


    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.TotalPrice) || 0), 0);
    const totalOrders = filteredOrders.length;

    // ฟังก์ชันสำหรับดาวน์โหลดข้อมูลเป็นไฟล์ CSV
    const downloadCSV = (dataArray, filename) => {
        if (dataArray.length === 0) return alert("ไม่มีข้อมูลสำหรับ Export");

        const headers = Object.keys(dataArray[0]);

        const csvRows = []
        csvRows.push(headers.join(','));

        for (const row of dataArray) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '""');
                return `"${escaped}"`;
            })
            csvRows.push(values.join(','))
        }

        const csvString = "\uFEFF" + csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ฟังก์ชันสำหรับดาวน์โหลดข้อมูลออเดอร์เป็นไฟล์ CSV
    const exportOrders = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "orders"));
            const allOrdersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (allOrdersData.length === 0) {
                return alert("ไม่มีข้อมูลออเดอร์ในระบบ");
            }

            const formattedData = allOrdersData.map(order => {
                const date = order.OrderDate?.toDate ? order.OrderDate.toDate().toLocaleString('th-TH') : order.OrderDate;
                const itemsStr = (order.Items || []).map(i => `${i.ProductName} (x${i.Quantity})`).join(', ');
                const address = order.ShippingAddress ? `${order.ShippingAddress.Address || ''} ${order.ShippingAddress.District || ''} ${order.ShippingAddress.Province || ''} ${order.ShippingAddress.Zipcode || ''}` : '';

                return {
                    "Order ID": order.id,
                    "วันที่สั่งซื้อ": date,
                    "ชื่อลูกค้า": order.CustomerName || '-',
                    "เบอร์โทร": order.CustomerPhone || '-',
                    "สถานะ": order.OrderStatus || '-',
                    "ยอดรวม (บาท)": order.TotalPrice || 0,
                    "รายการสินค้า": itemsStr,
                    "ที่อยู่จัดส่ง": address
                };
            });

            downloadCSV(formattedData, 'Orders_Export_All');

        } catch (error) {
            console.error("Error exporting orders: ", error);
            alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
        }
    };

    // ฟังก์ชันสำหรับดาวน์โหลดข้อมูลสินค้าเป็นไฟล์ CSV
    const exportProducts = () => {
        const formattedData = products.map(product => {
            return {
                "Product ID": product.id,
                "ชื่อสินค้า": product.ProductName || '-',
                "หมวดหมู่": product.ProductCategory || '-',
                "ราคา (บาท)": product.Price || 0,
                "ต้นทุน (บาท)": product.CostPrice || 0,
                "สต็อก": product.Stock || 0,
                "สถานะ": product.ProductStatus || '-',
                "พืชที่รองรับ": Array.isArray(product.PlantType) ? product.PlantType.join(', ') : (product.PlantType || '-'),
                "พื้นที่ที่รองรับ": Array.isArray(product.AreaType) ? product.AreaType.join(', ') : (product.AreaType || '-')
            };
        });
        downloadCSV(formattedData, 'Products_Export');
    };

    const exportPayments = () => {
        const formattedData = payments.map(pay => {
            let date = pay.PaymentDate;
            if (date?.toDate) date = date.toDate().toLocaleString('th-TH');

            return {
                "Payment ID": pay.id,
                "Order ID": pay.OrderID || '-',
                "วันที่ชำระเงิน": date || '-',
                "ช่องทางชำระ": pay.Method || '-',
                "ยอดเงิน (บาท)": pay.TotalPrice || 0,
                "สถานะ": pay.Status || '-'
            };
        });
        downloadCSV(formattedData, 'Payments_Export');
    };


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <AdminNavbar />

            {/* Tooltip สำหรับแผนที่จังหวัด (แสดงเมื่อ hover) */}
            {tooltipContent && activeTab === 'locations' && (
                <div className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mt-[-10px]"
                    style={{ left: tooltipContent.x, top: tooltipContent.y }}>
                    <p className="font-bold text-center border-b border-gray-600 pb-1 mb-1">{tooltipContent.name}</p>
                    {viewMode === 'BOTH' ? (
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-blue-300">ยอดขาย: ฿{formatValueDisplay(tooltipContent.revenue, 'REVENUE')}</p>
                            <p className="text-emerald-300">จำนวน: {formatValueDisplay(tooltipContent.quantity, 'QUANTITY')} ชิ้น</p>
                        </div>
                    ) : (
                        <p className="text-gray-300">
                            {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                            {formatValueDisplay(tooltipContent.value)}
                            {viewMode === 'QUANTITY' && ' ชิ้น'}
                        </p>
                    )}
                </div>
            )}

            <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">

                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="text-blue-600" /> Dashboard & Analytics
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">ระบบวิเคราะห์ยอดขายและพฤติกรรมลูกค้า</p>

                        <div className="flex gap-2 mt-4">
                            <button onClick={exportOrders} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors border border-blue-200">
                                <Download size={14} /> Export Orders
                            </button>
                            <button onClick={exportProducts} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-bold transition-colors border border-emerald-200">
                                <Download size={14} /> Export Products
                            </button>
                            <button onClick={exportPayments} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-md text-xs font-bold transition-colors border border-orange-200">
                                <Download size={14} /> Export Payments
                            </button>
                        </div>
                    </div>

                    {/* เปลี่ยนโครงสร้างส่วน Filter ให้จัดเรียงสวยงาม */}
                    <div className="flex flex-col md:flex-row items-end gap-2">

                        {/* เพิ่ม Dropdown สินค้า */}
                        {/* Custom Searchable Dropdown */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200 relative" ref={productDropdownRef}>
                            <span className="text-[10px] text-gray-500 font-bold px-1 shrink-0">กรองด้วยสินค้า:</span>

                            {/* ปุ่มสำหรับกดเปิด Dropdown */}
                            <button
                                type="button"
                                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                className="w-48 md:w-64 flex justify-between items-center text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
                            >
                                <span className={`truncate text-left ${selectedFilterCategories.length > 0 || selectedFilterProducts.length > 0 ? 'font-bold text-blue-700' : ''}`}>
                                    {(selectedFilterCategories.length === 0 && selectedFilterProducts.length === 0)
                                        ? 'ทั้งหมด (All)'
                                        : `เลือกแล้ว ${selectedFilterCategories.length + selectedFilterProducts.length} รายการ`}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 ml-2 shrink-0 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* หน้าต่าง Dropdown รายการสินค้า */}
                            {isProductDropdownOpen && (
                                <div className="absolute top-full left-0 md:right-0 mt-2 w-full md:w-[360px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-down">

                                    {/* ช่องพิมพ์ค้นหา (ค้นหาเฉพาะสินค้า) */}
                                    <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..."
                                                value={productSearchQuery}
                                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                                autoFocus
                                            />
                                            <Search size={14} className="absolute left-2.5 top-3 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* รายการตัวเลือก */}
                                    <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">

                                        {/* ปุ่มเคลียร์ทั้งหมด */}
                                        <div className="p-1 mb-1 border-b border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFilterCategories([]);
                                                    setSelectedFilterProducts([]);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            >
                                                ล้างการเลือกทั้งหมด
                                            </button>
                                        </div>

                                        {/* หมวดหมู่สินค้า (ซ่อนเมื่อมีการพิมพ์ค้นหาชื่อสินค้า) */}
                                        {productSearchQuery === '' && categoriesList.length > 0 && (
                                            <div className="mb-3">
                                                <div className="px-3 py-1.5 bg-blue-50 text-xs font-bold text-blue-800 uppercase tracking-wider rounded-md mb-1">หมวดหมู่สินค้า</div>
                                                {categoriesList.map(cat => (
                                                    <label key={cat} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer transition-colors group">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                            checked={selectedFilterCategories.includes(cat)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedFilterCategories([...selectedFilterCategories, cat]);
                                                                } else {
                                                                    setSelectedFilterCategories(selectedFilterCategories.filter(c => c !== cat));
                                                                }
                                                            }}
                                                        />
                                                        <span className="truncate group-hover:text-blue-600 font-medium">{categoryThaiMap[cat] || cat}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* รายการสินค้า */}
                                        <div>
                                            <div className="px-3 py-1.5 bg-emerald-50 text-xs font-bold text-emerald-800 uppercase tracking-wider rounded-md mb-1">รายชื่อสินค้าเจาะจง</div>
                                            {products
                                                .filter(p => p.ProductName?.toLowerCase().includes(productSearchQuery.toLowerCase()))
                                                .map(p => (
                                                    <label key={p.id} className="flex items-start gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer transition-colors border-b border-gray-50 last:border-0 group">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0 cursor-pointer"
                                                            checked={selectedFilterProducts.includes(p.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedFilterProducts([...selectedFilterProducts, p.id]);
                                                                } else {
                                                                    setSelectedFilterProducts(selectedFilterProducts.filter(id => id !== p.id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="truncate leading-tight text-gray-800 group-hover:text-blue-600 transition-colors font-medium">{p.ProductName}</span>
                                                            <span className="text-[10px] text-gray-400 mt-0.5">หมวด: {categoryThaiMap[p.ProductCategory] || p.ProductCategory}</span>
                                                        </div>
                                                    </label>
                                                ))
                                            }

                                            {/* กรณีค้นหาแล้วไม่เจอ */}
                                            {products.filter(p => p.ProductName?.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-6 text-center flex flex-col items-center justify-center">
                                                    <span className="text-gray-400 mb-1"><Search size={24} /></span>
                                                    <span className="text-sm text-gray-500 font-bold">ไม่พบสินค้าที่ค้นหา</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* กล่องเลือกวันที่ */}
                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold px-1">ตั้งแต่วันที่</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="text-sm border-none focus:ring-0 text-gray-700 bg-transparent cursor-pointer"
                                />
                            </div>
                            <span className="text-gray-300">-</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold px-1">ถึงวันที่</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="text-sm border-none focus:ring-0 text-gray-700 bg-transparent cursor-pointer"
                                />
                            </div>
                            {(startDate || endDate || selectedFilterCategories.length > 0 || selectedFilterProducts.length > 0) && (
                                <button
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        setSelectedFilterCategories([]);
                                        setSelectedFilterProducts([]);
                                    }}
                                    className="ml-2 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors"
                                >
                                    ล้าง
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Cards (สรุปภาพรวม) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <DollarSign size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500">ยอดขายรวมสุทธิ</p>
                            {/* ดึงยอดขายมาโชว์ ใช้วิธี force format แบบ REVENUE */}
                            <h3 className="text-2xl font-black text-gray-800">฿{formatValueDisplay(totalRevenue, 'REVENUE')}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500">จำนวนคำสั่งซื้อ</p>
                            <h3 className="text-2xl font-black text-gray-800">{formatValueDisplay(totalOrders, 'QUANTITY')} <span className="text-sm font-medium text-gray-400">ออเดอร์</span></h3>
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

                                        <button
                                            onClick={() => setViewMode('BOTH')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'BOTH' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ทั้งหมด (Cross)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* กราฟแท่ง */}
                                    <div className="h-[350px]">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">
                                            Top 5 สินค้าขายดี {viewMode === 'REVENUE' ? '(ตามยอดขาย)' : viewMode === 'QUANTITY' ? '(ตามจำนวนชิ้น)' : '(ยอดขาย vs จำนวน)'}
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
                                                {viewMode === 'BOTH' ? (
                                                    <>
                                                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fontSize: 11 }} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} axisLine={false} tickLine={false} width={60} />
                                                        <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} tickFormatter={(val) => val} axisLine={false} tickLine={false} width={40} />

                                                        {/* Tooltip โค้ดเดิมของคุณ */}
                                                        <RechartsTooltip
                                                            cursor={{ fill: '#f9fafb' }}
                                                            contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(val, name) => {
                                                                if (name === "ยอดขาย (บาท)") return [`฿${formatValueDisplay(val, 'REVENUE')}`, name];
                                                                if (name === "จำนวน (ชิ้น)") return [formatValueDisplay(val, 'QUANTITY'), name];
                                                                return [val, name];
                                                            }}
                                                        />
                                                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />

                                                        {/* 🌟 เปลี่ยนสี fill ตรงนี้เป็น #3b82f6 */}
                                                        <Bar yAxisId="left" name="ยอดขาย (บาท)" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                                        <Bar yAxisId="right" name="จำนวน (ชิ้น)" dataKey="quantity" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', dx: -10 }} tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val} width={50} domain={[0, 'auto']} />
                                                        <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val) => viewMode === 'REVENUE' ? [`฿${formatValueDisplay(val)}`, 'ยอดขาย'] : [formatValueDisplay(val), 'จำนวนชิ้น']} />
                                                        <Bar dataKey="value" fill={viewMode === 'REVENUE' ? '#4E79A7' : '#10B981'} radius={[4, 4, 0, 0]} barSize={40} />
                                                    </>
                                                )}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟโดนัท */}
                                    <div className="h-[350px]">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">
                                            สัดส่วน{viewMode === 'REVENUE' || viewMode === 'BOTH' ? 'ยอดขาย (บาท)' : 'จำนวน (ชิ้น)'}แบ่งตามจังหวัด
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={locationData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                                    {locationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-50">
                                                                    <p className="font-bold text-gray-800 text-sm mb-1.5 border-b border-gray-100 pb-1.5">
                                                                        {categoryThaiMap[data.name] || data.name}
                                                                    </p>
                                                                    {viewMode === 'BOTH' ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-xs font-bold text-blue-600">ยอดขาย: ฿{formatValueDisplay(data.revenue, 'REVENUE')}</p>
                                                                            <p className="text-xs font-bold text-emerald-600">จำนวน: {formatValueDisplay(data.quantity, 'QUANTITY')} ชิ้น</p>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-gray-600">
                                                                            {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                                                                            {formatValueDisplay(data.value)}
                                                                            {viewMode === 'QUANTITY' && ' ชิ้น'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* TAB 2: Products */}
                        {activeTab === 'products' && (
                            <div className="space-y-6">

                                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">

                                    {/* KPI การเติบโตของยอดขายและจำนวนชิ้นเปรียบเทียบกับเดือนก่อนหน้า */}
                                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
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

                                        <button
                                            onClick={() => setViewMode('BOTH')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'BOTH' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ทั้งหมด (Cross)
                                        </button>
                                    </div>
                                </div>


                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="h-[350px]">
                                        {/* กราฟแท่งแสดง Top 5 สินค้าขายดี โดยสามารถสลับดูได้ทั้งยอดขายและจำนวนชิ้นที่ขายได้ */}
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">
                                            Top 5 สินค้าขายดี {viewMode === 'REVENUE' ? '(ตามยอดขาย)' : viewMode === 'QUANTITY' ? '(ตามจำนวนชิ้น)' : '(ยอดขาย vs จำนวน)'}
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

                                                {/*  ดักเงื่อนไขให้แสดงกราฟ 2 แกน (Cross) เหมือน Tab 1 */}
                                                {viewMode === 'BOTH' ? (
                                                    <>
                                                        <YAxis yAxisId="left" orientation="left" stroke="#4E79A7" tick={{ fontSize: 11 }} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} axisLine={false} tickLine={false} width={60} />
                                                        <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} tickFormatter={(val) => val} axisLine={false} tickLine={false} width={40} />
                                                        <RechartsTooltip
                                                            cursor={{ fill: '#f9fafb' }}
                                                            contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(val, name) => {
                                                                if (name === "ยอดขาย (บาท)") return [`฿${formatValueDisplay(val, 'REVENUE')}`, name];
                                                                if (name === "จำนวน (ชิ้น)") return [formatValueDisplay(val, 'QUANTITY'), name];
                                                                return [val, name];
                                                            }}
                                                        />
                                                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                                                        <Bar yAxisId="left" name="ยอดขาย (บาท)" dataKey="revenue" fill="#4E79A7" radius={[4, 4, 0, 0]} barSize={20} />
                                                        <Bar yAxisId="right" name="จำนวน (ชิ้น)" dataKey="quantity" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <YAxis
                                                            allowDecimals={false}
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fontSize: 12, fill: '#6b7280', dx: -10 }}
                                                            tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                            width={50}
                                                            domain={[0, 'auto']}
                                                        />
                                                        <RechartsTooltip
                                                            cursor={{ fill: '#f9fafb' }}
                                                            contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(val) => viewMode === 'REVENUE' ? [`฿${formatValueDisplay(val)}`, 'ยอดขาย'] : [formatValueDisplay(val), 'จำนวนชิ้น']}
                                                        />
                                                        <Bar dataKey="value" fill={viewMode === 'REVENUE' ? '#4E79A7' : '#10B981'} radius={[4, 4, 0, 0]} barSize={40} />
                                                    </>
                                                )}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>


                                    {/* กราฟเส้นแสดงแนวโน้มยอดขายและจำนวนชิ้นที่ขายได้รายเดือน โดยสามารถสลับดูได้ทั้งยอดขายและจำนวนชิ้นที่ขายได้ */}
                                    <div className="h-[400px]">
                                        <div className="h-[350px] w-full">
                                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center justify-center gap-2">
                                                <TrendingUp size={16} className="text-blue-600" />
                                                แนวโน้ม{viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวนสินค้าที่ขายได้'}รายเดือน
                                            </h3>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={monthlySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />

                                                    {/*  เช็คว่าถ้าเป็นโหมด BOTH ให้โชว์ 2 แกนวิ่งตัดกัน */}
                                                    {viewMode === 'BOTH' ? (
                                                        <>
                                                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fontSize: 11 }} tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                                            <YAxis yAxisId="right" orientation="right" stroke="#10B981" tick={{ fontSize: 11 }} />
                                                            <RechartsTooltip
                                                                cursor={{ fill: '#f9fafb' }}
                                                                contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                                formatter={(val, name) => {
                                                                    if (name === "ยอดขาย (บาท)") return [`฿${formatValueDisplay(val, 'REVENUE')}`, name];
                                                                    if (name === "จำนวน (ชิ้น)") return [formatValueDisplay(val, 'QUANTITY'), name];
                                                                    return [val, name];
                                                                }}
                                                            />
                                                            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                                                            <Line yAxisId="left" type="monotone" name="ยอดขาย (บาท)" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                            <Line yAxisId="right" type="monotone" name="จำนวน (ชิ้น)" dataKey="quantity" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <YAxis tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                                            <RechartsTooltip formatter={(val) => viewMode === 'REVENUE' ? [`฿${formatValueDisplay(val)}`, 'ยอดขาย'] : [formatValueDisplay(val), 'จำนวนชิ้น']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                            <Line type="monotone" dataKey="value" stroke={viewMode === 'REVENUE' ? '#3b82f6' : '#10B981'} strokeWidth={3} activeDot={{ r: 8 }} dot={{ strokeWidth: 2 }} />
                                                        </>
                                                    )}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">


                                    {/* กราฟแท่งแสดงอัตราการเติบโตของยอดขายและจำนวนชิ้นที่ขายได้ของ Top 5 สินค้า โดยสามารถสลับดูได้ทั้งยอดขายและจำนวนชิ้นที่ขายได้ */}
                                    <div className="h-[400px] bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                                            <TrendingUp size={16} className="text-emerald-600" />
                                            อัตราการเติบโตของ Top 5 สินค้า (MoM %)
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={productGrowth} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} interval={0} angle={-15} textAnchor="end" height={50} tickFormatter={(name) => name.length > 20 ? `${name.substring(0, 20)}...` : name} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 12, fill: '#6b7280', dx: -5 }} axisLine={false} tickLine={false} />

                                                {viewMode === 'BOTH' ? (
                                                    <>
                                                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />

                                                        {/* Tooltip โค้ดเดิมของคุณ */}
                                                        <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val, name, props) => {
                                                            const { cRev, pRev, cQty, pQty } = props.payload;
                                                            if (name === "ยอดขาย (บาท)") {
                                                                return [
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className={val >= 0 ? 'text-blue-600 font-bold' : 'text-red-500 font-bold'}>{val > 0 ? '+' : ''}{val}%</span>
                                                                        <span className="text-xs text-gray-500 font-normal mt-1">เดือนนี้: ฿{formatValueDisplay(cRev, 'REVENUE')} <br /> เดือนก่อน: ฿{formatValueDisplay(pRev, 'REVENUE')}</span>
                                                                    </div>, 'เติบโตยอดขาย'
                                                                ];
                                                            }
                                                            if (name === "จำนวน (ชิ้น)") {
                                                                return [
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className={val >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{val > 0 ? '+' : ''}{val}%</span>
                                                                        <span className="text-xs text-gray-500 font-normal mt-1">เดือนนี้: {formatValueDisplay(cQty, 'QUANTITY')} ชิ้น <br /> เดือนก่อน: {formatValueDisplay(pQty, 'QUANTITY')} ชิ้น</span>
                                                                    </div>, 'เติบโตจำนวน'
                                                                ];
                                                            }
                                                            return [val, name];
                                                        }} />

                                                        {/* 🌟 เติม fill ตรงนี้ เพื่อแก้บั๊กกล่องสีดำใน Legend */}
                                                        <Bar name="ยอดขาย (บาท)" dataKey="revGrowth" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                                                            {productGrowth.map((entry, index) => <Cell key={`cell-rev-${index}`} fill={entry.revGrowth >= 0 ? '#3b82f6' : '#EF4444'} />)}
                                                        </Bar>
                                                        <Bar name="จำนวน (ชิ้น)" dataKey="qtyGrowth" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20}>
                                                            {productGrowth.map((entry, index) => <Cell key={`cell-qty-${index}`} fill={entry.qtyGrowth >= 0 ? '#10B981' : '#F97316'} />)}
                                                        </Bar>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val, name, props) => {
                                                            if (name === 'growth') {
                                                                const { current, previous } = props.payload;
                                                                const formatValue = (v) => viewMode === 'REVENUE' ? `฿${formatValueDisplay(v)}` : `${formatValueDisplay(v)} ชิ้น`;
                                                                return [
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className={val >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{val > 0 ? '+' : ''}{val}%</span>
                                                                        <span className="text-xs text-gray-500 font-normal mt-1">เดือนนี้: {formatValue(current)} <br /> เดือนก่อน: {formatValue(previous)}</span>
                                                                    </div>, 'เติบโต'
                                                                ];
                                                            }
                                                            return [val, name];
                                                        }} />
                                                        <Bar dataKey="growth" radius={[4, 4, 0, 0]} barSize={50}>
                                                            {productGrowth.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10B981' : '#EF4444'} />)}
                                                        </Bar>
                                                    </>
                                                )}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟเส้นแสดงแนวโน้มการเติบโตของยอดขายและจำนวนชิ้นที่ขายได้ของ Top 5 สินค้า โดยสามารถสลับดูได้ทั้งยอดขายและจำนวนชิ้นที่ขายได้ */}
                                    <div className="h-[400px] bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                                            <Activity size={16} className="text-purple-600" />
                                            กราฟเส้นแสดง % การเติบโตรายเดือน (เดือนล่าสุด เทียบ เดือนก่อน)
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={monthlySales} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 12, fill: '#6b7280', dx: -5 }} axisLine={false} tickLine={false} />
                                                <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />

                                                {viewMode === 'BOTH' ? (
                                                    <>
                                                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                                                        <RechartsTooltip cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid #32353c', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val, name) => {
                                                            if (name === 'เติบโตยอดขาย (%)' || name === 'เติบโตจำนวน (%)') return [`${val > 0 ? '+' : ''}${val}%`, name];
                                                            return [val, name];
                                                        }} />
                                                        <Line type="monotone" name="เติบโตยอดขาย (%)" dataKey="revenueGrowth" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8, fill: '#2563eb' }} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
                                                        <Line type="monotone" name="เติบโตจำนวน (%)" dataKey="quantityGrowth" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8, fill: '#059669' }} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
                                                    </>
                                                ) : (
                                                    <>
                                                        <RechartsTooltip cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: '1px solid #32353c', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(val, name) => {
                                                            if (name === 'growth') return [`${val > 0 ? '+' : ''}${val}%`, 'เติบโตเทียบเดือนก่อน'];
                                                            return [val, name];
                                                        }} />
                                                        <Line type="monotone" dataKey="growth" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8, fill: '#7c3aed' }} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} />
                                                    </>
                                                )}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

                                    {/* กราฟโดนัทแสดงสัดส่วนยอดขายและจำนวนชิ้นที่ขายได้แบ่งตามหมวดหมู่สินค้า โดยสามารถสลับดูได้ทั้งยอดขายและจำนวนชิ้นที่ขายได้ */}
                                    <div className="h-[450px] bg-gray-50/50 p-6 rounded-xl border border-gray-100 col-span-1">
                                        <h3 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                                            <Package size={16} className="text-orange-600" />
                                            สัดส่วน{viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวน'}แบ่งตามหมวดหมู่
                                        </h3>
                                        <ResponsiveContainer width="100%" height="85%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    labelLine={(props) => {
                                                        if (props.percent <= 0.05) return null;
                                                        return (
                                                            <polyline
                                                                points={props.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                stroke="#9ca3af"
                                                                strokeWidth={1}
                                                                fill="none"
                                                            />
                                                        );
                                                    }}
                                                    label={({ name, percent }) => {
                                                        if (percent <= 0.05) return null;
                                                        let shortName = name;
                                                        if (name === 'Controller&Timer') shortName = 'Controller';
                                                        if (name === 'SolenoidValve') shortName = 'Valve';
                                                        if (name === 'Fitting&Pipe') shortName = 'Fitting';

                                                        return `${shortName} ${(percent * 100).toFixed(0)}%`;
                                                    }}
                                                    style={{ fontSize: '11px', fontWeight: '500' }}
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-50">
                                                                    <p className="font-bold text-gray-800 text-sm mb-1.5 border-b border-gray-100 pb-1.5">
                                                                        {categoryThaiMap[data.name] || data.name}
                                                                    </p>
                                                                    {viewMode === 'BOTH' ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-xs font-bold text-blue-600">ยอดขาย: ฿{formatValueDisplay(data.revenue, 'REVENUE')}</p>
                                                                            <p className="text-xs font-bold text-emerald-600">จำนวน: {formatValueDisplay(data.quantity, 'QUANTITY')} ชิ้น</p>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-gray-600">
                                                                            {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                                                                            {formatValueDisplay(data.value)}
                                                                            {viewMode === 'QUANTITY' && ' ชิ้น'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>


                                    {/* กราฟกระจายแสดงความสัมพันธ์ระหว่างประเภทพื้นที่และประเภทพืช โดยขนาดของจุดแสดงถึงยอดขายหรือจำนวนชิ้นที่ขายได้ */}
                                    <div className="h-[450px] bg-gray-50/50 p-6 rounded-xl border border-gray-100 lg:col-span-2">
                                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <Map size={16} className="text-blue-600" />
                                            เมทริกซ์วิเคราะห์ความสัมพันธ์ (Area Type vs Plant Type)
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-6">
                                            ขนาดของวงกลมแสดงถึงปริมาณ{viewMode === 'REVENUE' ? 'ยอดขาย' : 'การสั่งซื้อ'}
                                            ที่เกิดจากการนำสินค้าไปใช้กับพืชและพื้นที่นั้นๆ
                                        </p>

                                        <ResponsiveContainer width="100%" height="85%">
                                            <ScatterChart margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                <XAxis
                                                    type="category" dataKey="plant" name="ชนิดพืช"
                                                    allowDuplicatedCategory={false}
                                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                                    angle={-20} textAnchor="end" axisLine={false} tickLine={false}
                                                />
                                                <YAxis
                                                    type="category" dataKey="area" name="พื้นที่"
                                                    allowDuplicatedCategory={false}
                                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                                    width={120} axisLine={false} tickLine={false}
                                                />
                                                <ZAxis
                                                    type="number" dataKey="value" range={[100, 1500]}
                                                    name={viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวน'}
                                                    unit={viewMode === 'REVENUE' ? ' ฿' : ' ชิ้น'}
                                                />
                                                <RechartsTooltip
                                                    cursor={{ strokeDasharray: '3 3' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-50">
                                                                    <p className="font-bold text-gray-800 text-sm mb-2">{data.area} <span className="text-gray-400 font-normal">x</span> {data.plant}</p>
                                                                    {viewMode === 'BOTH' ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-xs font-bold text-blue-600">ยอดขายรวม: ฿{formatValueDisplay(data.revenue, 'REVENUE')}</p>
                                                                            <p className="text-xs font-bold text-emerald-600">จำนวนรวม: {formatValueDisplay(data.quantity, 'QUANTITY')} ชิ้น</p>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-emerald-600">
                                                                            {viewMode === 'REVENUE' ? 'ยอดขายรวม: ฿' : 'จำนวนรวม: '}
                                                                            {formatValueDisplay(data.value)} {viewMode === 'QUANTITY' && 'ชิ้น'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Scatter data={scatterData} shape="circle">
                                                    {scatterData.map((entry, index) => {
                                                        const maxValue = Math.max(...scatterData.map(d => d.value), 1);
                                                        const ratio = Math.min(entry.value / maxValue, 1);

                                                        const lightColor = "#bbfadd";
                                                        const midColor = "#10B981";
                                                        const darkColor = "#047857";

                                                        let bubbleColor = lightColor;
                                                        if (ratio > 0.3) bubbleColor = midColor;
                                                        if (ratio > 0.7) bubbleColor = darkColor;

                                                        return <Cell key={`cell-${index}`} fill={bubbleColor} fillOpacity={0.8} />;
                                                    })}
                                                </Scatter>
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>

                                </div>

                            </div>
                        )}

                        {/* TAB 3: Locations */}
                        {activeTab === 'locations' && (
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

                                        <button
                                            onClick={() => setViewMode('BOTH')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'BOTH' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            ทั้งหมด (Cross)
                                        </button>
                                    </div>
                                </div>



                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-[450px]">

                                    {/* กราฟโดนัทแสดงสัดส่วนยอดขายและจำนวนชิ้นที่ขายได้แบ่งตามจังหวัด โดยแสดงเฉพาะ 6 จังหวัดที่มียอดขายหรือจำนวนชิ้นสูงสุด และมีการดักซ่อนเส้นโยงและตัวอักษรของจังหวัดที่มีสัดส่วนน้อยกว่า 3% เพื่อความชัดเจน */}
                                    <div className="w-full h-full">
                                        <h3 className="text-sm font-bold text-gray-700 mb-4 text-center bg-gray-50 py-2 rounded-lg border border-gray-100">
                                            Top 6 จังหวัดที่มียอด{viewMode === 'REVENUE' ? 'ขายสูงสุด' : 'สั่งซื้อเยอะที่สุด'}
                                        </h3>
                                        <ResponsiveContainer width="100%" height="85%">
                                            <PieChart>
                                                <Pie
                                                    data={locationData.slice(0, 6)}
                                                    cx="50%" cy="50%"
                                                    outerRadius={110}
                                                    dataKey="value"

                                                    //1. ดักซ่อนเส้นโยงถ้าค่าน้อยกว่า 3% (0.03)
                                                    labelLine={(props) => {
                                                        if (props.percent < 0.03) return null;
                                                        return <polyline points={props.points.map(p => `${p.x},${p.y}`).join(' ')} stroke="#9ca3af" strokeWidth={1} fill="none" />;
                                                    }}

                                                    //2. ดักซ่อนตัวอักษรถ้าค่าน้อยกว่า 3%
                                                    label={({ name, percent }) => {
                                                        if (percent < 0.03) return null;
                                                        return `${name} ${(percent * 100).toFixed(1)}%`;
                                                    }}
                                                    style={{ fontSize: '11px', fontWeight: '500' }}
                                                >
                                                    {locationData.slice(0, 6).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-50">
                                                                    <p className="font-bold text-gray-800 text-sm mb-1.5 border-b border-gray-100 pb-1.5">
                                                                        {categoryThaiMap[data.name] || data.name}
                                                                    </p>
                                                                    {viewMode === 'BOTH' ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <p className="text-xs font-bold text-blue-600">ยอดขาย: ฿{formatValueDisplay(data.revenue, 'REVENUE')}</p>
                                                                            <p className="text-xs font-bold text-emerald-600">จำนวน: {formatValueDisplay(data.quantity, 'QUANTITY')} ชิ้น</p>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-gray-600">
                                                                            {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                                                                            {formatValueDisplay(data.value)}
                                                                            {viewMode === 'QUANTITY' && ' ชิ้น'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />

                                                {/* 3. เพิ่ม Legend (คำอธิบายสี) ด้านล่างกราฟ */}
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟแผนที่ประเทศไทยแสดงการกระจายตัวของยอดขายและจำนวนชิ้นที่ขายได้ในแต่ละจังหวัด โดยใช้สีเข้มแสดงถึงยอดขายหรือจำนวนชิ้นที่สูง และสีอ่อนแสดงถึงยอดขายหรือจำนวนชิ้นที่ต่ำ และมีการแสดง tooltip เมื่อ hover ที่แต่ละจังหวัดเพื่อแสดงข้อมูลยอดขายหรือจำนวนชิ้นที่ขายได้ของจังหวัดนั้นๆ */}
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
                                                                        fill={mapValue > 0 ? colorScale(mapValue) : "#F3F4F6"}
                                                                        stroke="#FFFFFF"
                                                                        strokeWidth={0.5}
                                                                        className="outline-none hover:opacity-80 transition-opacity cursor-pointer"

                                                                        onClick={() => {
                                                                            if (mapValue > 0) {
                                                                                setSelectedProvince(displayProvinceName);
                                                                            }
                                                                        }}

                                                                        onMouseMove={(e) => {
                                                                            setTooltipContent({
                                                                                name: displayProvinceName,
                                                                                value: mapValue,
                                                                                revenue: provinceData ? provinceData.revenue : 0, 
                                                                                quantity: provinceData ? provinceData.quantity : 0, 
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

                                {selectedProvince && (
                                    <div className="mt-8 p-6 bg-blue-50/30 border border-blue-100 rounded-xl animate-fade-in">
                                        <div className="flex justify-between items-center mb-6 border-b border-blue-100 pb-3">
                                            <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                                <MapPin className="text-blue-600" />
                                                เจาะลึกยอดขาย: จังหวัด {selectedProvince}
                                            </h3>
                                            <button
                                                onClick={() => setSelectedProvince(null)}
                                                className="text-xs font-bold text-gray-400 hover:text-red-500 transition"
                                            >
                                                [ปิด]
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[300px]">
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
                                                <h4 className="text-xs font-bold text-gray-500 text-center mb-2">หมวดหมู่สินค้ายอดนิยม</h4>
                                                <ResponsiveContainer width="100%" height="90%">
                                                    <PieChart>
                                                        <Pie
                                                            data={provinceDetails.categories}
                                                            cx="50%" cy="50%"
                                                            innerRadius={40} outerRadius={70}
                                                            paddingAngle={2} dataKey="value"
                                                            labelLine={(props) => {
                                                                if (props.percent <= 0.05) return null;
                                                                return <polyline points={props.points.map(p => `${p.x},${p.y}`).join(' ')} stroke="#9ca3af" strokeWidth={1} fill="none" />;
                                                            }}
                                                            label={({ name, percent }) => {
                                                                if (percent <= 0.05) return null;
                                                                let shortName = name;
                                                                if (name === 'Controller&Timer') shortName = 'Controller';
                                                                if (name === 'SolenoidValve') shortName = 'Valve';
                                                                if (name === 'Fitting&Pipe') shortName = 'Fitting';
                                                                return `${shortName} ${(percent * 100).toFixed(0)}%`;
                                                            }}
                                                            style={{ fontSize: '10px', fontWeight: '500' }}
                                                        >
                                                            {provinceDetails.categories.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const data = payload[0].payload;
                                                                    return (
                                                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 z-50">
                                                                            <p className="font-bold text-gray-800 text-sm mb-1.5 border-b border-gray-100 pb-1.5">
                                                                                {categoryThaiMap[data.name] || data.name}
                                                                            </p>
                                                                            {viewMode === 'BOTH' ? (
                                                                                <div className="flex flex-col gap-1">
                                                                                    <p className="text-xs font-bold text-blue-600">ยอดขาย: ฿{formatValueDisplay(data.revenue, 'REVENUE')}</p>
                                                                                    <p className="text-xs font-bold text-emerald-600">จำนวน: {formatValueDisplay(data.quantity, 'QUANTITY')} ชิ้น</p>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-xs font-bold text-gray-600">
                                                                                    {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                                                                                    {formatValueDisplay(data.value)}
                                                                                    {viewMode === 'QUANTITY' && ' ชิ้น'}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
                                                <h4 className="text-xs font-bold text-gray-500 text-center mb-2">Top 5 สินค้าที่ขายดีที่สุด</h4>
                                                <ResponsiveContainer width="100%" height="90%">
                                                    <BarChart data={provinceDetails.products} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(name) => name.length > 15 ? `${name.substring(0, 15)}...` : name} />
                                                        
                                                        {viewMode === 'BOTH' ? (
                                                            <>
                                                                {/* 🌟 สำหรับแนวนอน (Vertical) เราสร้าง 2 แกน X ซ้อนกัน */}
                                                                <XAxis type="number" xAxisId="bottom" hide />
                                                                <XAxis type="number" xAxisId="top" hide />
                                                                <RechartsTooltip
                                                                    cursor={{ fill: '#f9fafb' }}
                                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                                    formatter={(val, name) => {
                                                                        if (name === "ยอดขาย (บาท)") return [`฿${formatValueDisplay(val, 'REVENUE')}`, name];
                                                                        if (name === "จำนวน (ชิ้น)") return [formatValueDisplay(val, 'QUANTITY'), name];
                                                                        return [val, name];
                                                                    }}
                                                                />
                                                                <Legend verticalAlign="top" height={20} wrapperStyle={{ fontSize: '10px' }} />
                                                                <Bar xAxisId="bottom" name="ยอดขาย (บาท)" dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={8} />
                                                                <Bar xAxisId="top" name="จำนวน (ชิ้น)" dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} barSize={8} />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XAxis type="number" hide />
                                                                <RechartsTooltip
                                                                    cursor={{ fill: '#f9fafb' }}
                                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${formatValueDisplay(val)}`, 'ยอดขาย'] : [formatValueDisplay(val), 'จำนวนชิ้น']}
                                                                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                                                />
                                                                <Bar dataKey="value" fill={viewMode === 'REVENUE' ? '#3b82f6' : '#10B981'} radius={[0, 4, 4, 0]} barSize={20}>
                                                                    <LabelList
                                                                        dataKey="value"
                                                                        position="right"
                                                                        formatter={(val) => viewMode === 'REVENUE' ? `฿${formatValueDisplay(val)}` : `${formatValueDisplay(val)} ชิ้น`}
                                                                        style={{ fontSize: '10px', fill: '#6b7280', fontWeight: 'bold' }}
                                                                    />
                                                                </Bar>
                                                            </>
                                                        )}
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;