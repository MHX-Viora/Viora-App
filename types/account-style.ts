export enum AccountStyle {
  Personal = 0,
  Creator = 1,
  Journalist = 2,
  Business = 3,
  Organization = 4,
  Agency = 5,
}

export const ACCOUNT_STYLE_LABELS: Record<AccountStyle, string> = {
  [AccountStyle.Personal]: "Cá nhân",
  [AccountStyle.Creator]: "Nhà sáng tạo",
  [AccountStyle.Journalist]: "Nhà báo",
  [AccountStyle.Business]: "Doanh nghiệp",
  [AccountStyle.Organization]: "Tổ chức",
  [AccountStyle.Agency]: "Cơ quan",
};

export const canCreateArticle = (accountStyle: AccountStyle | number | undefined) =>
  accountStyle !== undefined && accountStyle !== AccountStyle.Personal;
