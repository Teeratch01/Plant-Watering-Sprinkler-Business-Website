import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { auth, db } from '../FirebaseConfig'; // import จากไฟล์ที่สร้างตะกี้
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { CreateInput } from "thai-address-autocomplete-react";
import { toast } from 'react-toastify';


const InputThaiAddress = CreateInput();



function Register() {

  const navigate = useNavigate();
  

  const [address, setAddress] = useState({
    district:'',
    amphoe:'',
    province:'',
    zipcode:''
  });

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    houseNumber: '',
    phone: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  const handleAddressChange = (scope) => (value) => {
    setAddress((oldAddr) => ({
      ...oldAddr,
      [scope]: value
    }));
  }

  const handleSelect = (address ) => {
    setAddress(address);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.warn("Password และ Confirm Password ไม่ตรงกัน");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user; 

      await setDoc(doc(db, "users", user.uid), {
        firstname: formData.name,
        surname: formData.surname,
        email: formData.email,
        phone: formData.phone,
        address: {
          address: formData.houseNumber,
          district: address.amphoe,
          sub_district: address.district,
          province: address.province,
          zipcode: address.zipcode
        },
        createdAt: new Date()
      });

      toast.success("สมัครสมาชิกสำเร็จ !");
      navigate('/login');
    } catch (error) {
      console.error("Error registering user: ", error);
      toast.error("สมัครสมาชิกไม่สำเร็จ ! : " + error.message);
    }
  
  };

  useEffect(() => {
    const inputs = document.querySelectorAll('.custom-address-box input');
    if (inputs.length >= 4) {
        inputs[0].setAttribute('placeholder', 'อำเภอ/ เขต / District');
        inputs[1].setAttribute('placeholder', 'ตำบล / แขวง /Sub-district');
        inputs[2].setAttribute('placeholder', 'จังหวัด / Province');
        inputs[3].setAttribute('placeholder', 'รหัสไปรษณีย์ / Zipcode');
    }
}, []);


  return (
    <>
      <Navbar /> 
      
      <div className="flex justify-center items-center min-h-[80vh] bg-white">
        {/* กรอบสี่เหลี่ยม */}
        <div className="w-full max-w-md rounded-xl shadow-sm border border-gray-400 p-8 m-4">
          
          <h1 className="text-3xl font-medium text-center mb-8">สมัครสมาชิก</h1>
          
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">ชื่อ</label>
              <input 
                name="name"
                type="text"
                placeholder='ชื่อผู้ใช้งาน' 
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            {/* Surname Input */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">นามสกุล</label>
              <input 
                name="surname"
                type="text"
                placeholder='นามสกุลผู้ใช้งาน' 
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">เบอร์โทรศัพท์</label>
              <input 
                name="phone"
                type="text"
                placeholder='xxx-xxx-xxxx' 
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">ที่อยู่</label>
              <input 
                name="houseNumber"
                placeholder='บ้านเลขที่ / หมู่บ้าน / ซอย / ถนน' 
                type='text'
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            <div className="flex flex-col gap-4 custom-address-box">
              <label className="block text-gray-700 font-medium">เขต/อำเภอ</label>
              

              <InputThaiAddress.Amphoe
                value={address['amphoe']}
                onChange={handleAddressChange('amphoe')}
                onSelect={handleSelect}
                className="w-full"
                placeholder='Amphoe'
                required
              />

              <label className="block text-gray-700 font-medium">แขวง/ตำบล</label>
              
              <InputThaiAddress.District
                value={address['district']}
                onChange={handleAddressChange('district')}
                onSelect={handleSelect}
                className="w-full"
                placeholder='District'
                required
              />

              
              <label className="block text-gray-700 font-medium">จังหวัด</label>
              <InputThaiAddress.Province
                value={address['province']}
                onChange={handleAddressChange('province')}
                onSelect={handleSelect}
                className="w-full"
                placeholder='Province'
                required
              />
              <label className="block text-gray-700 font-medium">รหัสไปรษณีย์</label>
              <InputThaiAddress.Zipcode
                value={address['zipcode']}
                onChange={handleAddressChange('zipcode')}
                onSelect={handleSelect}
                className="w-full"
                placeholder='Zipcode'
                required
              />
            </div>

            
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input 
                name="email"
                type="email"
                placeholder='Email' 
                onChange={handleChange}
                required 
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Password</label>
              <input 
                name="password"
                type="password"
                placeholder='Password' 
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Confirm Password</label>
              <input 
                name="confirmPassword"
                type="password"
                placeholder='Confirm Password' 
                onChange={handleChange}
                required
                className="w-full border border-gray-400 p-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded"
              />
            </div>

            {/* Button */}
            <button type="submit" className="w-full border border-gray-400 text-blue-600 py-2 rounded-full hover:bg-gray-50 transition duration-300 font-medium">
              สมัครสมาชิก
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-6 text-center text-sm">
            <span>หรือมีบัญชีผู้ใช้งานอยู่แล้ว </span>
            <Link to="/login" className="text-blue-600 underline hover:text-blue-800">
              เข้าสู่ระบบ
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}

export default Register;