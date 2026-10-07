# Live Top Gifters

## Goal

Show every viewer who has sent a gift in the desktop supporters tab and mobile ranking sheet.

## UI

- Rows show rank, existing circular avatar, name on one line, gift count beneath, and total Xu on the right.
- Top three use crown, silver, and bronze markers with restrained avatar borders. Other rows show their number.
- Sidebar displays the complete list without an extra expansion step.
- Mobile opens a bottom sheet from a compact ranking trigger and displays the complete list immediately.
- Long names ellipsize without hiding coin totals. Lists scroll independently of the Live media.

## Data and limits

- Include every record with `totalGiftCount > 0`. Rank by descending `totalCoin`, not gift count. Format 1,000/1,000,000 as K/M Xu.
- Current Live room, gift and ranking data are demo records. There is no Live Gift API, GiftReceived event, or backend gift transaction in this repository. The component accepts replaceable ranking data and reorders when that data changes; it cannot receive real gift events yet.
- Do not alter Wallet, chat, media, or gift purchase behavior.

## Verification

- Check ranking order and Xu formatting, sidebar and mobile layouts, and that opening the mobile sheet preserves the media element.
