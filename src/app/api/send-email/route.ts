import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function auth(req: NextRequest) {
  try { return verifyToken(req.cookies.get("fleet360_token")?.value || ""); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { to, subject, html, attachmentUrl, attachmentName } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "بيانات الإيميل غير مكتملة" }, { status: 400 });
    }

    // ⚡ إعداد خادم Outlook (Office 365)
    // ملاحظة: يجب وضع الإيميل والباسورد في إعدادات Vercel لاحقاً (Environment Variables)
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", // خادم أوتلوك
      port: 587,
      secure: false, // TLS
      auth: {
        // ضع إيميل تجريبي هنا مؤقتاً للتجربة، ثم استبدله بإيميل الشركة
        user: process.env.EMAIL_USER || "your_email@outlook.com", 
        pass: process.env.EMAIL_PASS || "your_password", 
      },
    });

    // تجهيز المرفقات (الفاتورة)
    let attachments = [];
    if (attachmentUrl) {
      attachments.push({
        filename: attachmentName || "invoice.png",
        path: attachmentUrl, // Nodemailer ذكي جداً، يقبل الـ Base64 مباشرة من الـ URL!
      });
    }

    // إرسال الإيميل
    const info = await transporter.sendMail({
      from: `"Fleet360 System" <${process.env.EMAIL_USER || "your_email@outlook.com"}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ success: true, message: "تم إرسال الإيميل بنجاح!", messageId: info.messageId }, { status: 200 });
  } catch (error: any) {
    console.error("Email Sending Error:", error);
    return NextResponse.json({ error: `فشل إرسال الإيميل: ${error.message}` }, { status: 500 });
  }
}
