# Shop features (v9.5.0)

## Login

| | |
|---|---|
| Owner | `smart` / `1234` |
| Team | Username + password set under **Team & Owners** |
| Remember me | Optional; stored with Electron `safeStorage` when available |

## Scan to add (serials)

On **Inventory** and **Serial Tracking**:

1. Click **Scan to add**.
2. Choose the product.
3. Focus the scan box; USB HID scanners type the serial and Enter (or type + Enter).

Each new serial is **in stock** and adds **1** to that product. Duplicates and empty scans are rejected. The product must exist in the list.

USB scanners that act as a keyboard need no extra driver.

## Accounts

**Sales → Accounts** (`#/accounts`). Cash profit = money in − money out. Invoice payments, received POs, and the cashbook (`CB-` entries) feed the totals. Custom expense categories can be typed and are stored on the company record.

## Search

Header search matches SKU, name, specs, category (compact SKU like `camhik201` works). Click a product to open inventory with `?open=`.

## Stock

Out-of-stock products can still be invoiced (warning only). Inventory **Set stock** accepts 0 and above.
