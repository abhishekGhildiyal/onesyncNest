# Shopify Synchronization & Translation Layer Documentation

## Overview

- Acts as a **Translation Layer**
- Converts **local database data → Shopify-compatible payload**
- Ensures compatibility with:
  - Shopify
  - Third-party apps (GOAT, Stadium Goods)

---

## Why Tagging is Critical

- Tags act as:
  - Automation triggers
  - Visibility controls
  - Marketplace sync signals
- Incorrect tagging can:
  - Break integrations
  - Cause wrong listings
  - Affect search & filtering

---

# 1. Core Platform Tags (OSM, OSW, OSP)

## Purpose

- Identify source and scope of inventory

## Tags

- **OSM (OneSync Master)**
  - Added to every synced product
  - Distinguishes system-created vs manual products

- **OSW (OneSync Web)**
  - Added when `publishedScope === 'web'`
  - Marks items for online store

- **OSP (OneSync POS)**
  - Added for POS (physical store) items

---

# 2. GOAT App Integration

## Purpose

- Control GOAT marketplace syncing

## Tags

- **gsync**
  - Triggers GOAT listing
  - Applied only to:
    - Web items
    - Verified items ready for sale

- **gexclude**
  - Prevents GOAT listing
  - Used for:
    - POS items
    - Items not ready for marketplace

---

# 3. Stadium Goods Integration

## Purpose

- Ensure compliance with strict listing rules

## Key Rule

- Only **"New" condition items** allowed

## Logic

- Add `stadiumgoods` tag only if:
  - Store is a Stadium Goods partner
  - **All variants are "New"**

- Do NOT add if:
  - Even one variant is "Used"

---

# 4. Dynamic Tag Merging

## Purpose

- Improve searchability and filtering

## Sources

### Product-Level Tags

- Examples:
  - Sneakers
  - Yeezy
  - Limited Edition
- Filtered by:
  - Web / POS scope

### Variant-Level Tags (`itemTags`)

- Examples:
  - Defect
  - No Box

## Result

- Combined tag set ensures:
  - Full product discoverability
  - Variant-specific visibility

---

# 5. Exact Parity with Java System

## Why Important

- Java backend = Source of Truth

## Benefits

- Automation consistency
- Marketplace compliance
- No unexpected behavior
- Same Shopify filtering logic

---

# 6. Processing Flow

Scope Check
→ Base Tags (OSM / OSW / OSP)
→ App Tags (gsync / gexclude)
→ Partner Rules (stadiumgoods)
→ Custom DB Tags

---

# 7. Core Product Attributes

## Title

- Uses `inventory.displayName`
- POS items include unique identifiers

## Handle (URL)

- Generated from sanitized displayName
- Ensures uniqueness

## Status

- Always set to `active`

## Visibility

- **Web Items**
  - `published_scope: web`
  - `published: true`

- **POS Items**
  - `published_scope: global`
  - `published: false`

## Description Priority

1. `productList.description`
2. `inventory.description`

---

# 8. Variant & Inventory Logic

## SKU

- Uses `inventory.skuNumber`

## Quantity

- Always `1`
- Each variant = unique physical item

## Barcode Strategy

- **Web**
  - Use `web_barcode`

- **POS**
  - Use `barcode`
  - Fallback:
    - `migrationId` (if enabled)

## Cost Logic

- If `accountType === 1`
  - Use `purchase_price`
- Else
  - Use `payout`

## Taxation

- `taxable = true` only if:
  - Price > `taxThreshold`
  - `isChargeTax = true`

## Sorting

- Based on template options
- Example:
  - Size 8 before Size 9
- Ensures consistent UI

---

# 9. Image Handling

## Priority

1. If `linkedImage = false`
   - Use `variantImage`
2. Else
   - Use inventory image list

---

# 10. Throttling & Performance

## Shopify API Limit

- 2 requests per second

## Controls

- **Loop Delay**
  - 1.5 seconds between items

- **Lookup Delay**
  - 1.0 second after handle lookup

## Retry Strategy

- Handles `429 Too Many Requests`
- Uses quadratic backoff:
  - 2s → 8s → 18s → ...

---

# Final Summary

- Ensures:
  - Accurate Shopify sync
  - Safe marketplace integrations
  - Consistent behavior with legacy Java system

- Core idea:
  **Transform → Tag → Validate → Sync**
