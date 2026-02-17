import Link from 'next/link';

export default function ReportsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return (
    <div className="space-y-8 fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#8b5a3c]">รายงานสรุป</h1>
           <p className="text-slate-500 text-sm mt-1">ภาพรวมผลประกอบการและสถิติหอพัก</p>
        </div>
        <div className="flex gap-2">
           <Link
             href={`/reports/dorm-summary?month=${month}&year=${year}`}
             target="_blank"
             rel="noopener noreferrer"
             className="px-6 py-2 rounded-full bg-[#f5a987] text-white font-medium hover:bg-[#e09b7d]"
           >
             รายงานแยกหอ
           </Link>
           <select className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#f5a987]">
             <option>ปี 2567</option>
             <option>ปี 2566</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">รายรับรวม (ปีนี้)</p>
          <p className="text-3xl font-bold text-green-600">฿145,200</p>
          <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>+12% จากปีก่อน</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">ค่าใช้จ่ายรวม</p>
          <p className="text-3xl font-bold text-red-500">฿32,450</p>
          <div className="flex items-center gap-1 text-xs text-red-400 mt-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
            </svg>
            <span>+5% จากปีก่อน</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">กำไรสุทธิ</p>
          <p className="text-3xl font-bold text-[#f5a987]">฿112,750</p>
          <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <span>+15% จากปีก่อน</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500 mb-1">อัตราการเข้าพัก</p>
          <p className="text-3xl font-bold text-blue-600">95%</p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
            <span>ห้องว่าง 2 ห้อง</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-[#8b5a3c] mb-6">รายรับรายเดือน</h3>
          <div className="space-y-4">
            {[
              { month: 'ม.ค.', value: 85, amount: '42,500' },
              { month: 'ก.พ.', value: 90, amount: '45,000' },
              { month: 'มี.ค.', value: 88, amount: '44,000' },
              { month: 'เม.ย.', value: 82, amount: '41,000' },
              { month: 'พ.ค.', value: 95, amount: '47,500' },
              { month: 'มิ.ย.', value: 75, amount: '37,500' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-8">{item.month}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#f5a987] rounded-full" style={{ width: `${item.value}%` }}></div>
                </div>
                <span className="text-sm font-medium text-slate-700 w-16 text-right">฿{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-[#8b5a3c] mb-6">สัดส่วนค่าใช้จ่าย</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-slate-600">ค่าไฟฟ้าส่วนกลาง</span>
              </div>
              <span className="text-sm font-bold">฿12,500 (45%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                <span className="text-sm text-slate-600">ค่าน้ำประปา</span>
              </div>
              <span className="text-sm font-bold">฿5,200 (18%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className="text-sm text-slate-600">ค่าซ่อมบำรุง</span>
              </div>
              <span className="text-sm font-bold">฿8,450 (28%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="text-sm text-slate-600">อื่นๆ</span>
              </div>
              <span className="text-sm font-bold">฿2,300 (9%)</span>
            </div>
            
            <div className="h-4 flex rounded-full overflow-hidden mt-4">
              <div className="bg-blue-500 w-[45%]"></div>
              <div className="bg-cyan-400 w-[18%]"></div>
              <div className="bg-orange-400 w-[28%]"></div>
              <div className="bg-slate-300 w-[9%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
