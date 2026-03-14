import React, { useState, useEffect, use } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../FirebaseConfig';
import AdminNavbar from '../../components/Admin/AdminNavbar';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine,
    ScatterChart, Scatter, ZAxis, // . เพิ่ม 3 ตัวนี้
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { TrendingUp, TrendingDown, Package, Map, DollarSign, ShoppingCart, MapPin, Activity, Download } from 'lucide-react';

import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps';
import { scaleLinear } from "d3-scale";

import geoUrlData from '../../assets/Geo/thailand.json';
import { toast } from 'react-toastify';



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
    const [products, setProducts] = useState([])
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const [tooltipContent, setTooltipContent] = useState("");
    const [viewMode, setViewMode] = useState('REVENUE')

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [selectedProvince, setSelectedProvince] = useState(null);


    const COLORS = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1'];
    useEffect(() => {
        // ดึงเฉพาะออเดอร์ที่ไม่ถูกยกเลิกมาวิเคราะห์
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
            unsubscribePayments();// . อย่าลืม clear subscription
        };
    }, []);


    const filteredOrders = orders.filter(order => {

        if (!startDate || !endDate) return true;

        let orderDate;
        if (order.OrderDate?.toDate) orderDate = order.OrderDate.toDate();
        else if (order.OrderDate) orderDate = new Date(order.OrderDate);
        else return false;

        orderDate.setHours(0, 0, 0, 0);

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (orderDate < start) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // ให้ครอบคลุมถึงสิ้นวันของ endDate
            if (orderDate > end) return false;
        }
        return true;
    });





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

        const sortedKeys = Object.keys(sortedData).sort();
        return sortedKeys.map((key, index) => {
            const currentVal = viewMode === 'REVENUE' ? sortedData[key].totalRevenue : sortedData[key].totalQuantity;
            let growth = 0;

            // . คำนวณ % การเติบโตเทียบกับเดือนก่อนหน้า
            if (index > 0) {
                const prevKey = sortedKeys[index - 1];
                const prevVal = viewMode === 'REVENUE' ? sortedData[prevKey].totalRevenue : sortedData[prevKey].totalQuantity;

                if (prevVal > 0) {
                    growth = ((currentVal - prevVal) / prevVal) * 100;
                } else if (currentVal > 0) {
                    growth = 100; // เดือนก่อนขายไม่ได้ เดือนนี้ขายได้ ตีเป็นบวก 100%
                }
            }

            return {
                name: sortedData[key].label,
                value: currentVal,
                growth: Number(growth.toFixed(1)) // . เก็บค่า % การเติบโตเพื่อเอาไปวาดกราฟเส้น
            };
        });
    };



    const getTopProducts = () => {
        const productCount = {};
        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const name = item.ProductName || 'Unknown';
                const qty = Number(item.Quantity) || 1;
                // . คำนวณยอดขายของสินค้านั้นๆ ด้วย
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
                // . สร้างฟิลด์ value ไว้โชว์บนกราฟ
                value: viewMode === 'REVENUE' ? productCount[key].revenue : productCount[key].qty
            }))
            // . เรียงตาม value
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    };


    const getLocationData = () => {
        const locationCount = {};
        filteredOrders.forEach(order => {
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
                // . ส่งค่าออกไปเป็น value ตาม viewMode
                value: viewMode === 'REVENUE' ? locationCount[key].revenue : locationCount[key].qty
            }))
            .sort((a, b) => b.value - a.value);
    };

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
                    const val = viewMode === 'REVENUE' ? qty * price : qty;

                    const pInfo = products.find(p => p.id === pid);
                    const cat = pInfo ? (pInfo.ProductCategory || 'ไม่ระบุ') : 'ไม่ระบุ';

                    if (!catMap[cat]) catMap[cat] = 0;
                    catMap[cat] += val;

                    if (!prodMap[name]) prodMap[name] = 0;
                    prodMap[name] += val;
                })

            }

        })
        return {
            categories: Object.keys(catMap).map(k => ({ name: k, value: catMap[k] })).sort((a, b) => b.value - a.value),
            products: Object.keys(prodMap).map(k => ({ name: k, value: prodMap[k] })).sort((a, b) => b.value - a.value).slice(0, 5) // เอาแค่ Top 5
        };
    };

    const provinceDetails = getProvinceDetailData(selectedProvince);



    const monthlySales = getMonthlySalesData();
    const topProducts = getTopProducts();
    const locationData = getLocationData();

    const maxLocationValue = Math.max(...locationData.map(d => d.value), 0); // . เปลี่ยนเป็นหาค่ามากสุดจาก d.value
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


    const getScatterData = () => {
        if (orders.length === 0 || products.length === 0) return [];

        const matrix = {};

        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const productId = item.ProductID; // ดึง ProductID จากในออเดอร์
                const qty = Number(item.Quantity) || 1;
                const price = Number(item.Price || 0);
                const value = viewMode === 'REVENUE' ? qty * price : qty; // เช็คตามปุ่มที่กด

                // . ไปหาข้อมูลสินค้าในตาราง Products เพื่อดู Area และ Plant
                const productInfo = products.find(p => p.id === productId);

                if (productInfo) {
                    const areas = Array.isArray(productInfo.AreaType) ? productInfo.AreaType : [];
                    const plants = Array.isArray(productInfo.PlantType) ? productInfo.PlantType : [];

                    // จับคู่ไขว้ (Cross Join) พื้นที่และพืชทุกแบบที่สินค้านี้รองรับ
                    areas.forEach(area => {
                        plants.forEach(plant => {
                            const key = `${area}_${plant}`;
                            if (!matrix[key]) {
                                matrix[key] = { area, plant, value: 0 };
                            }
                            matrix[key].value += value;
                        });
                    });
                }
            });
        });

        // คืนค่าเป็น Array และกรองเอาเฉพาะจุดที่มียอดขาย > 0
        return Object.values(matrix).filter(d => d.value > 0);
    };

    const scatterData = getScatterData();

    const getCategoryData = () => {
        if (orders.length === 0 || products.length === 0) return [];
        const categoryCount = {};

        filteredOrders.forEach(order => {
            (order.Items || []).forEach(item => {
                const productId = item.ProductID;
                const qty = Number(item.Quantity) || 1;
                const price = Number(item.Price || 0);
                const value = viewMode === 'REVENUE' ? qty * price : qty;

                // ไปหาข้อมูลสินค้าในตาราง Products เพื่อดู ProductCategory
                const productInfo = products.find(p => p.id === productId);
                const category = productInfo ? (productInfo.ProductCategory || 'ไม่ระบุ') : 'ไม่ระบุ';

                if (!categoryCount[category]) {
                    categoryCount[category] = 0;
                }
                categoryCount[category] += value;
            });
        });

        // คืนค่าและเรียงจากมากไปน้อย
        return Object.keys(categoryCount)
            .map(key => ({
                name: key,
                value: categoryCount[key]
            }))
            .sort((a, b) => b.value - a.value);
    };

    const categoryData = getCategoryData();


    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.TotalPrice) || 0), 0);
    const totalOrders = filteredOrders.length;

    const downloadCSV = (dataArray, filename) => {
        if (dataArray.length === 0) return alert("ไม่มีข้อมูลสำหรับ Export");

        const headers = Object.keys(dataArray[0]);

        const csvRows = []
        csvRows.push(headers.join(','));

        for (const row of dataArray) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '""'); // จัดการเครื่องหมายคำพูดที่ซ้อนกัน
                return `"${escaped}"`; // ครอบด้วย "" ป้องกันลูกน้ำในข้อความทำให้คอลัมน์เพี้ยน
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

    //  3.1 ฟังก์ชัน Export Orders (ดึงใหม่ทั้งหมดทุกสถานะ และ ไม่กรองวันที่)
    const exportOrders = async () => {
        try {
            // 1. ดึงข้อมูล Orders ทั้งหมดจาก Firebase (ไม่สนสถานะ)
            const querySnapshot = await getDocs(collection(db, "orders"));
            const allOrdersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (allOrdersData.length === 0) {
                return alert("ไม่มีข้อมูลออเดอร์ในระบบ");
            }

            // 2. จัด Format ข้อมูลทั้งหมดเพื่อเตรียมลง CSV ทันที (ไม่ต้องผ่านตัวกรอง)
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

            // 3. สั่งดาวน์โหลด
            downloadCSV(formattedData, 'Orders_Export_All');

        } catch (error) {
            console.error("Error exporting orders: ", error);
            alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
        }
    };

    //  3.2 ฟังก์ชัน Export Products
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

    //  3.3 ฟังก์ชัน Export Payments
    const exportPayments = () => {
        const formattedData = payments.map(pay => {
            // แปลงวันที่ (ถ้าเก็บเป็น String ตามในรูป หรือถ้าเป็น Timestamp ก็แปลงได้)
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

            {tooltipContent && activeTab === 'locations' && (
                <div className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mt-[-10px]"
                    style={{ left: tooltipContent.x, top: tooltipContent.y }}>
                    <p className="font-bold text-center">{tooltipContent.name}</p>
                    {/* . เปลี่ยนข้อความให้สอดคล้องกับมุมมองและเปลี่ยนตัวแปรเป็น .value */}
                    <p className="text-gray-300">
                        {viewMode === 'REVENUE' ? 'ยอดขาย: ฿' : 'จำนวน: '}
                        {tooltipContent.value?.toLocaleString()}
                        {viewMode === 'QUANTITY' && ' ชิ้น'}
                    </p>
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

                    {/* . 4. UI สำหรับเลือกช่วงเวลา */}
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
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="ml-2 px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors"
                            >
                                ล้าง
                            </button>
                        )}
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
                                        {/* . 1. แก้ไขชื่อหัวข้อให้เปลี่ยนตามมุมมองที่เลือก */}
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

                                                {/* . 2. เพิ่ม Format แกน Y ให้แสดงเป็นจำนวนเงินหรือจำนวนชิ้นให้ถูกต้อง */}
                                                <YAxis
                                                    allowDecimals={false}
                                                    tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                />

                                                {/* . 3. อัปเดต Tooltip ให้แสดงคำว่า 'ยอดขาย' หรือ 'จำนวนชิ้น' ตอนเอาเมาส์ชี้ */}
                                                <RechartsTooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                />

                                                {/* . 4. เปลี่ยน dataKey ตรงนี้จาก "จำนวนชิ้น" เป็น "value" */}
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
                            <div className="space-y-6"> {/* . เอา <div className="space-y-6"> มาครอบตรงนี้แทน */}


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

                                {/* . ปุ่มสลับมุมมอง */}
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
                                        {/* . เปลี่ยนข้อความให้เปลี่ยนตามมุมมอง */}
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
                                                    // . จัด Format ตัวเลขแกน Y ให้สวยงาม
                                                    tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                    width={50}
                                                    domain={[0, 'auto']}
                                                />
                                                <RechartsTooltip
                                                    cursor={{ fill: '#f9fafb' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    // . จัด Format ใน Tooltip
                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                />
                                                {/* . เปลี่ยน dataKey เป็น 'value' เพื่อรองรับ 2 มุมมอง */}
                                                <Bar dataKey="value" fill="#4E79A7" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟเส้น */}
                                    <div className="h-[400px]">
                                        <div className="h-[350px] w-full">
                                            {/* . เปลี่ยนข้อความให้เปลี่ยนตามมุมมอง */}
                                            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center justify-center gap-2">
                                                <TrendingUp size={16} className="text-blue-600" />
                                                แนวโน้ม{viewMode === 'REVENUE' ? 'ยอดขาย' : 'จำนวนสินค้าที่ขายได้'}รายเดือน
                                            </h3>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={monthlySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />

                                                    {/* . จัด Format แกน Y */}
                                                    <YAxis
                                                        tickFormatter={(val) => viewMode === 'REVENUE' ? `฿${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}` : val}
                                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                                    />

                                                    {/* . จัด Format ใน Tooltip */}
                                                    <RechartsTooltip
                                                        formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    {/* . เปลี่ยน dataKey เป็น 'value' */}
                                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8, fill: '#2563eb' }} dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">

                                    {/* กราฟแท่ง: การเติบโตรายสินค้า (อันเดิมที่คุณเพิ่มไป) */}
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
                                                <RechartsTooltip
                                                    cursor={{ fill: '#f3f4f6' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(val, name, props) => {
                                                        if (name === 'growth') {
                                                            const { current, previous } = props.payload;
                                                            const formatValue = (v) => viewMode === 'REVENUE' ? `฿${v.toLocaleString()}` : `${v.toLocaleString()} ชิ้น`;
                                                            return [
                                                                <div className="flex flex-col gap-1">
                                                                    <span className={val >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                                                                        {val > 0 ? '+' : ''}{val}%
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 font-normal mt-1">
                                                                        เดือนนี้: {formatValue(current)} <br /> เดือนก่อน: {formatValue(previous)}
                                                                    </span>
                                                                </div>,
                                                                'เติบโต'
                                                            ];
                                                        }
                                                        return [val, name];
                                                    }}
                                                />
                                                <Bar dataKey="growth" radius={[4, 4, 0, 0]} barSize={50}>
                                                    {productGrowth.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10B981' : '#EF4444'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* . กราฟเส้น: แนวโน้มอัตราการเติบโตรายเดือน (อันใหม่) . */}
                                    <div className="h-[400px] bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-700 mb-6 flex items-center gap-2">
                                            <Activity size={16} className="text-purple-600" />
                                            กราฟเส้นแสดง % การเติบโตรายเดือน (เดือนล่าสุด เทียบ เดือนก่อน)
                                        </h3>
                                        <ResponsiveContainer width="100%" height="100%">
                                            {/* ใช้ข้อมูล monthlySales เพราะเรายัด growth เข้าไปแล้ว */}
                                            <LineChart data={monthlySales} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 12, fill: '#6b7280', dx: -5 }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip
                                                    cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #32353c', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(val, name) => {
                                                        if (name === 'growth') {
                                                            return [`${val > 0 ? '+' : ''}${val}%`, 'เติบโตเทียบเดือนก่อน'];
                                                        }
                                                        return [val, name];
                                                    }}
                                                />
                                                {/* . เส้นอ้างอิง 0% เพื่อให้ดูง่ายว่าเดือนไหนโตขึ้น เดือนไหนยอดตก */}
                                                <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />

                                                <Line
                                                    type="monotone"
                                                    dataKey="growth"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    activeDot={{ r: 8, fill: '#7c3aed' }}
                                                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

                                    {/* กราฟโดนัท: สัดส่วนยอดขายแบ่งตามหมวดหมู่สินค้า (ใหม่) */}
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
                                                    // . 1. ลดขนาดรัศมีวงกลมลง เพื่อให้มีระยะขอบ (Margin) สำหรับวาดตัวหนังสือ
                                                    innerRadius={55}
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    // . 2. ปรับแต่งตัวหนังสือ (ย่อคำ + ลดขนาดฟอนต์)
                                                    labelLine={(props) => {
                                                        // ถ้าน้อยกว่าหรือเท่ากับ 5% ให้ return null (ซ่อนเส้น)
                                                        if (props.percent <= 0.05) return null;

                                                        // ถ้ามากกว่า 5% ให้วาดเส้นตามพิกัด (points) ที่ Recharts คำนวณให้
                                                        return (
                                                            <polyline
                                                                points={props.points.map(p => `${p.x},${p.y}`).join(' ')}
                                                                stroke="#9ca3af"
                                                                strokeWidth={1}
                                                                fill="none"
                                                            />
                                                        );
                                                    }} // เพิ่มเส้นโยงให้ดูง่ายขึ้น
                                                    label={({ name, percent }) => {

                                                        if (percent <= 0.05) return null; // ซ่อนสัดส่วนที่น้อยกว่า 5%

                                                        // ย่อชื่อหมวดหมู่ที่ยาวเกินไปให้อ่านง่ายขึ้น
                                                        let shortName = name;
                                                        if (name === 'Controller&Timer') shortName = 'Controller';
                                                        if (name === 'SolenoidValve') shortName = 'Valve';
                                                        if (name === 'Fitting&Pipe') shortName = 'Fitting';

                                                        return `${shortName} ${(percent * 100).toFixed(0)}%`;
                                                    }}
                                                    style={{ fontSize: '11px', fontWeight: '500' }} // เล็กลงนิดนึงจะได้ไม่ชนกัน
                                                >
                                                    {categoryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip
                                                    formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* กราฟ Bubble Matrix (อันเดิม ขยับมาเป็น 2 คอลัมน์) */}
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
                                                                    <p className="font-bold text-gray-800 text-sm mb-1">{data.area} <span className="text-gray-400 font-normal">x</span> {data.plant}</p>
                                                                    <p className="text-xs font-bold text-emerald-600">
                                                                        {viewMode === 'REVENUE' ? 'ยอดขายรวม: ฿' : 'จำนวนรวม: '}
                                                                        {data.value.toLocaleString()} {viewMode === 'QUANTITY' && 'ชิ้น'}
                                                                    </p>
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

                                                        // . แก้ไขสีกราฟขวา: ใช้กลุ่มสีโทนเขียวไล่ระดับแทนโทนฟ้า
                                                        const lightColor = "#bbfadd"; // เขียวอ่อนมาก (Emerald 50)
                                                        const midColor = "#10B981";   // เขียวหลัก (Emerald 500)
                                                        const darkColor = "#047857";  // เขียวเข้ม (Emerald 700)

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
                            <div className="space-y-6"> {/* . เพิ่มกล่องครอบแบบเดียวกับ Products */}

                                {/* . ปุ่มสลับมุมมอง */}
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
                                                {/* . เปลี่ยน dataKey เป็น "value" และใส่ slice(0,6) ตรงนี้แทนเพื่อให้กราฟโชว์แค่ 6 อันดับ */}
                                                <Pie data={locationData.slice(0, 6)} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {locationData.slice(0, 6).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                {/* . อัปเดต Tooltip วงกลมให้เปลี่ยนตามมุมมอง */}
                                                <RechartsTooltip formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* . ฝั่งขวา: แผนที่ประเทศไทย */}
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

                                                                // . ดึงค่า mapValue มาจาก provinceData.value
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

                                                                        // . 3. เพิ่ม onClick เพื่อเซ็ตค่าจังหวัด
                                                                        onClick={() => {
                                                                            if (mapValue > 0) { // กดดูได้เฉพาะจังหวัดที่มียอด
                                                                                setSelectedProvince(displayProvinceName);
                                                                            }
                                                                        }}

                                                                        onMouseMove={(e) => {
                                                                            setTooltipContent({
                                                                                name: displayProvinceName,
                                                                                value: mapValue,
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
                                            {/* กราฟโดนัท: หมวดหมู่สินค้าที่ขายได้ในจังหวัดนี้ */}
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
                                                <h4 className="text-xs font-bold text-gray-500 text-center mb-2">หมวดหมู่สินค้ายอดนิยม</h4>
                                                <ResponsiveContainer width="100%" height="90%">
                                                    <PieChart>
                                                        <Pie
                                                            data={provinceDetails.categories}
                                                            cx="50%" cy="50%"
                                                            innerRadius={40} outerRadius={70}
                                                            paddingAngle={2} dataKey="value"
                                                            // . เพิ่มเส้นโยงและ % เหมือนกราฟหน้า Products
                                                            labelLine={(props) => {
                                                                if (props.percent <= 0.05) return null;
                                                                return <polyline points={props.points.map(p => `${p.x},${p.y}`).join(' ')} stroke="#9ca3af" strokeWidth={1} fill="none" />;
                                                            }}
                                                            label={({ name, percent }) => {
                                                                if (percent <= 0.05) return null; // ซ่อนถ้าน้อยกว่า 5%
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
                                                        <RechartsTooltip formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* กราฟแท่ง: สินค้าเฉพาะเจาะจงที่ขายได้ในจังหวัดนี้ */}
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-full">
                                                <h4 className="text-xs font-bold text-gray-500 text-center mb-2">Top 5 สินค้าที่ขายดีที่สุด</h4>
                                                <ResponsiveContainer width="100%" height="90%">
                                                    {/*  เพิ่ม margin right เป็น 60 เพื่อไม่ให้ตัวเลขที่ยื่นออกมาโดนตัดขอบ */}
                                                    <BarChart data={provinceDetails.products} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(name) => name.length > 15 ? `${name.substring(0, 15)}...` : name} />
                                                        <RechartsTooltip 
                                                            cursor={{ fill: '#f9fafb' }}
                                                            formatter={(val) => viewMode === 'REVENUE' ? [`฿${val.toLocaleString()}`, 'ยอดขาย'] : [val.toLocaleString(), 'จำนวนชิ้น']}
                                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                                        />
                                                        <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20}>
                                                            {/* . เพิ่มตัวเลขกำกับไว้ที่ปลายแท่ง (ขวามือ) */}
                                                            <LabelList 
                                                                dataKey="value" 
                                                                position="right" 
                                                                formatter={(val) => viewMode === 'REVENUE' ? `฿${val.toLocaleString()}` : `${val.toLocaleString()} ชิ้น`}
                                                                style={{ fontSize: '10px', fill: '#6b7280', fontWeight: 'bold' }}
                                                            />
                                                        </Bar>
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