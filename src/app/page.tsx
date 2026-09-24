import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
<div className="mt-8 text-center text-xs text-gray-400 font-medium tracking-wide">
  Architected & Developed by <span className="text-primary font-bold">Omar Abd Elhalim</span> © {new Date().getFullYear()}
</div>
