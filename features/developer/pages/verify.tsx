import { EmailVerification } from "../components/email-verification";
import { pageMetadata } from "../lib/site";
export const metadata = pageMetadata("Xác minh email", "/verify-email", "Xác minh email tài khoản ANKT Developer.", false);
export default function VerifyEmail() { return <EmailVerification />; }
