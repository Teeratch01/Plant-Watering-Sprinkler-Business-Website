import React, { useState, useEffect } from 'react';
import { db } from '../FirebaseConfig'; // ปรับ path ตามจริง
import { collection, query, where, getDocs } from "firebase/firestore";
import { Search, Map, Leaf, ChevronDown, PackageX, ChevronRight, RotateCcw } from 'lucide-react';
import Navbar from '../components/Navbar';
import SearchImg from '../assets/Product/Search_Backgroud.jpg';
import { useNavigate } from 'react-router-dom';
import AddToCartModal from '../components/AddToCartModal';
import CategoryKnowledgeBanner from '../components/CategoryKnowledgeBanner';

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
    plantType: ''
  });

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
    setCriteria({ keyword: '', areaType: '', plantType: '' });

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
    if (!criteria.areaType && !criteria.plantType && !criteria.keyword) {
      alert("Please enter at least one search criteria.");
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

      // 1. กรอง PlantType (ถ้ามีการเลือก และยังไม่ได้ Query)
      if (criteria.plantType && criteria.areaType) {
        // เช็คว่าใน Array PlantType ของสินค้า มีค่าที่เลือกหรือไม่
        results = results.filter(p => p.PlantType && p.PlantType.includes(criteria.plantType));
      }

      // 2. กรอง Keyword (ค้นหาบางส่วนของคำ)
      if (criteria.keyword) {
        const lowerKeyword = criteria.keyword.toLowerCase();
        results = results.filter(p =>
          (p.ProductName && p.ProductName.toLowerCase().includes(lowerKeyword)) ||
          (p.ProductDetail && p.ProductDetail.toLowerCase().includes(lowerKeyword)) ||
          (p.ProductCategory && p.ProductCategory.toLowerCase().includes(lowerKeyword))
        );
      }

      // 3. กรอง AreaType (เฉพาะกรณีที่ Query ด้วย PlantType มาก่อน)
      if (criteria.areaType && !criteria.areaTypeQueryUsed) { // Logic เพิ่มเติมถ้าจำเป็น
        // ปกติ step แรก query ไปแล้ว แต่เขียนกันเหนียวไว้
        results = results.filter(p => p.AreaType && p.AreaType.includes(criteria.areaType));
      }

      setProducts(results);

    } catch (error) {
      console.error("Error searching:", error);
      alert("เกิดข้อผิดพลาดในการค้นหา: " + error.message);

    }
    finally {
      setLoading(false);
    }

  }

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

          {/* --- Search Box (The Agoda Style) --- */}
          <div className="bg-white p-4 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row gap-4 items-center animate-fadeInUp">

            {/* Input 1: Keyword */}
            <div className="flex-1 w-full relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                name="keyword"
                placeholder="ค้นหาชื่อสินค้า..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={criteria.keyword}
                onChange={handleChange}
              />
            </div>

            {/* Input 2: Area Type */}
            <div className="flex-1 w-full relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">
                <Map size={20} />
              </div>
              <select
                name="areaType"
                className="w-full pl-10 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                value={criteria.areaType}
                onChange={handleChange}
              >
                <option value="">เลือกรูปแบบพื้นที่</option>
                {areaOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {/* Input 3: Plant Type */}
            <div className="flex-1 w-full relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">
                <Leaf size={20} />
              </div>
              <select
                name="plantType"
                className="w-full pl-10 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                value={criteria.plantType}
                onChange={handleChange}
              >
                <option value="">เลือกชนิดพืช</option>
                {plantOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>

            {(hasSearched || criteria.keyword || criteria.areaType || criteria.plantType) && (
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition flex items-center justify-center"
                title="ล้างเงื่อนไขการค้นหา"
              >
                <RotateCcw size={20} />
              </button>
            )}

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Search size={20} />
              ค้นหา
            </button>

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

            {!hasSearched && selectedCategory !== "All" && (
              <CategoryKnowledgeBanner category={selectedCategory} />
            )}

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