import { AdvertisementCtaType, AdvertisementStatus } from "@/types/advertisement";

export const advertisementCtaLabel = (type: AdvertisementCtaType) => ({
  [AdvertisementCtaType.LearnMore]: "Xem thêm",
  [AdvertisementCtaType.BuyNow]: "Mua ngay",
  [AdvertisementCtaType.Message]: "Nhắn tin",
  [AdvertisementCtaType.SignUp]: "Đăng ký",
  [AdvertisementCtaType.Download]: "Tải ứng dụng",
  [AdvertisementCtaType.ViewProduct]: "Xem sản phẩm",
  [AdvertisementCtaType.GetOffer]: "Nhận ưu đãi",
  [AdvertisementCtaType.ContactNow]: "Liên hệ ngay",
  [AdvertisementCtaType.Follow]: "Theo dõi",
}[type] ?? "Xem thêm");

export const advertisementStatusLabel = (status: AdvertisementStatus) => ({
  [AdvertisementStatus.Draft]: "Bản nháp",
  [AdvertisementStatus.Pending]: "Chờ duyệt",
  [AdvertisementStatus.Approved]: "Đã duyệt",
  [AdvertisementStatus.Active]: "Đang chạy",
  [AdvertisementStatus.Paused]: "Tạm dừng",
  [AdvertisementStatus.Completed]: "Hoàn tất",
  [AdvertisementStatus.Rejected]: "Bị từ chối",
  [AdvertisementStatus.Cancelled]: "Đã hủy",
}[status] ?? "Không xác định");
