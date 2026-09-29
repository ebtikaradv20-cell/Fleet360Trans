import * as XLSX from "xlsx";

/** تصدير احترافي: هيدر ملون + عرض أعمدة + تجميد الصف الأول + RTL */
export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("لا توجد بيانات لتصديرها");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  (worksheet as any)["!dir"] = "rtl";

  // عرض الأعمدة تلقائياً تقريباً
  const keys = Object.keys(data[0] || {});
  worksheet["!cols"] = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });

  // تجميد صف الهيدر
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  // تلوين الهيدر (A1 ... ) — عبر cell styles إن دعمتها البيئة
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!worksheet[addr]) continue;
    worksheet[addr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      fill: { fgColor: { rgb: "1E3A8A" } }, // أزرق مؤسسي
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "0F172A" } },
        bottom: { style: "thin", color: { rgb: "0F172A" } },
        left: { style: "thin", color: { rgb: "0F172A" } },
        right: { style: "thin", color: { rgb: "0F172A" } },
      },
    };
  }

  // ارتفاع صف الهيدر
  worksheet["!rows"] = [{ hpt: 28 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "البيانات");

  // ملاحظة: أنماط الخلايا الكاملة تحتاج xlsx-js-style في بعض البيئات.
  // المكتبة xlsx الأساسية تحفظ البيانات + الأعمدة + التجميد بشكل موثوق.
  XLSX.writeFile(
    workbook,
    `${fileName}_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`
  );
};

/** قراءة ملف إكسيل إلى مصفوفة JSON */
export const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(json as any[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsBinaryString(file);
  });
};

/** تحميل قالب فارغ (صف هيدر فقط + صف مثال اختياري) */
export const downloadExcelTemplate = (
  columns: string[],
  fileName: string,
  sampleRow?: Record<string, any>
) => {
  const rows = sampleRow ? [sampleRow] : [];
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}], {
    header: columns,
  });
  // إن لم توجد بيانات، نضع الهيدر يدوياً
  if (!rows.length) {
    XLSX.utils.sheet_add_aoa(worksheet, [columns], { origin: "A1" });
  }
  (worksheet as any)["!dir"] = "rtl";
  worksheet["!cols"] = columns.map((c) => ({ wch: Math.max(c.length + 4, 14) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "القالب");
  XLSX.writeFile(workbook, `قالب_${fileName}.xlsx`);
};
