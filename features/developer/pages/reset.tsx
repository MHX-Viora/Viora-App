import { AuthForm } from "../components/auth-form";
import { pageMetadata } from "../lib/site";
export const metadata = pageMetadata("Đặt lại mật khẩu", "/reset-password", "Đặt lại mật khẩu tài khoản ANKT Developer.", false);
export default function Reset() { return <AuthForm mode="reset" />; }
