# Compact wallet and adjacent promotion

Use the supplied navy/gold background as a new static asset. Keep the wallet's
aspect ratio 1853:849 on all devices and cap its width at 420px; the desktop wallet
must be no larger than its handheld design. Desktop promotion sits to its right;
on narrow containers it moves below. Determine this using measured container
width, not only viewport width. Banner artwork reuses existing ANKT Mini App art.

Keep real VND and coin balances, hide/show masking, loading/error/retry and
deposit/withdraw/history routes. Put coins immediately below money and label
them Xu ANKT. Action buttons become icons with accessible labels, focus/hover
feedback and touch targets. Add a manage-wallet icon for the existing /wallet
route; do not invent a payment QR action without an existing route.

Order: update wallet tests -> implement compact wallet -> verify; build responsive
wallet/banner row -> verify real callbacks and browser geometry at 320/375/768/
1024/1440 -> typecheck/lint. No wallet API/business-rule changes, new dependencies,
paid ad delivery/billing changes, transactions, deployment or automatic commits.
Banner destination awaits the user's optional choice; default is the Mini App
section as in the reference. Do not show fabricated campaign data.
