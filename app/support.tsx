import { ProfileInfoScreen } from "@/features/profile/profile-info-screen";

export default function SupportRoute() {
  return (
    <ProfileInfoScreen
      title="Hỗ trợ"
      sections={[
        {
          title: "Trung tâm trợ giúp",
          description:
            "Tìm hướng dẫn sử dụng, câu hỏi thường gặp và các cách xử lý sự cố khi dùng ANKT.",
        },
        {
          title: "Liên hệ hỗ trợ",
          description:
            "Kênh gửi phản hồi, báo lỗi và yêu cầu hỗ trợ trực tiếp sẽ được phát triển tại đây.",
        },
      ]}
    />
  );
}
