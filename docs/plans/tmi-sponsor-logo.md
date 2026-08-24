# Implementation Plan: Logo bảo trợ TMI

## Architecture Decisions

- Dùng một component chung để đảm bảo mọi vị trí đồng nhất.
- Sao chép nguyên bản ảnh người dùng vào `assets/images` và hiển thị bằng `contain`.

## Tasks

1. Thêm test thất bại cho asset, component và hai nơi sử dụng.
2. Thêm asset và component `TmiSponsor`.
3. Thay hai dòng chữ rời bằng component chung, loại bỏ style không còn dùng.
4. Chạy test, type-check, lint, web export và review.

## Risks

- Ảnh nguồn lớn: React Native bundler chỉ tải một asset dùng chung; giao diện hiển thị giới hạn 64px.
