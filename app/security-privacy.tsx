import { ProfileInfoScreen } from "@/features/profile/profile-info-screen";

export default function SecurityPrivacyRoute() {
  return (
    <ProfileInfoScreen
      title="Bảo mật và quyền"
      sections={[
        {
          title: "Bảo vệ tài khoản",
          description:
            "Quản lý các tuỳ chọn giúp tài khoản an toàn hơn. Các tính năng xác minh, thiết bị đăng nhập và cảnh báo bảo mật sẽ được phát triển tại đây.",
        },
        {
          title: "Quyền riêng tư",
          description:
            "Kiểm soát ai có thể tương tác, xem nội dung và liên hệ với bạn trên Viora.",
        },
      ]}
    />
  );
}
