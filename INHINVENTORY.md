# INHINVENTORY: Hair Extensions Inventory Management Architecture
**Role**: Senior Full-Stack Software Architect

This document details the database schema, REST API design, and system architecture for the end-to-end Inventory Management System designed for the hair extensions manufacturing unit.

---

## 1. Relational Database Schema (PostgreSQL)

The system models raw hair length variations cleanly using a `length_inches` integer column (restricting values to 4" to 50" via constraints) rather than creating distinct columns for every length.

```sql
-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MASTER DATA
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hair type enum/lookup
CREATE TYPE hair_form_type AS ENUM (
    'GOLI', 
    'FANCY', 
    'NON_REMY_1X1', 
    'NON_REMY_2X2', 
    'REMY_FORM', 
    'MACHINE_REMY', 
    'CUTICLE_FREE'
);

-- Pre-negotiated pricing per form and length
CREATE TABLE supplier_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    hair_form hair_form_type NOT NULL,
    length_inches INTEGER, -- NULL represents bulk/unsorted lengths
    price_per_kg NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, hair_form, length_inches)
);

-- 2. INVENTORY & BATCHING
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    hair_form hair_form_type NOT NULL,
    length_inches INTEGER CHECK (length_inches >= 4 AND length_inches <= 50),
    initial_weight_kg NUMERIC(10, 3) NOT NULL,
    current_weight_kg NUMERIC(10, 3) NOT NULL CHECK (current_weight_kg >= 0),
    cost_per_kg NUMERIC(12, 2) NOT NULL, -- Cumulative cost per kg
    source_type VARCHAR(50) NOT NULL, -- 'PURCHASE', 'PROCESSING_OUTPUT', 'MIX_OUTPUT'
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'DEPLETED', 'MIXED', 'WASTE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for lineage (Many-to-Many relationship of batches)
CREATE TABLE batch_lineage (
    parent_batch_id UUID REFERENCES inventory_batches(id) ON DELETE RESTRICT,
    child_batch_id UUID REFERENCES inventory_batches(id) ON DELETE CASCADE,
    weight_contributed_kg NUMERIC(10, 3) NOT NULL,
    PRIMARY KEY (parent_batch_id, child_batch_id)
);

-- 3. PROCESSING LOGS
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(100) NOT NULL, -- 'GOLI_OPENING', 'SIZE_SEGREGATION', 'MACHINE_PROCESS', 'CHEMICAL_PROCESS'
    operator_name VARCHAR(100),
    labor_cost NUMERIC(10, 2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Details of batches consumed during a process
CREATE TABLE processing_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_log_id UUID REFERENCES processing_logs(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES inventory_batches(id),
    weight_used_kg NUMERIC(10, 3) NOT NULL
);

-- Details of new batches generated from a process (with waste logging)
CREATE TABLE processing_outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_log_id UUID REFERENCES processing_logs(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES inventory_batches(id),
    weight_produced_kg NUMERIC(10, 3) NOT NULL,
    waste_weight_kg NUMERIC(10, 3) DEFAULT 0.00
);

-- 4. COMPONENTS INVENTORY
CREATE TABLE component_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    cost_per_unit NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pcs',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BILL OF MATERIALS (BOM) & FINISHED GOODS
CREATE TABLE finished_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Wefts', 'Clip-ons', 'Wigs', etc.
    hair_weight_required_g NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_of_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
    component_id UUID REFERENCES component_inventory(id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0)
);

CREATE TABLE production_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_number VARCHAR(100) UNIQUE NOT NULL,
    product_id UUID REFERENCES finished_products(id),
    target_quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'WIP', -- 'WIP', 'COMPLETED', 'CANCELLED'
    labor_cost NUMERIC(10, 2) DEFAULT 0.00,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE production_batch_inputs (
    production_run_id UUID REFERENCES production_runs(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES inventory_batches(id),
    weight_used_kg NUMERIC(10, 3) NOT NULL,
    PRIMARY KEY (production_run_id, batch_id)
);
```

---

## 2. Backend REST API Endpoints

### Category A: Procurement
* **`POST /api/procurement/purchase`**: Log a raw material purchase.
  * **Payload**:
    ```json
    {
      "supplier_id": "uuid-string",
      "hair_form": "GOLI",
      "weight_kg": 15.5,
      "length_inches": null
    }
    ```
  * **System Action**: Performs database query to select price per kg from `supplier_prices`. Generates new inventory batch under `inventory_batches` with source `'PURCHASE'` and initial cost calculated.

### Category B: Processing
* **`POST /api/processing/goli-open`**: Record processing Goli into Fancy.
  * **Payload**:
    ```json
    {
      "source_batch_ids": ["uuid-1"],
      "output_weight_kg": 14.1,
      "labor_cost": 2500.00,
      "operator_name": "Worker A"
    }
    ```
  * **System Action**: Evaluates wastage/yield loss (e.g. 15.5 kg in, 14.1 kg out = 9.0% loss). Automatically factors labor cost + raw material cost into new output batch.
* **`POST /api/processing/grade`**: Record size segregation.
  * **Payload**:
    ```json
    {
      "source_batch_ids": ["uuid-fancy"],
      "grades": [
        { "length": 16, "weight_kg": 5.0 },
        { "length": 18, "weight_kg": 6.2 },
        { "length": 20, "weight_kg": 2.5 }
      ],
      "waste_weight_kg": 0.4,
      "labor_cost": 3000.00
    }
    ```

### Category C: Mixing
* **`POST /api/mixing/blend`**: Combine batches into specific client ratios.
  * **Payload**:
    ```json
    {
      "mix_name": "Ratio Mix #44",
      "inputs": [
        { "batch_id": "uuid-remy-16", "ratio_percentage": 40.0, "weight_used_kg": 4.0 },
        { "batch_id": "uuid-cuticle-18", "ratio_percentage": 60.0, "weight_used_kg": 6.0 }
      ]
    }
    ```

### Category D: Production
* **`POST /api/production/run/start`**: Create finished product batch.
  * **Payload**:
    ```json
    {
      "product_id": "uuid-wig",
      "target_quantity": 10,
      "source_hair_batches": [
        { "batch_id": "uuid-mix-44", "weight_used_kg": 2.5 }
      ],
      "labor_cost": 1500.00
    }
    ```

---

## 3. Cost Roll-up & Traceability Formula

1. **Raw Purchase Unit Cost**:
   $$\text{RawCost} = \text{Weight} \times \text{NegotiatedRate}$$

2. **Sorting Stage Adjusted Cost**:
   $$\text{FancyCostPerKg} = \frac{\text{RawCost} + \text{LaborCost}}{\text{OutputWeight}}$$

3. **Finished Goods Total Cost**:
   $$\text{FinalCost} = \sum (\text{BatchHairCostPerKg} \times \text{WeightUsed}) + \sum (\text{ComponentCostPerUnit} \times \text{QtyUsed}) + \text{ProductionLaborCost}$$
