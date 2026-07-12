import type Ionicons from "@expo/vector-icons/Ionicons";

export type UtilityItem = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  id: string;
  label: string;
};

export const utilityItems: UtilityItem[] = [
  { icon: "bag-handle-outline", id: "shopping", label: "Mua sắm" },
  { icon: "school-outline", id: "learning", label: "Học tập" },
  { icon: "briefcase-outline", id: "work", label: "Công việc" },
  { icon: "cash-outline", id: "finance", label: "Tài chính" },
  { icon: "construct-outline", id: "tools", label: "Công cụ" },
  { icon: "heart-outline", id: "health", label: "Sức khỏe" },
  { icon: "game-controller-outline", id: "entertainment", label: "Giải trí" },
  { icon: "car-outline", id: "transport", label: "Di chuyển" },
  { icon: "color-palette-outline", id: "creative", label: "Sáng tạo" },
  { icon: "hardware-chip-outline", id: "ai", label: "AI" },
];
