import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";

        await signOut({
          redirectTo: "/login",
        });
      }}
    >
      <button type="submit" className="logout-btn" title="Keluar">
        Keluar
      </button>
    </form>
  );
}
