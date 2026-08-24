# Implementation Plan: Bố cục và cuộn bài viết dài

## Architecture Decisions

- Dùng chung `layout.articleMaxWidth` cho editor và reader để hai luồng đồng nhất.
- Chỉ giới hạn content container; header và toolbar vẫn phủ viewport để thao tác ổn định.
- Giữ `DraggableFlatList` làm scroll owner duy nhất của editor.

## Task List

### Task 1: Khóa hành vi bằng kiểm thử

- Acceptance: test yêu cầu token `760/720`, editor dùng responsive content layout và bật cuộn dọc.
- Verify: test mục tiêu phải thất bại trước khi sửa triển khai.
- Files: test editor, reader và breakpoint.

### Task 2: Đồng bộ chiều rộng editor và reader

- Acceptance: desktop căn giữa tối đa `760px`; media tối đa `720px`; mobile full-width.
- Verify: test mục tiêu và TypeScript đạt.
- Files: token layout, editor, reader/renderer nếu cần.

### Task 3: Củng cố cuộn tạo/chỉnh sửa

- Acceptance: wrapper và danh sách dùng chung đều nhận `flex: 1`, bật scroll, nested scroll, giữ padding đáy và keyboard behavior.
- Verify: test editor đạt với cả hợp đồng create/edit dùng chung.
- Files: editor và test editor.

### Checkpoint

- Full test, lint, web export và review năm trục đều đạt.

## Risks and Mitigations

- Giới hạn content container có thể làm mobile hẹp: helper trả `width: 100%` khi không phải desktop.
- Toolbar che nội dung cuối: giữ padding đáy theo safe area và keyboard spacer.
