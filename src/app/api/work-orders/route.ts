export async function POST(req: NextRequest) {
  try {
    const user = auth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const b = await req.json().catch(() => ({}));
    let plateNumber = String(b.plateNumber || "").trim();
    let vehicleId = b.vehicleId ? Number(b.vehicleId) : null;
    if (!plateNumber) return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const isHighLevel = user.role === "super_admin" || user.role === "owner";
    // ⚡ إذا كان الإدارة العليا: قيد التنفيذ، غير ذلك: بانتظار الموافقة
    const finalStatus = isHighLevel ? "in_progress" : "pending_approval";

    const payload = {
      tenant_id: user.tenantId || 'master',
      order_number: String(b.orderNumber || `WO-${Date.now()}`),
      vehicle_id: vehicleId, plate_number: plateNumber,
      maintenance_type: String(b.maintenanceType || "صيانة ميكانيكا"),
      status: finalStatus,
      workshop: String(b.workshop || ""), description: String(b.description || ""),
      cost: Number(b.cost) || 0, start_date: b.startDate || null, end_date: b.endDate || null,
      technician_name: String(b.technicianName || ""), received_by: String(b.receivedBy || ""),
      lifespan_km: Number(b.lifespanKm) || 0, invoice_url: String(b.invoiceUrl || ""), notes: String(b.notes || "")
    };

    const [row] = await db.insert(workOrders).values(payload as any).returning();

    // ⚡ دورة الإشعارات (Workflow Notifications)
    if (!isHighLevel) {
      // إرسال لمركز الموافقات
      await db.execute(sql`
        INSERT INTO approvals (tenant_id, module_name, record_id, request_type, status, notes, requested_by)
        VALUES (${user.tenantId}, 'work_orders', ${row.id}, 'add', 'pending', ${'طلب إنشاء صيانة: ' + payload.maintenance_type}, ${user.username})
      `);
      
      // إشعار مباشر لمديري النظام
      await db.execute(sql`
        INSERT INTO notifications (tenant_id, target_username, title, message, link)
        SELECT tenant_id, username, 'طلب صيانة جديد بانتظار الاعتماد', ${`طلب من ${user.username} للسيارة ${plateNumber}`}, '/dashboard/approvals'
        FROM users WHERE role IN ('super_admin', 'owner')
      `);

      // إشعار للمستخدم نفسه لتطمينته
      await db.execute(sql`
        INSERT INTO notifications (tenant_id, target_username, title, message, link)
        VALUES (${user.tenantId}, ${user.username}, 'تم إرسال الطلب', ${`تم إرسال أمر صيانة السيارة ${plateNumber} للإدارة للموافقة`}, '/dashboard/work-orders')
      `);

      return NextResponse.json({ success: true, data: row, message: "تم الإرسال للإدارة للاعتماد." }, { status: 201 });
    } else {
      // إشعار من الإدارة للفروع بأن الصيانة بدأت
      await db.execute(sql`
        INSERT INTO notifications (tenant_id, target_username, title, message, link)
        SELECT tenant_id, username, 'بدء صيانة جديدة', ${`الإدارة بدأت صيانة (${payload.maintenance_type}) للسيارة ${plateNumber}`}, '/dashboard/work-orders'
        FROM users WHERE role IN ('admin', 'user') AND tenant_id = ${user.tenantId}
      `);
      return NextResponse.json({ success: true, data: row }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `فشل الحفظ: ${e.message}` }, { status: 500 });
  }
}
