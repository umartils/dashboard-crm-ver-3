"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, } from "next/navigation";
import { toast } from "sonner";

export default function LoginToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const error = searchParams.get("error");

  useEffect(() => {
    if (!error) return;

    if (error === "EmailNotRegistered") {
      toast.error("Akses ditolak", {
        description:
          "Email Google Anda belum terdaftar sebagai pengguna Dashboard CRM.",
      });
      
    } else {
      toast.error("Login gagal", {
        description:
          "Terjadi kesalahan saat melakukan login. Silakan coba kembali.",
      });
    }

    // Bersihkan query error agar toast
    // tidak muncul kembali saat refresh.
    router.replace("/login");
  }, [error, router]);

  return null;
}