import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx"; // سنحتفظ به للقراءة فقط لأنها أسرع

// ── 1. دالة تصدير الإكسيل (منسقة وملونة) ──
export const exportToExcel = async (data: any[], fileName: string) => {
  if (!data || data.length === 0) {
    alert("لا توجد بيانات لتصديرها");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("البيانات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }], // RTL وتجميد الهيدر
  });

  // استخراج أسماء الأعمدة من أول صف
  const columns = Object.keys(data[0]);
  worksheet.columns = columns.map(col => ({
    header: col,
    key: col,
    width: Math.max(col.length + 10, 20), // عرض تلقائي للعمود
  }));

  // إضافة البيانات
  worksheet.addRows(data);

  // ── التنسيق (Styling) ──
  worksheet.columns.forEach((column, colIndex) => {
    // 1. تلوين الهيدر (أزرق مؤسسي)
    const headerCell = worksheet.getCell(1, colIndex + 1);
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    headerCell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12, name: "Arial" };
    headerCell.alignment = { horizontal: "center", vertical: "middle" };
    headerCell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };

    // 2. تلوين الأعمدة (تبادل ألوان - Zebra Columns)
    const isEven = colIndex % 2 === 0;
    column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) { // تخطي الهيدر
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFFFFFFF" : "FFF1F5F9" }, // أبيض ورصاصي فاتح
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      }
    });
  });

  // حفظ وتحميل الملف
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${fileName}_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.xlsx`);
};

// ── 2. دالة تحميل قالب الإكسيل (للاستيراد) بنفس التنسيق ──
export const downloadExcelTemplate = async (columns: string[], fileName: string, sampleRow?: Record<string, any>) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("قالب إدخال البيانات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = columns.map(col => ({ header: col, key: col, width: 25 }));
  
  if (sampleRow) {
    worksheet.addRow(sampleRow);
  }

  // تلوين الهيدر والأعمدة للقالب
  worksheet.columns.forEach((column, colIndex) => {
    const headerCell = worksheet.getCell(1, colIndex + 1);
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } }; // أخضر مؤسسي للقالب
    headerCell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };
    headerCell.alignment = { horizontal: "center", vertical: "middle" };

    const isEven = colIndex % 2 === 0;
    column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFFFFFFF" : "FFF1F5F9" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `قالب_${fileName}.xlsx`);
};

// ── 3. قراءة الإكسيل (تعتمد على مكتبة xlsx لسرعتها في المتصفح) ──
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
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsBinaryString(file);
  });
};
