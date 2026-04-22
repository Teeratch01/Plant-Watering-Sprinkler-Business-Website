import React, { useState, useEffect } from 'react';
import { db } from '../FirebaseConfig'; // ปรับ path ตามจริง
import { collection, query, where, getDocs } from "firebase/firestore";
import { Search, Map, Leaf, ChevronDown, PackageX, ChevronRight, RotateCcw, SlidersHorizontal, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import SearchImg from '../assets/Product/Search_Backgroud.jpg';
import { useNavigate } from 'react-router-dom';
import AddToCartModal from '../components/AddToCartModal';
// import CategoryKnowledgeBanner from '../components/CategoryKnowledgeBanner';

function ProductsPage() {

  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [criteria, setCriteria] = useState({
    keyword: '',
    areaType: '',
    plantType: '',
    minPrice: '',
    maxPrice: '',
    targetArea: '',     // ขนาดพื้นที่ (ตร.ม.)
    targetFlow: '',     // ปริมาณน้ำ (m³/h)
    targetPressure: ''  // แรงดันน้ำ (Bar)
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // const handleChange = (e) => {
  //   setCriteria({ ...criteria, [e.target.name]: e.target.value });
  // };

  // const handleReset = () => {
  //   setCriteria({
  //     keyword: '', areaType: '', plantType: '',
  //     minPrice: '', maxPrice: '', targetArea: '', targetFlow: '', targetPressure: ''
  //   });
  //   setHasSearched(false);
  //   setSelectedCategory("All");
  //   fetchProducts();
  // };

  const categoryMenu = [
    { id: "All", label: "All Products" },
    { id: "Pump", label: "ปั๊มน้ำ(Pump)" },
    { id: "SolenoidValve", label: "วาล์วไฟฟ้า(Solenoid Valve)" },
    { id: "Sprinkler", label: "หัวจ่ายน้ำ(Sprinkler)" },     // สมมติชื่อตาม DB
    { id: "Controller&Timer", label: "ตัวควบคุม (Controller & Timer)" },     // สมมติชื่อตาม DB
    { id: "Fitting&Pipe", label: "ท่อและอุปกรณ์ข้อต่อ (Fitting & Pipe)" },     // สมมติชื่อตาม DB
  ];

  const areaOptions = ["สวนหน้าบ้าน/จัดสวน", "สวนเกษตรขนาดใหญ่", "โรงเรือนเพาะชำ", "ไร่พืช/สวนผลไม้", "สนามหญ้า/สนามฟุตบอล"];
  const plantOptions = ["ไม้ดอก/ไม้ประดับ", "ผักสวนครัว", "สนามหญ้า", "ไม้ผล (ทุเรียน/เงาะ)", "พืชไร่ (ข้าวโพด/อ้อย)"];

  const loadAllProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "products"), where("ProductStatus", "==", "Active"));
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => {
        const item = doc.data();
        return { id: doc.id, ...item };
      })
        .filter(product => product.Stock > 0);

      setProducts(results);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // เรียกใช้ครั้งแรกตอนโหลดหน้าเว็บ
  useEffect(() => {
    loadAllProducts();
  }, []);

  // ฟังก์ชันสำหรับปุ่ม Reset
  const handleReset = () => {
    // 1. เคลียร์ค่าการค้นหา
    setCriteria({
      keyword: '', areaType: '', plantType: '',
      minPrice: '', maxPrice: '', targetArea: '', targetFlow: '', targetPressure: ''
    });

    // 2. รีเซ็ตสถานะอื่นๆ
    setSelectedCategory("All");
    setHasSearched(false);

    // 3. โหลดข้อมูลทั้งหมดกลับมา
    loadAllProducts();
  };
  const handleChange = (e) => {
    setCriteria({
      ...criteria,
      [e.target.name]: e.target.value
    });
  }

  const handleSearch = async (e) => {
    const hasAnyCriteria = Object.values(criteria).some(val => val !== '');

    if (!hasAnyCriteria) {
      toast.warning("กรุณากรอกข้อมูลที่ต้องการค้นหาอย่างน้อย 1 อย่าง");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setProducts([]);

    setSelectedCategory("All");

    try {
      const productsRef = collection(db, "products");
      let finalQuery;

      // --- STRATEGY: Hybrid Query (Firestore + Client Filter) ---
      // เนื่องจาก Firestore ห้ามใช้ array-contains หลายตัวพร้อมกัน
      // เราจะ Query ตัวหลักก่อน แล้วค่อย Filter ส่วนที่เหลือด้วย JS

      if (criteria.areaType) {
        // กรณี 1: ถ้าเลือก Area ให้ดึงสินค้าที่มี Area นี้มาก่อน (ใช้ array-contains เพราะ DB เป็น Array)
        finalQuery = query(productsRef, where("AreaType", "array-contains", criteria.areaType));
      } else if (criteria.plantType) {
        // กรณี 2: ถ้าไม่เลือก Area แต่เลือก Plant ให้ดึงตาม Plant
        finalQuery = query(productsRef, where("PlantType", "array-contains", criteria.plantType));
      } else {
        // กรณี 3: ถ้าค้นหาแค่ชื่อ (Keyword) อย่างเดียว ให้ดึงมาทั้งหมด (หรือ Active) แล้วค่อยหาชื่อ
        // หมายเหตุ: ถ้าสินค้าเยอะมาก ควรทำ Index หรือใช้ Algolia แต่สำหรับสินค้าหลักร้อย วิธีนี้เร็วพอครับ
        finalQuery = query(productsRef, where("ProductStatus", "==", "Active"));
      }

      const querySnapshot = await getDocs(finalQuery);
      let results = querySnapshot.docs.map(doc => {
        // 1. ดึงข้อมูลจาก Firebase มาเก็บในตัวแปรชื่อ item ก่อน (กันสับสน)
        const item = doc.data();

        // 2. ส่งค่ากลับออกไป
        return { id: doc.id, ...item };
      })
        // 3. กรองเฉพาะที่มี Stock มากกว่า 0
        .filter(product => product.Stock > 0);

      // --- Client-side Filtering (กรองละเอียดอีกรอบ) ---

      if (criteria.plantType) {
        results = results.filter(p => {
          if (Array.isArray(p.PlantType)) return p.PlantType.includes(criteria.plantType);
          return p.PlantType === criteria.plantType;
        });
      }

      if (criteria.keyword) {
        const lowerKw = criteria.keyword.toLowerCase();
        results = results.filter(p => p.ProductName?.toLowerCase().includes(lowerKw));
      }

      // 1. กรองช่วงราคา
      if (criteria.minPrice) {
        results = results.filter(p => Number(p.Price) >= Number(criteria.minPrice));
      }
      if (criteria.maxPrice) {
        results = results.filter(p => Number(p.Price) <= Number(criteria.maxPrice));
      }

      //  2. กรองขนาดพื้นที่ (ตารางเมตร)
      if (criteria.targetArea) {
        const tArea = Number(criteria.targetArea);
        results = results.filter(p => {
          // ข้ามหมวด Fitting และ Controller ให้แสดงเสมอ
          if (p.ProductCategory === 'Fitting&Pipe' || p.ProductCategory === 'Controller&Timer') return true;

          const minA = Number(p.MinArea || 0);
          const maxA = Number(p.MaxArea || 999999);
          return tArea >= minA && tArea <= maxA;
        });
      }

      //  3. กรองปริมาณน้ำ Flow Rate (m³/h)
      if (criteria.targetFlow) {
        const tFlow = Number(criteria.targetFlow);
        results = results.filter(p => {
          if (p.ProductCategory === 'Fitting&Pipe' || p.ProductCategory === 'Controller&Timer') return true;

          if (!p.FlowRate) return true;

          const pFlow = Number(p.FlowRate);
          //  เพิ่มเงื่อนไข: ถ้าแปลงเป็นตัวเลขไม่ได้ (เช่นเป็นอักษร) ให้แสดงขึ้นมาเลย
          if (isNaN(pFlow)) return true;

          return pFlow <= tFlow;
        });
      }

      //  4. กรองแรงดันน้ำ Pressure (Bar)
      if (criteria.targetPressure) {
        const tPress = Number(criteria.targetPressure);
        results = results.filter(p => {
          if (p.ProductCategory === 'Fitting&Pipe' || p.ProductCategory === 'Controller&Timer') return true;

          if (!p.Pressure) return true;

          const pPress = Number(p.Pressure);
          //  เพิ่มเงื่อนไข: ถ้าแปลงเป็นตัวเลขไม่ได้ (เช่นเป็นคำว่า Low, High) ให้แสดงขึ้นมาเลย
          if (isNaN(pPress)) return true;

          return pPress <= tPress;
        });
      }

      setProducts(results);
      setLoading(false);
    } catch (error) {
      console.error("Error searching products: ", error);
      setLoading(false);

    }
    finally {
      setLoading(false);
    }

  }

  // สำหรับการแสดงผลสินค้าในหน้าหลัก จะเช็คว่าผู้ใช้เลือกหมวดหมู่ไหน ถ้าเลือก "All" ก็โชว์ทั้งหมด แต่ถ้าเลือกหมวดหมู่เฉพาะ ก็จะกรองสินค้าที่มี ProductCategory ตรงกับหมวดหมู่นั้นๆ มาแสดง
  const displayedProducts = selectedCategory === "All"
    ? products
    : products.filter(p => p.ProductCategory === selectedCategory);

  const openModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 1. Navbar */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <Navbar />
      </div>

      {/* 2. Hero Search Section */}
      <div className="relative bg-blue-900 h-[500px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={SearchImg}
            alt="Sprinkler Background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        {/* Search Container (Center Layout) */}
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">
            ค้นหาอุปกรณ์ที่ใช่ สำหรับสวนของคุณ
          </h1>
          <p className="text-gray-200 text-lg mb-10 max-w-2xl drop-shadow-sm">
            ระบุรูปแบบพื้นที่และชนิดพืช เพื่อให้เราแนะนำอุปกรณ์ที่เหมาะสมที่สุด
          </p>

          {/* --- Search Box (Smart Filter - Dropdown & Sliders) --- */}
          <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col gap-4 animate-fadeInUp border border-gray-100">

            {/* แถวที่ 1: ค้นหาพื้นฐาน (Main Search) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text" name="keyword" placeholder="ค้นหาสินค้า..."
                  value={criteria.keyword} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <Search size={20} className="absolute left-3 top-3.5 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  name="areaType" value={criteria.areaType} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition cursor-pointer"
                >
                  <option value="">ทุกพื้นที่จัดสวน (Area Type)</option>
                  <option value="สวนหน้าบ้าน/จัดสวน">สวนหน้าบ้าน / จัดสวน</option>
                  <option value="สวนเกษตรขนาดใหญ่">สวนเกษตรขนาดใหญ่</option>
                  <option value="ไร่พืช/สวนผลไม้">ไร่พืช / สวนผลไม้</option>
                  <option value="โรงเรือนเพาะชำ">โรงเรือนเพาะชำ</option>
                  <option value="สนามหญ้า/สนามฟุตบอล">สนามหญ้า / สนามฟุตบอล</option>
                </select>
                <Map size={20} className="absolute left-3 top-3.5 text-gray-400" />
                <ChevronDown size={16} className="absolute right-4 top-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  name="plantType" value={criteria.plantType} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition cursor-pointer"
                >
                  <option value="">ทุกชนิดพืช (Plant Type)</option>
                  <option value="ไม้ดอก/ไม้ประดับ">ไม้ดอก / ไม้ประดับ</option>
                  <option value="ผักสวนครัว">ผักสวนครัว</option>
                  <option value="ไม้ผล (ทุเรียน/เงาะ)">ไม้ผล (ทุเรียน/เงาะ)</option>
                  <option value="พืชไร่ (ข้าวโพด/อ้อย)">พืชไร่ (ข้าวโพด/อ้อย)</option>
                  <option value="สนามหญ้า">สนามหญ้า</option>
                </select>
                <Leaf size={20} className="absolute left-3 top-3.5 text-gray-400" />
                <ChevronDown size={16} className="absolute right-4 top-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* แถบเครื่องมือกลาง: ปุ่มเปิดปิด Advanced Search และปุ่มค้นหา */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-gray-100 pt-3 mt-1">

              {/* ปุ่ม Toggle ค้นหาขั้นสูง */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors py-2"
              >
                {/* ถ้ายังไม่ได้ import SlidersHorizontal ใช้ icon อื่นแทนได้ครับ */}
                <SlidersHorizontal size={16} />
                {showAdvanced ? 'ซ่อนการค้นหาด้วยข้อมูลสินค้า' : 'ค้นหาด้วยข้อมูลเกี่ยวกับสินค้า (Advanced Filters)'}
                <ChevronDown size={16} className={`transform transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {/* ปุ่ม Action (ค้นหา/ล้างค่า) */}
              <div className="flex gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                {(hasSearched || Object.values(criteria).some(val => val !== '')) && (
                  <button onClick={handleReset} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition flex items-center gap-2 w-full sm:w-auto justify-center">
                    <RotateCcw size={18} /> ล้างค่า
                  </button>
                )}
                <button onClick={handleSearch} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Search size={18} /> ค้นหาสินค้า
                </button>
              </div>
            </div>

            {/* 🌟 แถวที่ 2: เมนูค้นหาขั้นสูง (ซ่อน/แสดง ตาม State) */}
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-100 bg-gray-50/50 p-4 rounded-xl mt-2 animate-fadeIn">

                {/* 1. ราคาสูงสุด (Max Price) */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 flex justify-between">
                    <span>ราคาสินค้า</span>
                    <span className="text-blue-600 font-bold">{criteria.maxPrice ? `฿${Number(criteria.maxPrice).toLocaleString()}` : 'ไม่จำกัด'}</span>
                  </label>
                  <input
                    type="range" name="maxPrice" min="0" max="20000" step="500"
                    value={criteria.maxPrice || 0} onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0</span>
                    <span>20,000+</span>
                  </div>
                </div>

                {/* 2. ขนาดพื้นที่ (Target Area) */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700 flex justify-between">
                    <span>ขนาดพื้นที่จัดสวน</span>
                    <span className="text-green-600 font-bold">{criteria.targetArea ? `${criteria.targetArea} ตร.ม.` : 'ไม่ระบุ'}</span>
                  </label>
                  <input
                    type="range" name="targetArea" min="0" max="5000" step="50"
                    value={criteria.targetArea || 0} onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0 ตร.ม.</span>
                    <span>5,000 ตร.ม.</span>
                  </div>
                </div>

                {/* 3. ปริมาณน้ำ (Flow Rate) พร้อม Tooltip */}
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-700 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 relative group cursor-help">
                      ปริมาณน้ำปั๊ม (Flow)
                      <Info size={14} className="text-blue-500" />

                      {/* --- กล่องข้อความ Tooltip (ซ่อนอยู่ จะโผล่ตอนชี้) --- */}
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-60 p-2.5 bg-gray-800 text-white text-xs leading-relaxed rounded-lg shadow-xl z-20 font-normal">
                        ปริมาณน้ำ (ลูกบาศก์เมตร/ชั่วโมง) คืออัตราการจ่ายน้ำของปั๊ม <b>ยิ่งค่ามาก ยิ่งจ่ายน้ำได้เยอะ</b> เหมาะกับสวนที่มีหัวสปริงเกลอร์หลายจุด
                        {/* สามเหลี่ยมชี้ลง */}
                        <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </span>
                    <span className="text-cyan-600 font-bold">{criteria.targetFlow ? `${criteria.targetFlow} m³/h` : 'ไม่ระบุ'}</span>
                  </div>
                  <input
                    type="range" name="targetFlow" min="0" max="50" step="0.5"
                    value={criteria.targetFlow || 0} onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0</span>
                    <span>50 m³/h</span>
                  </div>
                </div>

                {/* 4. แรงดันน้ำ (Pressure) พร้อม Tooltip */}
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-gray-700 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 relative group cursor-help">
                      แรงดันน้ำ (Pressure)
                      <Info size={14} className="text-blue-500" />

                      {/* --- กล่องข้อความ Tooltip (ซ่อนอยู่ จะโผล่ตอนชี้) --- */}
                      <div className="absolute right-0 md:left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-gray-800 text-white text-xs leading-relaxed rounded-lg shadow-xl z-20 font-normal">
                        แรงดันน้ำ (บาร์) คือแรงส่งน้ำให้พุ่งไกล <b>อุปกรณ์เช่นหัวป๊อปอัพฝังดิน หรือ Big Gun ต้องการแรงดันสูง</b> เพื่อให้ดันตัวขึ้นและกระจายน้ำได้เต็มรัศมี
                        {/* สามเหลี่ยมชี้ลง */}
                        <div className="absolute top-full right-10 md:left-6 md:right-auto -mt-1 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </span>
                    <span className="text-purple-600 font-bold">{criteria.targetPressure ? `${criteria.targetPressure} Bar` : 'ไม่ระบุ'}</span>
                  </div>
                  <input
                    type="range" name="targetPressure" min="0" max="5" step="0.1"
                    value={criteria.targetPressure || 0} onChange={handleChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0</span>
                    <span>5.0 Bar</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Results Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">

          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-gray-100 rounded-lg overflow-hidden shadow-sm border border-gray-200 sticky top-24">
              {/* Header All */}
              <div
                onClick={() => setSelectedCategory("All")}
                className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${selectedCategory === "All" ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
              >
                <span className="font-bold text-lg">All Categories</span>
                <ChevronRight size={20} />
              </div>

              {/* Menu Items */}
              <ul className="divide-y divide-gray-300 border-t border-gray-300">
                {categoryMenu.filter(c => c.id !== "All").map((item) => (
                  <li
                    key={item.id}
                    onClick={() => setSelectedCategory(item.id)}
                    className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${selectedCategory === item.id
                      ? 'bg-gray-300 font-bold text-gray-900' // Active State
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300' // Normal State
                      }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight size={16} className="text-gray-500" />
                  </li>
                ))}
              </ul>
            </div>
          </div>


          <div className="flex-1">

            <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold text-gray-700">
                {hasSearched ? 'ผลการค้นหา' : 'รายการสินค้า'}
                <span className="text-gray-400 text-lg font-normal ml-2">({displayedProducts.length})</span>
              </h2>
            </div>

            {/* {!hasSearched && selectedCategory !== "All" && (
              <CategoryKnowledgeBanner category={selectedCategory} />
            )} */}

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">กำลังค้นหาสินค้า...</p>
              </div>
            ) : (
              <>
                {/* Header Result */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {hasSearched ? `ผลการค้นหา (${displayedProducts.length} รายการ)` : 'สินค้าแนะนำ'}
                  </h2>
                  {!hasSearched && <p className="text-gray-500">กรุณาระบุเงื่อนไขด้านบนเพื่อค้นหาสินค้าที่เหมาะสม</p>}
                </div>
                {displayedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {displayedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex flex-col items-center group h-full"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        {/* Image Card */}
                        <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 relative shadow-sm hover:shadow-md transition">
                          <img
                            src={
                              Array.isArray(product.ProductPic)
                                ? product.ProductPic[0]  // ถ้าเป็น Array ให้เอารูปแรกมาโชว์
                                : (product.ProductPic || "https://placehold.co/400x400?text=No+Image") // ถ้าเป็น String หรือไม่มี ให้ทำเหมือนเดิม
                            }
                            alt={product.ProductName}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        </div>

                        {/* Product Name (Centered) */}
                        <h3 className="text-lg font-bold text-gray-800 text-center uppercase tracking-wide mb-1">
                          {product.ProductName}
                        </h3>

                        <div className="mt-auto">
                          <p className="text-m font-bold text-red-600 text-center mb-3 line-clamp-1">
                            ฿ {Number(product.Price).toLocaleString('th-TH', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>

                          {/* Price Button (Capsule Style เหมือนรูป) */}


                          <button
                            className="bg-[#3B82F6] text-white text-base font-bold px-8 py-1.5 rounded-full shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(product);
                            }}>
                            หยิบสินค้าใส่ตะกร้า
                          </button>
                        </div>


                      </div>
                    ))}
                  </div>
                ) : (
                  // Empty State (กรณีค้นหาแล้วไม่เจอ)
                  hasSearched && (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl shadow-sm border border-gray-100 dashed">
                      <PackageX size={64} className="text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600">ไม่พบสินค้าที่คุณค้นหา</h3>
                      <p className="text-gray-500 mt-2">ลองปรับเปลี่ยนเงื่อนไขการค้นหา หรือดูสินค้าประเภทอื่น</p>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AddToCartModal
        isOpen={isModalOpen}
        onClose={closeModal}
        product={selectedProduct}
      />

    </div>
  );


}

export default ProductsPage;