import React from 'react';
// import AdminNavbar from '../../components/AdminNavbar'; // (อนาคตค่อยทำ Navbar แยก)

function AdminDashboard() {
    return (
        <div className="min-h-screen bg-gray-100 p-10">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Admin Dashboard (หลังบ้าน)</h1>
            <div className="bg-white p-6 rounded-lg shadow">
                <p>ยินดีต้อนรับผู้ดูแลระบบ</p>
                {/* เดี๋ยวค่อยเพิ่มปุ่มไปหน้า Chat หรือ Order Management ตรงนี้ */}
            </div>
        </div>
    );
}

export default AdminDashboard;