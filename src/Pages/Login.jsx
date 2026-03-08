import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Register from './Register';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../FirebaseConfig'; // import auth จากไฟล์ config ของคุณ
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';






function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');




  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const user = userCredential.user;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();

        if (userData.role === 'admin' || userData.role === 'adminManager') {
          toast.success("Welcome Admin!");
          navigate('/admin/dashboard');
        }
        else {
          toast.success("เข้าสู่ระบบสำเร็จ!");
          navigate('/');
        }
      }
      // เปลี่ยนเส้นทางไปยังหน้าหลักหลังจากเข้าสู่ระบบสำเร็จ
    } catch (err) {

      console.error('Login error', err);
      if (err.code === 'auth/invalid-credential') {
        toast.warn("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setError('Wrong Email or Password.');
      } else {
        toast.error("เข้าสู่ระบบไม่สำเร็จ! " + err.message);
        setError('Failed to log in. ' + err.message);
      }

    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.warn("กรุณากรอกอีเมลสำหรับรีเซ็ตรหัสผ่าน");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว! กรุณาตรวจสอบอีเมลของคุณ");
      setIsResetModalOpen(false);
      setResetEmail('');
    }
    catch (err) {
      console.error('Reset password error', err);
      toast.error("ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้! " + err.message);
    }
  }


  return (
    <>
      <Navbar />

      <div className="flex justify-center items-center min-h-[80vh] bg-white">
        {/* กรอบสี่เหลี่ยม */}
        <div className="w-full max-w-md p-8 m-4 rounded-xl shadow-sm border border-gray-400">

          <h1 className="text-3xl font-medium text-center mb-8">เข้าสู่ระบบ</h1>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
                placeholder='Email'
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 font-medium">Password</label>
                {/* 🌟 เพิ่มปุ่ม ลืมรหัสผ่าน? ตรงนี้ */}
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
                placeholder='Password'
                required
              />
            </div>

            {/* Button */}
            <button className="w-full border border-gray-400 text-blue-600 py-2 rounded-full hover:bg-gray-50 transition duration-300 font-medium">
              เข้าสู่ระบบ
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-6 text-center text-sm">
            <span>หรือยังไม่มีบัญชี </span>
            <Link to="/register" className="text-blue-600 underline hover:text-blue-800">
              สมัครสมาชิก
            </Link>
          </div>
        </div>

        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in-down">

              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-xl font-bold text-gray-800">รีเซ็ตรหัสผ่าน</h2>
                <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-red-500 transition text-xl font-bold">
                  ✕
                </button>
              </div>

              <form onSubmit={handleResetPassword}>
                <p className="text-sm text-gray-600 mb-4">
                  กรุณากรอกอีเมลที่คุณใช้สมัครสมาชิก ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้คุณทางอีเมลครับ
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="กรอกอีเมลของคุณ..."
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-6 text-sm"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                  >
                    ส่งลิงก์รีเซ็ต
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Login;