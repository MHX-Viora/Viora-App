import { AuthForm } from "../components/auth-form";
import { pageMetadata } from "../lib/site";
export const metadata = pageMetadata("Đăng ký", "/register", "Thông tin về đăng ký Developer.", false);
export default function Register() { return <AuthForm mode="register" />; }
