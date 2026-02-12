import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Register from './Register';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../FirebaseConfig'; // import auth จากไฟล์ config ของคุณ
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';





function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [error, setError] = useState('');


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("เข้าสู่ระบบสำเร็จ!");
      navigate('/'); // เปลี่ยนเส้นทางไปยังหน้าหลักหลังจากเข้าสู่ระบบสำเร็จ
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


  return (
    <>
      <Navbar /> 
      
      <div className="flex justify-center items-center min-h-[80vh] bg-white">
        {/* กรอบสี่เหลี่ยม */}
        <div className="w-full max-w-md p-8 m-4 rounded-xl shadow-sm border border-gray-400">
          
          <h1 className="text-3xl font-medium text-center mb-8">เข้าสู่ระบบ</h1>
          
          <form onSubmit ={handleLogin}className="space-y-6">
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
              <label className="block text-gray-700 font-medium mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
                placeholder='Password'
                reaquired
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
      </div>
    </>
  );
}

export default Login;