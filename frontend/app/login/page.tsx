import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import LoginToast from "@/components/LoginToast";
import { LogIn } from "lucide-react";

export default async function Login() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="login">
      <LoginToast />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <Image
              src="/images/logo-full.png"
              alt="Masjid Nusantara"
              width={210}
              height={72}
              className="login-logo"
              priority
            />
          </div>
          <h3>Dashboard CRM</h3>
          {/* <p>Masjid Nusantara</p> */}
        </div>

        <form
          className="login-form"
          action={async () => {
            "use server";

            await signIn("google", {
              redirectTo: "/dashboard",
            });
          }}
        >
          <button type="submit" className="btn-google">
            <span className="google-icon-box">
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width={20}
                height={20}
                className="google-icon"
              />
            </span>
            <span>Masuk dengan Google</span>
            <LogIn size={12} className="login-arrow" />
          </button>
        </form>

        <p className="login-note">
          Gunakan akun Google yang telah terdaftar untuk mengakses dashboard.
        </p>
      </div>
    </main>
  );
}