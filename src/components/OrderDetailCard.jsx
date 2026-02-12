import React from 'react';
import {
    ShoppingCart, ClipboardList, Package, Truck, PackageCheck,
    CreditCard, QrCode, Building,
    MapPin, User, Phone, Mail, XCircle, AlertCircle
} from 'lucide-react';

const OrderDetailCard = ({ order, payment }) => {

    const isCancelled = order?.OrderStatus === 'Cancelled';

    const getStatusLevel = (status) => {
        switch (status) {
            case 'Payment Success': return 0;
            case 'Prepare Order': return 1;
            case 'Packaging Complete': return 2;
            case 'In transit': return 3;
            case 'Deliver Complete': return 4;
            default: return 0;
        }
    };

    const currentLevel = order ? getStatusLevel(order.OrderStatus) : 0;

    const steps = [
        { label: 'Payment', icon: <ShoppingCart size={24} /> },
        { label: 'Prepare Order', icon: <ClipboardList size={24} /> },
        { label: 'Packaging Completed', icon: <Package size={24} /> },
        { label: 'In Transit', icon: <Truck size={24} /> },
        { label: 'Deliver Complete', icon: <PackageCheck size={24} /> },
    ];

    if (!order) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up">

            {/* --- Header: Order Number --- */}
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Order #{order.OrderNumber}
                    </h2>
                    <p className="text-gray-500 mt-1">
                        สั่งซื้อเมื่อ: {order.OrderDate?.toDate ? order.OrderDate.toDate().toLocaleString('th-TH') : ''}
                    </p>
                </div>
                {/* Badge สถานะ (Optional) */}
                {/* <div className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold w-fit">
                    {order.OrderStatus}
                </div> */}
            </div>

            {/* {/* {isCancelled ? ( */}

            {isCancelled ? (
                <div className="p-8 md:p-12 bg-red-50 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-red-700">คำสั่งซื้อนี้ถูกยกเลิก (Order Cancelled)</h3>
                    <p className="text-red-600/80 max-w-md">
                        หากคุณชำระเงินแล้ว ระบบจะทำการคืนเงินภายใน 3-5 วันทำการ <br />
                        สอบถามเพิ่มเติมโปรดติดต่อเจ้าหน้าที่
                    </p>
                </div>
            ) : (      //stepper
                < div className="p-8 md:p-10 overflow-x-auto bg-gray-50/50">
                    <div className="flex items-center justify-between min-w-[600px]">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center relative flex-1">

                                {/* Line Connector */}
                                {index !== steps.length - 1 && (
                                    <div className={`absolute top-8 left-1/2 w-full h-1 z-0 
                                    ${index < currentLevel ? 'bg-green-500' : 'bg-gray-200'}`}
                                    />
                                )}

                                {/* Icon Circle */}
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-300 mb-4
                                ${index <= currentLevel
                                        ? 'bg-white border-green-500 text-green-600 shadow-md scale-110'
                                        : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                >
                                    {step.icon}
                                    {index <= currentLevel && (
                                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <p className={`font-semibold text-sm ${index <= currentLevel ? 'text-green-600' : 'text-gray-400'}`}>
                                    {step.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>


            )}



            {/* --- ส่วนที่เพิ่มใหม่: ข้อมูลลูกค้าและการจัดส่ง --- */}
            {
                (order.CustomerName || order.ShippingAddress) && (
                    <div className="px-8 py-6 border-t border-b border-gray-100 bg-blue-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* 1. ข้อมูลผู้ติดต่อ */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <User size={18} className="text-blue-600" /> ข้อมูลผู้รับ
                                </h3>
                                <div className="space-y-3 pl-2 border-l-2 border-blue-200">
                                    <p className="text-gray-700 font-semibold text-lg">{order.CustomerName || '-'}</p>
                                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                                        <Phone size={16} /> {order.CustomerPhone || '-'}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                                        <Mail size={16} /> {order.CustomerEmail || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* 2. ที่อยู่จัดส่ง */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <MapPin size={18} className="text-red-500" /> ที่อยู่จัดส่ง
                                </h3>
                                {order.ShippingAddress ? (
                                    <div className="pl-2 border-l-2 border-red-200 text-gray-600 space-y-1 text-sm leading-relaxed">
                                        <p className="font-medium text-gray-800">{order.ShippingAddress.Address}</p>
                                        <p>
                                            {order.ShippingAddress.SubDistrict ? `ต.${order.ShippingAddress.SubDistrict}` : ''} {order.ShippingAddress.District ? `อ.${order.ShippingAddress.District}` : ''}
                                        </p>
                                        <p>
                                            {order.ShippingAddress.Province ? `จ.${order.ShippingAddress.Province}` : ''} {order.ShippingAddress.Zipcode}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">ไม่พบข้อมูลที่อยู่ (สำหรับออเดอร์เก่า)</p>
                                )}
                            </div>

                        </div>
                    </div>
                )
            }

            {/* --- Product List & Summary (เหมือนเดิม) --- */}
            <div className="p-8 flex flex-col md:flex-row gap-10">

                {/* Left: Products */}
                <div className="flex-1 space-y-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">รายการสินค้า</h3>
                    {order.Items && order.Items.map((item, idx) => (
                        <div key={idx} className={`flex gap-4 items-start py-2 ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
                            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 relative">
                                <img
                                    src={Array.isArray(item.ProductPic) ? item.ProductPic[0] : (item.ProductPic || "https://placehold.co/100")}
                                    alt={item.ProductName}
                                    className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 right-0 bg-black text-white text-xs px-1.5 py-0.5 rounded-tl-md">
                                    x{item.Quantity}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-800 line-clamp-2 text-sm md:text-base">{item.ProductName}</p>
                                <p className="text-gray-500 text-xs mt-1">รหัสสินค้า: {item.ProductID}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">{Number(item.Price * item.Quantity).toLocaleString()}</p>
                                <p className="text-xs text-gray-400">({Number(item.Price).toLocaleString()} / ชิ้น)</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Summary */}
                <div className="w-full md:w-80 bg-gray-50 p-6 rounded-xl h-fit border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800 mb-4 border-b border-gray-200 pb-2">สรุปยอดชำระ</h3>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>จำนวนสินค้าทั้งหมด:</span>
                            <span>{order.TotalQuantity} ชิ้น</span>
                        </div>
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>วิธีชำระเงิน:</span>
                            <span className="font-medium text-black flex items-center gap-1">
                                {payment?.Method === 'card' && <><CreditCard size={14} /> Credit Card</>}
                                {payment?.Method === 'qr' && <><QrCode size={14} /> QR Payment</>}
                                {payment?.Method === 'counter' && <><Building size={14} /> Counter</>}
                                {!payment && '-'}
                            </span>
                        </div>
                        {payment?.PaymentDate && (
                            <div className="flex justify-between text-gray-600 text-xs">
                                <span>วันที่ชำระ:</span>
                                <span>{payment.PaymentDate.toDate().toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center text-xl font-bold text-gray-900 border-t border-gray-200 pt-4">
                        <span>ยอดสุทธิ :</span>
                        <span className={isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}>
                            {Number(order.TotalPrice).toLocaleString()} ฿
                        </span>
                    </div>

                    {isCancelled && <div className="text-right text-red-500 font-bold text-sm mt-1">ยกเลิกแล้ว</div>}

                    <button className="w-full mt-6 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-lg transition text-sm shadow-sm">
                        แจ้งปัญหา / ติดต่อเรา
                    </button>
                </div>

            </div>

        </div >
    );
}

export default OrderDetailCard;