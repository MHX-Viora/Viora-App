export const REEL_PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2] as const;

export const REEL_VIDEO_TOP_OFFSET = 30;

export const REEL_REPORT_REASONS = [
  { description: "Nội dung spam hoặc gây hiểu nhầm", label: "Spam", value: 0 },
  {
    description: "Nội dung quấy rối hoặc công kích",
    label: "Quấy rối",
    value: 1,
  },
  {
    description: "Nội dung bạo lực hoặc nguy hiểm",
    label: "Bạo lực",
    value: 2,
  },
  {
    description: "Nội dung người lớn hoặc phản cảm",
    label: "Nhạy cảm",
    value: 3,
  },
  { description: "Lý do khác", label: "Khác", value: 4 },
];
