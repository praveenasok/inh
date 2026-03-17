# Indian Natural Hair Factory - Inventory & Manufacturing Management System

## 1. Complete System Architecture
The system is built as a complete web-based ERP optimized for traceability, structured via a classic 3-tier architecture. 
- **Frontend (Presentation Layer):** Single Page Application (SPA) built using React / Next.js, styled with Tailwind CSS for high responsiveness on both mobile and desktop.
- **Backend (Business Logic Layer):** Node.js / Express API (or Next.js Serverless API Routes) to act as a stateless intermediary, communicating with the persistence layer.
- **Database (Data Layer):** PostgreSQL, managed via Prisma ORM to maintain strict relationships, required for deep traceability and ACID compliance. 
- **Authentication:** JWT-based authentication (via NextAuth.js or Firebase Auth) mapping to specific RBAC (Role-Based Access Control) defined profiles (`Admin`, `Purchase`, `Raw Hair Room`, `WIP Room`, `Semi Finished Room`, `Finished Goods Room`, `Accounts/View only`).

## 2. Database Schema (Tables, Fields, Relationships)

### User & Authentication
- **User:** `id`, `name`, `email`, `password_hash`, `role`, `created_at`

### Master Data
- **Supplier:** `id`, `code`, `name`, `address`, `phone`, `contact_person`, `is_active`
- **SupplierRate:** `id`, `supplier_id`, `hair_type_id`, `length`, `rate`
- **HairType:** `id`, `name` (e.g., "Non Remy 2x2", "Machine Remy")
- **Product:** `id`, `sku`, `description`, `unit`, `active`
- **SpecSheet (BOM):** `id`, `product_id`, `version`, `standard_wastage_pct`
- **SpecSheetItem:** `id`, `spec_sheet_id`, `hair_type_id`, `length`, `qty_required`, `uom`
- **WastageCategory:** `id`, `name` (Moisture, Rubber Bands, Short Hair, Unrecoverable)

### Procurement & Raw Material
- **Lot:** `id`, `lot_id_string` (e.g. `LOT-YYYYMMDD-SUPPLIER-12345`), `supplier_id`, `purchase_date`, `status`
- **PurchaseReceipt:** `id`, `lot_id`, `hair_type_id`, `qty_received`, `rate_applied`, `total_amount`

### Core Inventory
- **Stock:** `id`, `room` (RH, WIP, SF, FG), `lot_id` (Nullable if SF/FG, but tracked in lineage), `hair_type_id`, `length`, `qty_available`, `qty_reserved`, `uom`
- **StockMovement:** `id`, `movement_id_string`, `from_room`, `to_room`, `material_id`, `qty`, `mo_id` (nullable), `user_id`, `date`, `status`

### Sales & Manufacturing
- **Order:** `id`, `order_number` (e.g. `SO-YYYYMMDD-#####`), `customer_name`, `date`, `delivery_date`, `remarks`, `status`
- **OrderItem:** `id`, `order_id`, `product_id`, `qty`
- **ManufacturingOrder (MO):** `id`, `mo_number`, `parent_mo_id` (Self-referencing nullable), `order_id`, `room`, `status`, `target_hair_type_id`, `target_length`, `qty_to_make`, `expected_wastage_pct`
- **MOInput:** `id`, `mo_id`, `stock_id`, `qty_consumed`
- **MOOutput:** `id`, `mo_id`, `stock_id` (new generated stock), `qty_produced`
- **MOWastage:** `id`, `mo_id`, `category_id`, `qty`, `percentage`, `notes`, `supervisor_approved`

