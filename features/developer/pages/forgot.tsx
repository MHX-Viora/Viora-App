import { AuthForm } from "../components/auth-form";
import { pageMetadata } from "../lib/site";
export const metadata = pageMetadata("Quên mật khẩu", "/forgot-password", "Yêu cầu đặt lại mật khẩu ANKT Developer.", false);
export default function Forgot() { return <AuthForm mode="forgot" />; }
