import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "@/theme";
import { calendarMonthCells, localDateKey, parseLocalDate } from "./advertisement-schedule";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function AdvertisementStartCalendar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => value.slice(0, 7) + "-01");
  const today = localDateKey(new Date());
  const minimumMonth = today.slice(0, 7) + "-01";
  const monthDate = parseLocalDate(month)!;
  const label = parseLocalDate(value)?.toLocaleDateString("vi-VN") ?? value;
  const styles = useMemo(() => StyleSheet.create({
    trigger: { alignItems: "center", backgroundColor: colors.input, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md },
    triggerText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "600" },
    calendar: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm },
    heading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
    monthText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    arrow: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { alignItems: "center", justifyContent: "center", minHeight: 40, width: "14.285714%" },
    day: { alignItems: "center", borderRadius: 20, height: 36, justifyContent: "center", width: 32 },
    selected: { backgroundColor: colors.primary },
    today: { borderColor: colors.primary, borderWidth: 1 },
    dayText: { color: colors.text, fontSize: 13 },
    selectedText: { color: colors.primaryContrast, fontWeight: "700" },
    muted: { color: colors.textMuted, fontSize: 12 },
    disabled: { opacity: 0.35 },
    helper: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm },
  }), [colors]);

  const changeMonth = (offset: number) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + offset, 1);
    const key = localDateKey(next);
    if (key >= localDateKey(new Date()).slice(0, 7) + "-01") setMonth(key);
  };

  return (
    <View>
      <Pressable accessibilityLabel={`Chọn ngày bắt đầu: ${label}`} accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => {
        if (!open) {
          const selectedMonth = value.slice(0, 7) + "-01";
          setMonth(selectedMonth < minimumMonth ? minimumMonth : selectedMonth);
        }
        setOpen(!open);
      }} style={styles.trigger}>
        <Ionicons color={colors.primary} name="calendar-outline" size={20} />
        <Text style={styles.triggerText}>Chọn ngày · {label}</Text>
        <Ionicons color={colors.textMuted} name={open ? "chevron-up" : "chevron-down"} size={18} />
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <View style={styles.heading}>
            <Pressable accessibilityLabel="Tháng trước" accessibilityRole="button" disabled={month <= minimumMonth} onPress={() => changeMonth(-1)} style={[styles.arrow, month <= minimumMonth && styles.disabled]}><Ionicons color={colors.text} name="chevron-back" size={20} /></Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.monthText}>Tháng {monthDate.getMonth() + 1}/{monthDate.getFullYear()}</Text>
            <Pressable accessibilityLabel="Tháng sau" accessibilityRole="button" onPress={() => changeMonth(1)} style={styles.arrow}><Ionicons color={colors.text} name="chevron-forward" size={20} /></Pressable>
          </View>
          <View style={styles.grid}>
            {WEEKDAYS.map(day => <View key={day} style={styles.cell}><Text style={styles.muted}>{day}</Text></View>)}
            {calendarMonthCells(month).map((date, index) => date ? (
              <View key={date} style={styles.cell}>
                <Pressable accessibilityLabel={`Ngày ${parseLocalDate(date)!.toLocaleDateString("vi-VN")}`} accessibilityRole="button" accessibilityState={{ selected: date === value }} disabled={date < today} onPress={() => {
                  if (date < localDateKey(new Date())) return;
                  onChange(date);
                  setOpen(false);
                }} style={[styles.day, date === today && styles.today, date === value && styles.selected, date < today && styles.disabled]}>
                  <Text style={[styles.dayText, date === value && styles.selectedText]}>{Number(date.slice(-2))}</Text>
                </Pressable>
              </View>
            ) : <View key={`empty-${index}`} style={styles.cell} />)}
          </View>
          <Text style={styles.helper}>Chỉ chọn được hôm nay hoặc ngày trong tương lai.</Text>
        </View>
      ) : null}
    </View>
  );
}
