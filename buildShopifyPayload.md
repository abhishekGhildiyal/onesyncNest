# Shopify Translation Layer & Tagging Logic

This function acts as the **Translation Layer**, converting local database data into a format that Shopify and its third-party apps (like GOAT and Stadium Goods) can understand.

The tagging logic is the most critical part because **tags in Shopify act as triggers for automation, visibility, and external marketplace syncing.**

---

## 1. Core Platform Tags (OSM, OSW, OSP)

These are internal markers used by our system to identify where the inventory originated:

- **OSM (OneSync Master)**
  Every product synced through our system gets this tag.
  It allows us to filter "our" products in Shopify versus ones manually created in the Shopify admin.

- **OSW (OneSync Web)**
  Added when the product is meant for the online website (`publishedScope === 'web'`).

- **OSP (OneSync POS)**
  Added when the product is meant for the physical store (Point of Sale).

---

## 2. GOAT App Integration (gsync, gexclude)

Many OneSync users use the GOAT app on Shopify to sync their inventory with the GOAT marketplace.

- **gsync**
  When we add this tag, the GOAT app is triggered to automatically list this item on GOAT.
  We only apply this to **Web items** because they are verified and ready for external sale.

- **gexclude**
  When we add this tag, we are telling the GOAT app:

  > "Do not list this item on GOAT."

  This is used for POS items or items not ready for the global marketplace.

---

## 3. Stadium Goods (stadiumgoods)

Stadium Goods is a premium partner with strict listing requirements.

- **Why the `allVariantsNew` check?**
  Stadium Goods generally only accepts items in **"New" condition**.

- **Logic**
  Even if a store is a "Stadium Goods" store, we only add the `stadiumgoods` tag if:
  - Every single variant currently in stock is marked as **New**

  If even one variant is **Used**, we omit the tag to avoid rejection from their system.

---

## 4. Dynamic Tag Merging

We merge tags from two levels to ensure the Shopify product is fully searchable:

- **Product Tags**
  General tags like:
  - `Sneakers`
  - `Yeezy`
  - `Limited Edition`

  These are filtered by scope (**web vs POS**).

- **Variant Tags (`itemTags`)**
  Specific tags for individual items, such as:
  - `Defect`
  - `No Box`

  This ensures that even if only one specific pair has a unique attribute, that attribute is searchable on Shopify.

---

## 5. Why this is "Exact Parity" with Java

In the legacy Java system, these rules were hardcoded in the service layer.
By replicating them exactly in Node.js, we ensure:

- ✅ **Automation doesn't break**
  The GOAT app won’t accidentally sync POS items.

- ✅ **Marketplace compliance**
  We avoid issues like sending "Used" items to Stadium Goods.

- ✅ **Search consistency**
  Shopify filters and collections (based on tags) behave exactly as before.

---

## Summary of the Flow:

- Scope Check -> Base Tags (OSM/OSW) -> App Triggers (gsync/gexclude) -> Partner Rules (stadiumgoods) -> Custom DB Tags