## 3. Screen-by-Screen UI/UX Flow
1. **Login:** Role-based redirection.
2. **Dashboard:** KPI cards (Today's Orders, Pending MOs, Stock Alerts, MO Status pie chart).
3. **Supplier Management:** CRUD interface. Inner matrix to set price-per-length for each type. 
4. **Raw Hair Purchase Entry:** Date picker, Supplier Auto-select, Items grid (Type, Qty, Rate). Auto generates LOT_ID. "Print Receipt" action.
5. **Raw Hair Inventory:** Live grid showing LOT_ID, supplier name, type, length, and available vs. reserved amounts.
6. **BOM/Spec Sheet:** Interface for selecting a finished Product and defining specific type/length constituents required to produce 1 unit.
7. **Order Entry:** "New Sales Order" -> Customer Info -> Line items (Products + Quantities). A trigger to "Generate FG MO" appears upon saving.
8. **MO Dashboard:** Kanban or Data Table sorted by Room priorities (Draft -> In Progress -> Closed).
9. **WIP Segregation:** Barcode/Manual input of `LOT_ID`. UI generates expected fields for 4" to 41" output + wastage bins. Enforces `Input = Outputs + Wastages`.
10. **Traceability Tree View:** A search box accepting Order#, MO#, or LOT_ID, opening a cascading hierarchical view linking all inputs and outputs.
11. **Reports:** Tabbed interface for Purchase summaries, Stock Aging, Yield vs Wastage metrics.

## 4. Core Workflows
1. **Sales Order Creation:** User enters Order data. System reads BOMs for ordered SKUs and calculates total theoretical required raw combinations.
2. **Order -> MO (Finished Goods):** FG Manager creates MO(FG). If components are short, raises inner MO(SF) to Semi-Finished room.
3. **MO (SF) -> MO (WIP):** SF manager needs Machine Remy 22". Looks at raw stock, creates MO(WIP) for WIP to convert raw 22" Non-Remy into SF 22" Machine Remy.
4. **WIP Processing:** WIP room processes Raw LOT_ID. Scans LOT_ID into system. Segregates into clean outputs and records wastage items.
5. **Material Issue & Stock Move:** Material flows up the chain. System deducts source stock and adds to destination stock via Movement IDs.

## 5. Traceability Logic
**Recursive Lineage Tracing via relationships:**
- To trace *forward* (Where did this raw LOT go?): `Lot -> MOInput -> MO -> MOOutput -> new Stock -> MOInput -> ... -> FG Order`.
- To trace *backward* (What raw hairs match this FG Order?): `Order -> MO -> MOInput -> Stock -> (Created from MOOutput) -> MO -> MOInput -> Lot`.
*By structuring Stock to retain parent MO IDs and MO to retain parent Orders, full graphing is instantaneous via optimized SQL recursive CTEs.*

## 6. Wastage Accounting Logic
1. During WIP MO completion, operator logs actual production.
2. `Sum of outputs (lengths)` is subtracted from `Initial Input Qty`. The difference MUST exactly match the sum provided in wastage fields (Moisture, Short Hair, Rubber Bands, Unrecoverable). 
3. If `<Moisture % Loss>` or `<Total Wastage % Loss>` exceeds the baseline benchmark configured in the BOM/Master, the MO status changes to `Pending Supervisor Approval` before allowing stock creation.

## 7. Sample Data (JSON Seeds)
`Seed data is provided in the starter code generated along with this setup.` 
Expected sets include 5 vendors (e.g. "Arun Hair Exports", "Siva Trading"), lengths 10"-30", dummy BOM for "100g Machine Weft 20in", and sample lot "LOT-20260222-AHE-00001".

## 8. Suggested Tech Stack
- **Framework:** Next.js (React Server Components + API routes)
- **Styling:** Tailwind CSS + shadcn/ui components (for ultra clean, robust and modern looks)
- **Database:** PostgreSQL (with Prisma ORM)
- **Charting/Visuals:** Recharts (Dashboard) and Reactflow (for Traceability UI)

## 9. Step-by-Step Implementation Plan
**Phase 1: Foundation (Current Week)**
- Init Database schemas using Prisma.
- Implement Role-Based Login and Master Data tables (Suppliers, Types, Lengths).
**Phase 2: Inward & Inventory Setup**
- Build Raw Hair Purchase Screen (LOT ID generation).
- Build Stock Table and inter-room Stock Movement logic.
**Phase 3: Sales & BOM**
- Build Product Spec Sheets and BOM versioning.
- Build Order Entry and auto-BOM explosion to calculate material requirement.
**Phase 4: Manufacturing Orders & WIP**
- Implement MO cascading (FG -> SF -> WIP).
- Implement WIP Mass Balance Check (Input = Output + Wastage).
**Phase 5: Reporting & Traceability**
- Build Recursive Traceability visualizer.
- Finalize KPI Dashboard and Reports.
