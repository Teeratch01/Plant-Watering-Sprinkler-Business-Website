import Navbar from './components/Navbar';
import homeimage from './assets/Home/homepage.jpg';
import sprinklerimg from './assets/Home/sprinkler.jpg';
import deliveryimg from './assets/Home/Delivery.jpg';
import supportimg from './assets/Home/Support.jpg';
import './App.css'
import Footer from './components/Footer';
import { Routes, Route } from 'react-router-dom';
import Login from './Pages/Login';
import Register from './Pages/Register';
import ProductsPage from './Pages/ProductsPage';
import ProductsDetailPage from './Pages/ProductsDetailPage';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { CartProvider } from './components/CartContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CartPage from './Pages/CartPage';
import CheckoutPage from './Pages/CheckoutPage';
import OrderSuccessPage from './Pages/OrderSuccessPage';
import OrderSearchPage from './Pages/OrderSearchPage';
import OrderHistoryPage from './Pages/OrderHistoryPage';
import ContactUsPage from './Pages/ContactUsPage';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './Pages/Admin/AdminDashboard';
import ClientChatPage from './Pages/ClientChatPage';
import AdminChatPage from './Pages/Admin/AdminChatPage';
import AdminSupportPage from './Pages/Admin/AdminSupportPage';
import AdminOrdersPage from './Pages/Admin/AdminOrderPage';
import AdminManagementPage from './Pages/Admin/AdminManagementPage';
import AdminProductPage from './Pages/Admin/AdminProductPage';


function HomePage() {
  // const [count, setCount] = useState(0)
  const services = [
    {
      id: 1,
      title: "Quality Products",
      image: sprinklerimg,
      description: "คัดสรรอุปกรณ์เกรดพรีเมียม อายุการใช้งานยาวนาน รับประกันคุณภาพทุกชิ้น",
      position: "object-bottom"
    },
    {
      id: 2,
      title: "Fast Delivery",
      image: deliveryimg,
      description: "บริการจัดส่งสินค้าทั่วประเทศ แพ็คกันกระแทกอย่างดี ถึงมือคุณภายใน 7 วัน",
      position: "object-top"
    },
    {
      id: 3,
      title: "Expert Support",
      image: supportimg,
      description: "ทีมงานมืออาชีพพร้อมให้คำปรึกษาและแนะนำการใช้งานอย่างใกล้ชิด",
      position: "object-top"
    }
  ]



  return (
    <>
      <div className="min-h-screen bg-white text-gray-800 font-sans">
        <Navbar />

        <div className="w-full h-[700px]">
          <img
            src={homeimage}
            className='w-full h-full object-cover'
            alt="homeimage"
          />
        </div>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">

            <div className="text-center mb-12">
              <h2 className="text-4xl font-serif text-gray-900 mb-4">About Us</h2>
              {/* ขีดเส้นใต้ */}
              <div className="w-24 h-[1px] bg-gray-400 mx-auto mb-8"></div>

              <p className="text-gray-700 leading-relaxed max-w-10xl mx-auto text-lg">
                ยินดีต้อนรับสู่ Outdoor Sprinkler ผู้นำด้านจำหน่ายอุปกรณ์สปริงเกลอร์และระบบน้ำครบวงจรบนโลกออนไลน์ เราสั่งสมประสบการณ์กว่า 10 ปี เพื่อคัดสรรสินค้าที่มีคุณภาพดีที่สุดในราคายุติธรรม พร้อมระบบการสั่งซื้อที่ง่ายและปลอดภัย เพื่อให้ลูกค้าทุกท่านมั่นใจว่าจะได้รับสินค้าที่ตรงสเปกและตอบโจทย์การใช้งานจริง
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {services.map((service) => (
                <div key={service.id} className="bg-gray-100 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={service.image}
                    alt={service.title}
                    className={`w-full h-48 object-cover ${service.position} group-hover:scale-110 transition-transform duration-500`}
                  />
                  <div className="p-6">
                    <h3 className="text-2xl font-serif text-gray-900 mb-4">{service.title}</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />

      </div>
    </>
  )
}

function App() {
  return (
    <CartProvider>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // เลือกธีมได้: light, dark, colored
      />

      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductsDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/order-status" element={<OrderSearchPage />} />
        <Route path="/order-history" element={<OrderHistoryPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/chat" element={<ClientChatPage />} />

        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />

        <Route path="/admin/chat" element={
          <AdminRoute>
            <AdminChatPage />
          </AdminRoute>
        } />

        <Route path="/admin/support" element={
          <AdminRoute>
            <AdminSupportPage />
          </AdminRoute>
        } />

        <Route path="/admin/orders" element={
          <AdminRoute>
            <AdminOrdersPage />
          </AdminRoute>
        } />

        <Route path="/admin/admins" element={
          <AdminRoute>
            <AdminManagementPage />
          </AdminRoute>
        } />

        <Route path="/admin/products" element={
          <AdminRoute>
            <AdminProductPage />
          </AdminRoute>
        } />

      </Routes>
    </CartProvider>
  );
}

export default App
