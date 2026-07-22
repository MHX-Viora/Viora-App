import { ProfileInfoScreen } from "@/features/profile/profile-info-screen";

export default function PoliciesTermsRoute() {
  return (
    <ProfileInfoScreen
      title="Chính sách và điều khoản"
      sections={[
        {
          title: "Điều khoản sử dụng",
          description:
            "Các điều khoản sử dụng dịch vụ, trách nhiệm của người dùng và quy định cộng đồng sẽ được cập nhật tại đây.",
        },
        {
          title: "Chính sách quyền riêng tư",
          description:
            "Thông tin về cách Viora thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.",
        },
      ]}
    />
  );
}
