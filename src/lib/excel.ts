import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("لا توجد بيانات لتصديرها");
    return;
  }

  // 1. تحويل الـ JSON إلى شيت إكسيل
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. ضبط اتجاه الشيت ليكون من اليمين لليسار (عربي)
  worksheet['!dir'] = 'rtl';

  // 3. إنشاء ملف عمل (Workbook) وإضافة الشيت إليه
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "البيانات");

  // 4. تحميل الملف للمستخدم
  XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
};
