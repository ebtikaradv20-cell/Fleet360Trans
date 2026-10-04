const handleDeleteTire = async (id: number) => {
  if (!confirm("هل أنت متأكد من حذف أمر الكاوتش هذا؟")) return;

  try {
    // 1. المحاولة عبر المسار الديناميكي
    let res = await fetch(`/api/tires/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });

    // 2. المحاولة عبر Query Params إذا أعاد الخادم 404 أو 405
    if (res.status === 404 || res.status === 405) {
      res = await fetch(`/api/tires?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    }

    const resData = await res.json().catch(() => ({}));

    if (res.ok && resData.success !== false) {
      // حذف العنصر محلياً فوراً من الجدول ليختفي من الشاشة دون تأخير
      setTires((prev: any[]) => prev.filter((item: any) => item.id !== id));
      alert(resData.message || "تم حذف أمر الكاوتش بنجاح");
      // إعادة تحميل البيانات للمزامنة الكاملة
      if (typeof loadTires === "function") loadTires();
    } else {
      alert(resData.error || "فشل حذف أمر الكاوتش من الخادم");
    }
  } catch (error) {
    console.error("Error deleting tire:", error);
    alert("تعذر الاتصال بالخادم لإتمام عملية الحذف.");
  }
};
