<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div>
    <label className="block text-xs font-bold mb-1">رقم اللوحة *</label>
    <input type="text" required value={formData.plate_number} onChange={e=>setFormData({...formData, plate_number: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="مثال: ل ج أ 6318" />
  </div>
  
  {/* ✅ رقم الشاسيه (VIN) الجديد */}
  <div>
    <label className="block text-xs font-bold mb-1">رقم الشاسيه (VIN)</label>
    <input type="text" value={formData.vin || ""} onChange={e=>setFormData({...formData, vin: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="مثال: JT2BF22K1W0123456" />
  </div>

  <div>
    <label className="block text-xs font-bold mb-1">الشركة المالكة</label>
    <input type="text" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="مثال: ترانس جاس" />
  </div>

  <div><label className="block text-xs font-bold mb-1">الماركة</label><input type="text" value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="مثال: تويوتا" /></div>
  <div><label className="block text-xs font-bold mb-1">الموديل</label><input type="text" value={formData.model} onChange={e=>setFormData({...formData, model: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="مثال: دوبل كابينة" /></div>
  <div><label className="block text-xs font-bold mb-1">سنة الصنع</label><input type="number" value={formData.year} onChange={e=>setFormData({...formData, year: Number(e.target.value)})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
  <div>
    <label className="block text-xs font-bold mb-1">نوع الوقود</label>
    <select value={formData.fuel_type} onChange={e=>setFormData({...formData, fuel_type: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
      <option value="بنزين">بنزين</option><option value="سولار">سولار</option><option value="بنزين و غاز">بنزين و غاز</option><option value="سولار وغاز">سولار وغاز</option><option value="غاز">غاز</option>
    </select>
  </div>
  <div><label className="block text-xs font-bold mb-1">المحافظة</label><input type="text" value={formData.governorate} onChange={e=>setFormData({...formData, governorate: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
  <div><label className="block text-xs font-bold mb-1">المنطقة</label><input type="text" value={formData.region} onChange={e=>setFormData({...formData, region: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
  <div><label className="block text-xs font-bold mb-1">الإدارة المختصة</label><input type="text" value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
  <div><label className="block text-xs font-bold mb-1">اسم السائق الرئيسي</label><input type="text" value={formData.driver_name} onChange={e=>setFormData({...formData, driver_name: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="السائق الأساسي" /></div>
  <div><label className="block text-xs font-bold mb-1">تاريخ انتهاء الترخيص</label><input type="date" value={formData.license_expiry} onChange={e=>setFormData({...formData, license_expiry: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
  <div>
    <label className="block text-xs font-bold mb-1">الحالة التشغيلية</label>
    <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
      <option value="active">نشطة</option><option value="maintenance">صيانة</option><option value="stopped">متوقفة</option>
    </select>
  </div>
</div>
