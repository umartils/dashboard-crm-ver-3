export { auth as proxy } from "@/auth";
export const config = { matcher: ["/dashboard/:path*", "/donors/:path*", "/api/backend/:path*"] };
