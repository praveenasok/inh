import { useState, useMemo } from 'react';
import { 
  Sliders, Trash2, RefreshCw, GitFork, Package, ShoppingCart, Scissors, Atom 
} from 'lucide-react';

interface SupplierPrice {
  form: string;
  length: number | null;
  price: number;
}

interface Supplier {
  id: string;
  name: string;
  shortCode: string;
  prices: SupplierPrice[];
}

interface InventoryBatch {
  id: string;
  batchNumber: string;
  supplierId: string;
  hairForm: string;
  lengthInches: number | null;
  initialWeightKg: number;
  currentWeightKg: number;
  costPerKg: number;
  sourceType: string;
  status: string;
  createdAt: string;
}

interface LineageLink {
  parentId: string;
  childId: string;
  weightContributed: number;
}

interface ComponentItem {
  sku: string;
  name: string;
  qty: number;
  threshold: number;
  cost: number;
  unit: string;
}

interface BOMItem {
  sku: string;
  qtyRequired: number;
}

interface FinishedProduct {
  sku: string;
  name: string;
  category: string;
  hairWeightRequiredG: number;
  bom: BOMItem[];
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

interface InventoryDatabase {
  suppliers: Supplier[];
  batches: InventoryBatch[];
  lineage: LineageLink[];
  components: ComponentItem[];
  finishedProducts: FinishedProduct[];
  logs: AuditLog[];
}

const DEFAULT_DB: InventoryDatabase = {
  suppliers: [
    {
      id: 'sup-1',
      name: 'Venkatesh Hair Impex',
      shortCode: 'VNK',
      prices: [
        { form: 'GOLI', length: null, price: 3200 },
        { form: 'FANCY', length: null, price: 3800 },
        { form: 'REMY_FORM', length: null, price: 5500 },
        { form: 'NON_REMY_1X1', length: 14, price: 4000 },
        { form: 'NON_REMY_1X1', length: 16, price: 4500 },
        { form: 'NON_REMY_1X1', length: 18, price: 5000 },
        { form: 'NON_REMY_1X1', length: 20, price: 5500 }
      ]
    },
    {
      id: 'sup-2',
      name: 'Royal Indian Hair',
      shortCode: 'RIH',
      prices: [
        { form: 'GOLI', length: null, price: 3100 },
        { form: 'FANCY', length: null, price: 3950 },
        { form: 'REMY_FORM', length: null, price: 5600 },
        { form: 'NON_REMY_1X1', length: 16, price: 4600 },
        { form: 'NON_REMY_1X1', length: 18, price: 5100 }
      ]
    }
  ],
  batches: [
    { id: 'b-raw-goli-1', batchNumber: 'BATCH-VNK-GOLI-001', supplierId: 'sup-1', hairForm: 'GOLI', lengthInches: null, initialWeightKg: 50.0, currentWeightKg: 35.0, costPerKg: 3200, sourceType: 'PURCHASE', status: 'ACTIVE', createdAt: '2026-06-01T10:00:00Z' },
    { id: 'b-raw-fancy-1', batchNumber: 'BATCH-RIH-FANCY-001', supplierId: 'sup-2', hairForm: 'FANCY', lengthInches: null, initialWeightKg: 20.0, currentWeightKg: 20.0, costPerKg: 3950, sourceType: 'PURCHASE', status: 'ACTIVE', createdAt: '2026-06-02T11:00:00Z' },
    { id: 'b-sorted-16', batchNumber: 'BATCH-SORTED-16-VNK', supplierId: 'sup-1', hairForm: 'NON_REMY_1X1', lengthInches: 16, initialWeightKg: 10.0, currentWeightKg: 10.0, costPerKg: 4350, sourceType: 'PROCESSING_OUTPUT', status: 'ACTIVE', createdAt: '2026-06-03T14:30:00Z' },
    { id: 'b-sorted-18', batchNumber: 'BATCH-SORTED-18-VNK', supplierId: 'sup-1', hairForm: 'NON_REMY_1X1', lengthInches: 18, initialWeightKg: 12.0, currentWeightKg: 12.0, costPerKg: 4850, sourceType: 'PROCESSING_OUTPUT', status: 'ACTIVE', createdAt: '2026-06-03T14:30:00Z' }
  ],
  lineage: [
    { parentId: 'b-raw-goli-1', childId: 'b-sorted-16', weightContributed: 10.0 },
    { parentId: 'b-raw-goli-1', childId: 'b-sorted-18', weightContributed: 12.0 }
  ],
  components: [
    { sku: 'COMP-CLIP-BLK', name: 'Clip (Standard Black)', qty: 2500, threshold: 200, cost: 15, unit: 'pcs' },
    { sku: 'COMP-CLIP-BRW', name: 'Clip (Brown)', qty: 1500, threshold: 200, cost: 15, unit: 'pcs' },
    { sku: 'COMP-BAND-BLK', name: 'Elastic Band (Black)', qty: 3000, threshold: 500, cost: 2, unit: 'pcs' },
    { sku: 'COMP-THRD-HD', name: 'Sewing Thread (Heavy Duty)', qty: 400, threshold: 50, cost: 1.5, unit: 'meters' },
    { sku: 'COMP-NET-BASE', name: 'Net Base (Closure)', qty: 120, threshold: 20, cost: 150, unit: 'pcs' }
  ],
  finishedProducts: [
    { sku: 'PROD-CLIPON-16', name: '7-Piece Clip-in Set (16")', category: 'Clip-ons', hairWeightRequiredG: 120, bom: [{ sku: 'COMP-CLIP-BLK', qtyRequired: 17 }, { sku: 'COMP-THRD-HD', qtyRequired: 2 }] },
    { sku: 'PROD-WIG-18', name: 'Premium Closure Wig (18")', category: 'Wigs', hairWeightRequiredG: 250, bom: [{ sku: 'COMP-NET-BASE', qtyRequired: 1 }, { sku: 'COMP-CLIP-BRW', qtyRequired: 4 }, { sku: 'COMP-THRD-HD', qtyRequired: 5 }] }
  ],
  logs: [
    { id: 'log-1', action: 'System Init', details: 'Seeded default database configuration', timestamp: '2026-06-05T12:00:00Z' }
  ]
};

const HAIR_FORMS = ['GOLI', 'FANCY', 'NON_REMY_1X1', 'NON_REMY_2X2', 'REMY_FORM', 'MACHINE_REMY', 'CUTICLE_FREE'];

export default function InhInventoryPage() {
  const [activeTab, setActiveTab] = useState<'procurement' | 'processing' | 'mixing' | 'finished' | 'traceability'>('procurement');

  // Database State
  const [db, setDb] = useState<InventoryDatabase>(() => {
    try {
      const saved = localStorage.getItem('inh_inventory_db');
      return saved ? JSON.parse(saved) : DEFAULT_DB;
    } catch {
      return DEFAULT_DB;
    }
  });

  const updateDb = (updater: (prev: InventoryDatabase) => InventoryDatabase) => {
    setDb(prev => {
      const updated = updater(prev);
      localStorage.setItem('inh_inventory_db', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetDb = () => {
    if (confirm('Are you sure you want to reset the database to default seed data? All custom entries will be lost.')) {
      updateDb(() => DEFAULT_DB);
      alert('Database reset completed successfully.');
    }
  };

  // --- 1. PROCUREMENT TAB STATE & HANDLERS ---
  const [procSupplierId, setProcSupplierId] = useState('');
  const [procForm, setProcForm] = useState('GOLI');
  const [procLength, setProcLength] = useState<string>('');
  const [procWeight, setProcWeight] = useState('');
  const [procManualPrice, setProcManualPrice] = useState('');
  const [procLabor, setProcLabor] = useState('');
  const [procOperator, setProcOperator] = useState('');

  // Auto price lookup
  const lookedUpPrice = useMemo(() => {
    if (!procSupplierId || !procForm) return null;
    const sup = db.suppliers.find(s => s.id === procSupplierId);
    if (!sup) return null;
    const lenVal = procLength ? parseInt(procLength) : null;
    const rate = sup.prices.find(p => p.form === procForm && p.length === lenVal);
    return rate ? rate.price : null;
  }, [procSupplierId, procForm, procLength, db.suppliers]);

  const handleLogPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procSupplierId || !procWeight) return alert('Please fill in required fields');

    const weightVal = parseFloat(procWeight);
    const finalPrice = lookedUpPrice !== null ? lookedUpPrice : parseFloat(procManualPrice);
    if (isNaN(weightVal) || weightVal <= 0) return alert('Weight must be positive');
    if (isNaN(finalPrice) || finalPrice <= 0) return alert('Price must be positive');

    const laborCost = procLabor ? parseFloat(procLabor) : 0;
    const supplier = db.suppliers.find(s => s.id === procSupplierId);
    const short = supplier ? supplier.shortCode : 'RAW';
    const batchNo = `BATCH-${short}-${procForm}-${Date.now().toString().slice(-4)}`;

    const newBatch: InventoryBatch = {
      id: `b-purchase-${Date.now()}`,
      batchNumber: batchNo,
      supplierId: procSupplierId,
      hairForm: procForm,
      lengthInches: procLength ? parseInt(procLength) : null,
      initialWeightKg: weightVal,
      currentWeightKg: weightVal,
      costPerKg: finalPrice + (laborCost / weightVal),
      sourceType: 'PURCHASE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    updateDb(prev => ({
      ...prev,
      batches: [newBatch, ...prev.batches],
      logs: [
        {
          id: `log-${Date.now()}`,
          action: 'PROCUREMENT_PURCHASE',
          details: `Purchased ${weightVal}kg of ${procForm} from ${supplier?.name}. Assigned Batch Number: ${batchNo}`,
          timestamp: new Date().toISOString()
        },
        ...prev.logs
      ]
    }));

    // Reset Form
    setProcWeight('');
    setProcManualPrice('');
    setProcLabor('');
    setProcOperator('');
    alert(`Purchase logged successfully! Batch: ${batchNo}`);
  };

  // --- 2. PROCESSING TAB STATE & HANDLERS ---
  const [procMode, setProcMode] = useState<'opening' | 'segregation'>('opening');
  
  // Goli Opening
  const [openingSourceId, setOpeningSourceId] = useState('');
  const [openingOutputWeight, setOpeningOutputWeight] = useState('');
  const [openingLabor, setOpeningLabor] = useState('');
  const [openingOperator, setOpeningOperator] = useState('');

  // Size Segregation
  const [segSourceId, setSegSourceId] = useState('');
  const [segLabor, setSegLabor] = useState('');
  // Mapping of length -> weight
  const [segDistribution, setSegDistribution] = useState<Record<number, string>>({});
  const [segWaste, setSegWaste] = useState('');

  const activeGoliBatches = useMemo(() => {
    return db.batches.filter(b => b.hairForm === 'GOLI' && b.currentWeightKg > 0);
  }, [db.batches]);

  const activeProcessableBatches = useMemo(() => {
    return db.batches.filter(b => (b.hairForm === 'FANCY' || b.hairForm === 'GOLI') && b.currentWeightKg > 0);
  }, [db.batches]);

  const handleGoliOpening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingSourceId || !openingOutputWeight) return alert('Fill in required fields');

    const sourceBatch = db.batches.find(b => b.id === openingSourceId);
    if (!sourceBatch) return;

    const outWt = parseFloat(openingOutputWeight);
    if (isNaN(outWt) || outWt <= 0) return alert('Output weight must be positive');
    if (outWt > sourceBatch.currentWeightKg) return alert('Output weight cannot exceed Goli input weight');

    const labor = parseFloat(openingLabor) || 0;
    const lossKg = sourceBatch.currentWeightKg - outWt;
    const newUnitCost = (sourceBatch.currentWeightKg * sourceBatch.costPerKg + labor) / outWt;
    const batchNo = `BATCH-FNC-${Date.now().toString().slice(-4)}`;

    const newBatch: InventoryBatch = {
      id: `b-opening-${Date.now()}`,
      batchNumber: batchNo,
      supplierId: sourceBatch.supplierId,
      hairForm: 'FANCY',
      lengthInches: null,
      initialWeightKg: outWt,
      currentWeightKg: outWt,
      costPerKg: newUnitCost,
      sourceType: 'PROCESSING_OUTPUT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    updateDb(prev => {
      const updatedBatches = prev.batches.map(b => {
        if (b.id === sourceBatch.id) {
          return { ...b, currentWeightKg: 0, status: 'DEPLETED' };
        }
        return b;
      });

      return {
        ...prev,
        batches: [newBatch, ...updatedBatches],
        lineage: [...prev.lineage, { parentId: sourceBatch.id, childId: newBatch.id, weightContributed: sourceBatch.currentWeightKg }],
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'GOLI_OPENING',
            details: `Opened Goli batch ${sourceBatch.batchNumber} (${sourceBatch.currentWeightKg}kg) into Fancy batch ${batchNo} (${outWt}kg). Yield Loss: ${(lossKg * 100 / sourceBatch.currentWeightKg).toFixed(1)}%`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setOpeningSourceId('');
    setOpeningOutputWeight('');
    setOpeningLabor('');
    alert(`Fancy Batch ${batchNo} created successfully!`);
  };

  const handleSegregation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segSourceId) return alert('Please select a source batch');

    const sourceBatch = db.batches.find(b => b.id === segSourceId);
    if (!sourceBatch) return;

    const labor = parseFloat(segLabor) || 0;
    const waste = parseFloat(segWaste) || 0;

    let totalAllocatedWeight = waste;
    const activeGrades: { length: number; weight: number }[] = [];

    Object.entries(segDistribution).forEach(([lenStr, wtStr]) => {
      const wt = parseFloat(wtStr);
      if (!isNaN(wt) && wt > 0) {
        activeGrades.push({ length: parseInt(lenStr), weight: wt });
        totalAllocatedWeight += wt;
      }
    });

    if (totalAllocatedWeight <= 0) return alert('Please allocate weight to at least one length');
    
    const variance = Math.abs(totalAllocatedWeight - sourceBatch.currentWeightKg);
    if (variance > 0.05) {
      if (!confirm(`Warning: Allocated weight (${totalAllocatedWeight.toFixed(2)}kg) differs from source weight (${sourceBatch.currentWeightKg.toFixed(2)}kg). Proceed?`)) {
        return;
      }
    }

    const newBatches: InventoryBatch[] = [];
    const newLineages: LineageLink[] = [];

    // Calculate rolled up cost multiplier including labor allocation
    const totalCostOfSource = (sourceBatch.currentWeightKg * sourceBatch.costPerKg) + labor;
    // Distribute cost proportionally based on length weight (hair of longer sizes carries higher values usually, 
    // but here we allocate cost uniformly per kg for simplicity)
    const costPerKgAllocated = totalCostOfSource / (totalAllocatedWeight - waste);

    activeGrades.forEach((g, idx) => {
      const childId = `b-seg-${Date.now()}-${idx}`;
      const batchNo = `BATCH-NR-${g.length}-${Date.now().toString().slice(-4)}-${idx}`;
      const newB: InventoryBatch = {
        id: childId,
        batchNumber: batchNo,
        supplierId: sourceBatch.supplierId,
        hairForm: 'NON_REMY_1X1',
        lengthInches: g.length,
        initialWeightKg: g.weight,
        currentWeightKg: g.weight,
        costPerKg: costPerKgAllocated,
        sourceType: 'PROCESSING_OUTPUT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      newBatches.push(newB);
      newLineages.push({ parentId: sourceBatch.id, childId: childId, weightContributed: g.weight });
    });

    updateDb(prev => {
      const updatedBatches = prev.batches.map(b => {
        if (b.id === sourceBatch.id) {
          return { ...b, currentWeightKg: 0, status: 'DEPLETED' };
        }
        return b;
      });

      return {
        ...prev,
        batches: [...newBatches, ...updatedBatches],
        lineage: [...prev.lineage, ...newLineages],
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'SIZE_SEGREGATION',
            details: `Segregated batch ${sourceBatch.batchNumber} (${sourceBatch.currentWeightKg}kg) into ${newBatches.length} length batches. Waste: ${waste}kg.`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setSegSourceId('');
    setSegDistribution({});
    setSegWaste('');
    setSegLabor('');
    alert(`Size segregation logged. Generated ${newBatches.length} new size batches.`);
  };

  // --- 3. TRANSFORMATION & MIXING STATE & HANDLERS ---
  const [mixMode, setMixMode] = useState<'transformation' | 'blend'>('transformation');

  // Transformation
  const [transSourceId, setTransSourceId] = useState('');
  const [transTargetForm, setTransTargetForm] = useState('MACHINE_REMY');
  const [transLabor, setTransLabor] = useState('');
  const [transOperator, setTransOperator] = useState('');

  // Blend Mixing
  const [blendName, setBlendName] = useState('');
  const [blendOutputWeight, setBlendOutputWeight] = useState('');
  const [blendInputs, setBlendInputs] = useState<{ batchId: string; percentage: string }[]>([
    { batchId: '', percentage: '' }
  ]);

  const activeSizeBatches = useMemo(() => {
    return db.batches.filter(b => b.hairForm === 'NON_REMY_1X1' && b.currentWeightKg > 0);
  }, [db.batches]);

  const activeBlendableBatches = useMemo(() => {
    return db.batches.filter(b => 
      ['NON_REMY_1X1', 'NON_REMY_2X2', 'MACHINE_REMY', 'CUTICLE_FREE', 'REMY_FORM'].includes(b.hairForm) && 
      b.currentWeightKg > 0
    );
  }, [db.batches]);

  const handleTransformation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transSourceId) return alert('Select source batch');

    const source = db.batches.find(b => b.id === transSourceId);
    if (!source) return;

    const labor = parseFloat(transLabor) || 0;
    const batchNo = `BATCH-TRN-${transTargetForm.slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    const newB: InventoryBatch = {
      id: `b-trans-${Date.now()}`,
      batchNumber: batchNo,
      supplierId: source.supplierId,
      hairForm: transTargetForm,
      lengthInches: source.lengthInches,
      initialWeightKg: source.currentWeightKg,
      currentWeightKg: source.currentWeightKg,
      costPerKg: source.costPerKg + (labor / source.currentWeightKg),
      sourceType: 'PROCESSING_OUTPUT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    updateDb(prev => {
      const updatedBatches = prev.batches.map(b => {
        if (b.id === source.id) {
          return { ...b, currentWeightKg: 0, status: 'DEPLETED' };
        }
        return b;
      });

      return {
        ...prev,
        batches: [newB, ...updatedBatches],
        lineage: [...prev.lineage, { parentId: source.id, childId: newB.id, weightContributed: source.currentWeightKg }],
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'HAIR_TRANSFORMATION',
            details: `Transformed batch ${source.batchNumber} (${source.currentWeightKg}kg) into ${transTargetForm} batch ${batchNo}`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setTransSourceId('');
    setTransLabor('');
    alert(`Converted successfully to ${transTargetForm}!`);
  };

  const handleAddBlendInput = () => {
    setBlendInputs([...blendInputs, { batchId: '', percentage: '' }]);
  };

  const handleRemoveBlendInput = (idx: number) => {
    setBlendInputs(blendInputs.filter((_, i) => i !== idx));
  };

  const handleUpdateBlendInput = (idx: number, field: 'batchId' | 'percentage', val: string) => {
    const updated = [...blendInputs];
    updated[idx][field] = val;
    setBlendInputs(updated);
  };

  const handleRatioMix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blendName.trim() || !blendOutputWeight) return alert('Fill required fields');

    const totalWeight = parseFloat(blendOutputWeight);
    if (isNaN(totalWeight) || totalWeight <= 0) return alert('Output weight must be positive');

    let totalPct = 0;
    const finalInputs: { batchId: string; pct: number; reqWt: number; batchObj: InventoryBatch }[] = [];

    for (let input of blendInputs) {
      if (!input.batchId || !input.percentage) return alert('Please fill in all blend rows');
      const pct = parseFloat(input.percentage);
      const batchObj = db.batches.find(b => b.id === input.batchId);
      if (!batchObj) return alert('Batch object not found');

      if (isNaN(pct) || pct <= 0) return alert('Percentages must be positive');
      
      const reqWt = (pct / 100) * totalWeight;
      if (reqWt > batchObj.currentWeightKg) {
        return alert(`Insufficient stock in ${batchObj.batchNumber}. Needed ${reqWt.toFixed(2)}kg, available: ${batchObj.currentWeightKg.toFixed(2)}kg`);
      }

      totalPct += pct;
      finalInputs.push({ batchId: input.batchId, pct, reqWt, batchObj });
    }

    if (Math.abs(totalPct - 100) > 0.01) {
      return alert(`Sum of percentages must equal exactly 100%. Current: ${totalPct}%`);
    }

    // Calculations
    const childId = `b-blend-${Date.now()}`;
    const batchNo = `BATCH-BLND-${Date.now().toString().slice(-4)}`;
    
    // Average cost weighted by ratio
    let totalContributionCost = 0;
    finalInputs.forEach(i => {
      totalContributionCost += i.reqWt * i.batchObj.costPerKg;
    });
    const avgCostPerKg = totalContributionCost / totalWeight;

    // Output length is set based on longest contributor for reporting, or left null
    const lengths = finalInputs.map(i => i.batchObj.lengthInches).filter(l => l !== null) as number[];
    const longestLength = lengths.length > 0 ? Math.max(...lengths) : null;

    const newB: InventoryBatch = {
      id: childId,
      batchNumber: batchNo,
      supplierId: finalInputs[0].batchObj.supplierId, // Default to first contributor supplier
      hairForm: 'REMY_FORM',
      lengthInches: longestLength,
      initialWeightKg: totalWeight,
      currentWeightKg: totalWeight,
      costPerKg: avgCostPerKg,
      sourceType: 'MIX_OUTPUT',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    const newLineages = finalInputs.map(i => ({
      parentId: i.batchId,
      childId: childId,
      weightContributed: i.reqWt
    }));

    updateDb(prev => {
      const updatedBatches = prev.batches.map(b => {
        const consumed = finalInputs.find(i => i.batchId === b.id);
        if (consumed) {
          const newWt = b.currentWeightKg - consumed.reqWt;
          return {
            ...b,
            currentWeightKg: newWt,
            status: newWt <= 0.005 ? 'DEPLETED' : 'ACTIVE'
          };
        }
        return b;
      });

      return {
        ...prev,
        batches: [newB, ...updatedBatches],
        lineage: [...prev.lineage, ...newLineages],
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'RATIO_MIXING',
            details: `Mixed ${totalWeight}kg batch ${batchNo} (${blendName}). Ratios: ${finalInputs.map(i => `${i.pct}% of ${i.batchObj.batchNumber}`).join(', ')}`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setBlendName('');
    setBlendOutputWeight('');
    setBlendInputs([{ batchId: '', percentage: '' }]);
    alert(`Ratio Blend ${batchNo} logged successfully!`);
  };

  // --- 4. FINISHED GOODS TAB STATE & HANDLERS ---
  const [prodSku, setProdSku] = useState('');
  const [prodSourceBatchId, setProdSourceBatchId] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodLabor, setProdLabor] = useState('');
  
  // Quick Add Component Stock
  const [quickAddSku, setQuickAddSku] = useState('');
  const [quickAddQty, setQuickAddQty] = useState('');

  const activeMixedBatches = useMemo(() => {
    return db.batches.filter(b => b.currentWeightKg > 0);
  }, [db.batches]);

  const selectedProduct = useMemo(() => {
    return db.finishedProducts.find(p => p.sku === prodSku);
  }, [prodSku, db.finishedProducts]);

  const productionFeasibility = useMemo(() => {
    if (!selectedProduct || !prodQty) return null;
    const qtyVal = parseInt(prodQty) || 0;
    if (qtyVal <= 0) return null;

    const hairRequiredKg = (selectedProduct.hairWeightRequiredG * qtyVal) / 1000;
    const selectedBatch = db.batches.find(b => b.id === prodSourceBatchId);
    const hairFeasible = selectedBatch ? selectedBatch.currentWeightKg >= hairRequiredKg : false;

    const componentFeasibility = selectedProduct.bom.map(bItem => {
      const instock = db.components.find(c => c.sku === bItem.sku);
      const req = bItem.qtyRequired * qtyVal;
      return {
        sku: bItem.sku,
        name: instock ? instock.name : bItem.sku,
        required: req,
        available: instock ? instock.qty : 0,
        feasible: instock ? instock.qty >= req : false
      };
    });

    const allFeasible = hairFeasible && componentFeasibility.every(c => c.feasible);

    return {
      hairRequiredKg,
      hairAvailableKg: selectedBatch ? selectedBatch.currentWeightKg : 0,
      hairFeasible,
      componentFeasibility,
      allFeasible
    };
  }, [selectedProduct, prodQty, prodSourceBatchId, db.batches, db.components]);

  const handleProduceProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodSku || !prodSourceBatchId || !prodQty || !productionFeasibility) return;
    if (!productionFeasibility.allFeasible) return alert('BOM allocation checks failed. Insufficient stock!');

    const qtyVal = parseInt(prodQty);
    const labor = parseFloat(prodLabor) || 0;
    const selectedBatch = db.batches.find(b => b.id === prodSourceBatchId)!;
    
    const hairUsedKg = productionFeasibility.hairRequiredKg;
    const batchNo = `BATCH-FG-${selectedProduct?.category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    // Component costs rollup
    let totalComponentCost = 0;
    selectedProduct!.bom.forEach(bItem => {
      const c = db.components.find(comp => comp.sku === bItem.sku)!;
      totalComponentCost += (bItem.qtyRequired * qtyVal) * c.cost;
    });

    // Rolled up unit cost
    const rolledUpCost = (hairUsedKg * selectedBatch.costPerKg + totalComponentCost + labor) / qtyVal;

    const newB: InventoryBatch = {
      id: `b-fg-${Date.now()}`,
      batchNumber: batchNo,
      supplierId: selectedBatch.supplierId,
      hairForm: selectedProduct!.name,
      lengthInches: selectedBatch.lengthInches,
      initialWeightKg: hairUsedKg,
      currentWeightKg: qtyVal, // Using currentWeight for count of finished goods pieces
      costPerKg: rolledUpCost, // Represents cost per unit in finished goods context
      sourceType: 'FINISHED_PRODUCTION',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    updateDb(prev => {
      // Deduct components
      const updatedComponents = prev.components.map(c => {
        const bomNeed = selectedProduct!.bom.find(b => b.sku === c.sku);
        if (bomNeed) {
          return { ...c, qty: c.qty - (bomNeed.qtyRequired * qtyVal) };
        }
        return c;
      });

      // Deduct hair batch weight
      const updatedBatches = prev.batches.map(b => {
        if (b.id === selectedBatch.id) {
          const newWt = b.currentWeightKg - hairUsedKg;
          return { ...b, currentWeightKg: newWt, status: newWt <= 0.005 ? 'DEPLETED' : 'ACTIVE' };
        }
        return b;
      });

      return {
        ...prev,
        components: updatedComponents,
        batches: [newB, ...updatedBatches],
        lineage: [...prev.lineage, { parentId: selectedBatch.id, childId: newB.id, weightContributed: hairUsedKg }],
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'FINISHED_GOODS_PRODUCTION',
            details: `Manufactured ${qtyVal} units of ${selectedProduct?.name} (${batchNo}). Consumed ${hairUsedKg.toFixed(2)}kg of ${selectedBatch.batchNumber}`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setProdQty('');
    setProdLabor('');
    setProdSourceBatchId('');
    alert(`Production run successful! Finished batch: ${batchNo}`);
  };

  const handleQuickAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddSku || !quickAddQty) return;
    const addVal = parseInt(quickAddQty);
    if (isNaN(addVal) || addVal <= 0) return alert('Invalid count');

    updateDb(prev => {
      const updated = prev.components.map(c => {
        if (c.sku === quickAddSku) {
          return { ...c, qty: c.qty + addVal };
        }
        return c;
      });

      return {
        ...prev,
        components: updated,
        logs: [
          {
            id: `log-${Date.now()}`,
            action: 'COMPONENT_STOCK_ADD',
            details: `Inwarded ${addVal} units of ${prev.components.find(c => c.sku === quickAddSku)?.name}`,
            timestamp: new Date().toISOString()
          },
          ...prev.logs
        ]
      };
    });

    setQuickAddQty('');
    alert('Stock updated successfully!');
  };

  // --- 5. TRACEABILITY & LINEAGE STATE & HANDLERS ---
  const [traceTargetId, setTraceTargetId] = useState('');

  // Recursive lineage builder
  const buildLineageTree = (batchId: string): any => {
    const batch = db.batches.find(b => b.id === batchId);
    if (!batch) return null;

    const parents = db.lineage.filter(l => l.childId === batchId);
    const parentNodes = parents.map(p => {
      return {
        weightContributed: p.weightContributed,
        node: buildLineageTree(p.parentId)
      };
    });

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      hairForm: batch.hairForm,
      length: batch.lengthInches,
      weight: batch.currentWeightKg,
      initialWeight: batch.initialWeightKg,
      cost: batch.costPerKg,
      sourceType: batch.sourceType,
      supplier: db.suppliers.find(s => s.id === batch.supplierId)?.name || 'Unknown',
      parents: parentNodes
    };
  };

  const traceTree = useMemo(() => {
    if (!traceTargetId) return null;
    return buildLineageTree(traceTargetId);
  }, [traceTargetId, db.batches, db.lineage]);

  // Lineage recursive tree component
  const TreeNode = ({ node, weightContributed }: { node: any; weightContributed?: number }) => {
    if (!node) return null;
    return (
      <div className="flex flex-col items-center">
        {/* Connection arrow */}
        {weightContributed !== undefined && (
          <div className="flex flex-col items-center my-2">
            <div className="h-6 w-0.5 bg-accent"></div>
            <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
              Used {weightContributed.toFixed(2)} kg
            </span>
            <div className="h-4 w-0.5 bg-accent"></div>
          </div>
        )}

        {/* Node block */}
        <div className="bg-slate-900 border border-gray-800 text-white rounded-xl p-4 w-72 shadow-md space-y-2 text-left hover:border-accent/50 transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-accent font-semibold">{node.batchNumber}</span>
            <span className="bg-slate-800 text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase text-gray-400">
              {node.sourceType.replace('_', ' ')}
            </span>
          </div>
          <h4 className="text-sm font-bold tracking-tight text-white">
            {node.hairForm} {node.length ? `- ${node.length}"` : ''}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1 border-t border-gray-800">
            <div>
              <span className="block text-gray-500">Weight on Hand</span>
              <span className="font-bold text-gray-200">{node.weight.toFixed(2)} kg</span>
            </div>
            <div>
              <span className="block text-gray-500">Unit Cost</span>
              <span className="font-bold text-green-400">₹{Math.round(node.cost)}</span>
            </div>
          </div>
          <div className="text-[9px] text-gray-500 text-right pt-0.5">
            Supplier: {node.supplier}
          </div>
        </div>

        {/* Render Parents */}
        {node.parents && node.parents.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 mt-4 relative">
            <div className="absolute top-0 left-4 right-4 h-0.5 bg-gray-200 -z-10"></div>
            {node.parents.map((parent: any, idx: number) => (
              <TreeNode key={idx} node={parent.node} weightContributed={parent.weightContributed} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-accent/15 text-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            INHINVENTORY Core System
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-2">Inventory Management Engine</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track procurement, grading yield losses, ratio mixing, component BOM checks, and traceability.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleResetDb} 
            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition"
          >
            <RefreshCw size={14} /> Reset Database
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 bg-white px-6 py-2 rounded-2xl shadow-sm border">
        {(['procurement', 'processing', 'mixing', 'finished', 'traceability'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-bold px-4 py-3 border-b-2 capitalize transition-colors flex items-center gap-2 ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab === 'procurement' && <ShoppingCart size={16} />}
            {tab === 'processing' && <Scissors size={16} />}
            {tab === 'mixing' && <Sliders size={16} />}
            {tab === 'finished' && <Package size={16} />}
            {tab === 'traceability' && <GitFork size={16} />}
            <span>{tab === 'finished' ? 'Finished Goods (BOM)' : tab}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel Content */}
      <div className="w-full">
        {/* --- 1. PROCUREMENT & INWARDING --- */}
        {activeTab === 'procurement' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleLogPurchase} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2 border-b border-gray-100 pb-2">
                <ShoppingCart className="text-accent" size={18} /> Inward Purchase Entry
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Supplier *</label>
                <select 
                  value={procSupplierId} 
                  onChange={e => setProcSupplierId(e.target.value)} 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {db.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shortCode})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hair Form *</label>
                  <select 
                    value={procForm} 
                    onChange={e => setProcForm(e.target.value)} 
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                  >
                    {HAIR_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Length (optional)</label>
                  <input 
                    type="number"
                    placeholder="e.g. 16"
                    value={procLength}
                    onChange={e => setProcLength(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weight (kg) *</label>
                  <input 
                    type="number" step="0.01" placeholder="e.g. 10.5"
                    value={procWeight} onChange={e => setProcWeight(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Labor Cost (optional)</label>
                  <input 
                    type="number" placeholder="Inwarding labor"
                    value={procLabor} onChange={e => setProcLabor(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Purchase Price per kg (₹) *</label>
                {lookedUpPrice !== null ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-bold font-mono flex justify-between items-center">
                    <span>₹{lookedUpPrice} / kg</span>
                    <span className="text-[10px] bg-green-200/50 px-2 py-0.5 rounded text-green-800 uppercase font-bold tracking-wider">Pre-negotiated</span>
                  </div>
                ) : (
                  <input 
                    type="number" placeholder="Enter manual price/kg"
                    value={procManualPrice} onChange={e => setProcManualPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    required={lookedUpPrice === null}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Operator</label>
                <input 
                  type="text" placeholder="Operator name"
                  value={procOperator} onChange={e => setProcOperator(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition shadow-sm text-sm"
              >
                Log Purchase & Create Batch
              </button>
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 text-base">In-Stock Active Batches</h3>
                  <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                    {db.batches.filter(b => b.currentWeightKg > 0).length} Batches
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[450px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-150 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Batch ID</th>
                        <th className="px-6 py-3">Hair Form</th>
                        <th className="px-6 py-3 text-center">Length</th>
                        <th className="px-6 py-3 text-right">Available Weight</th>
                        <th className="px-6 py-3 text-right">Unit Cost</th>
                        <th className="px-6 py-3">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {db.batches.filter(b => b.currentWeightKg > 0).map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono font-bold text-xs text-primary">{b.batchNumber}</td>
                          <td className="px-6 py-4 font-semibold text-xs text-gray-700">{b.hairForm}</td>
                          <td className="px-6 py-4 text-center text-xs font-bold font-mono">{b.lengthInches ? `${b.lengthInches}"` : 'Bulk'}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-sm text-gray-900">{b.currentWeightKg.toFixed(2)} kg</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-sm text-green-700">₹{Math.round(b.costPerKg)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-gray-400 capitalize">{b.sourceType.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. PROCESSING & GRADING (SORTING STAGE) --- */}
        {activeTab === 'processing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
              <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                Processing Step Selector
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setProcMode('opening')}
                  className={`w-full text-left p-3 rounded-xl border font-bold text-sm transition flex items-center gap-2.5 ${
                    procMode === 'opening' ? 'bg-primary border-primary text-white' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-100'
                  }`}
                >
                  <Atom size={16} /> Goli-to-Fancy Opening
                </button>
                <button
                  onClick={() => setProcMode('segregation')}
                  className={`w-full text-left p-3 rounded-xl border font-bold text-sm transition flex items-center gap-2.5 ${
                    procMode === 'segregation' ? 'bg-primary border-primary text-white' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-100'
                  }`}
                >
                  <Scissors size={16} /> Size Segregation (1" Splits)
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              {procMode === 'opening' ? (
                <form onSubmit={handleGoliOpening} className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                    Goli Form Opening
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Goli Source Batch *</label>
                      <select
                        value={openingSourceId}
                        onChange={e => setOpeningSourceId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                        required
                      >
                        <option value="">-- Choose Goli Batch --</option>
                        {activeGoliBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} (Avail: {b.currentWeightKg.toFixed(2)}kg, Rate: ₹{Math.round(b.costPerKg)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Opened Fancy Output Weight (kg) *</label>
                      <input
                        type="number" step="0.01" placeholder="Opened weight in kg"
                        value={openingOutputWeight} onChange={e => setOpeningOutputWeight(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Operator Labor Cost (₹)</label>
                      <input
                        type="number" placeholder="Labor payout"
                        value={openingLabor} onChange={e => setOpeningLabor(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Worker</label>
                      <input
                        type="text" placeholder="Operator name"
                        value={openingOperator} onChange={e => setOpeningOperator(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                  >
                    Execute Opening Process
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSegregation} className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                    Size Segregation & Grading (4" to 50")
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Source Batch *</label>
                      <select
                        value={segSourceId}
                        onChange={e => setSegSourceId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                        required
                      >
                        <option value="">-- Select Source Batch --</option>
                        {activeProcessableBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} ({b.hairForm}) - {b.currentWeightKg.toFixed(2)}kg
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Waste (under 4") (kg)</label>
                        <input
                          type="number" step="0.01" placeholder="Waste weight"
                          value={segWaste} onChange={e => setSegWaste(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Process Labor (₹)</label>
                        <input
                          type="number" placeholder="Labor cost"
                          value={segLabor} onChange={e => setSegLabor(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-4">
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Grading Output Weights (kg)</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[14, 16, 18, 20, 22, 24, 26, 28, 30].map(length => (
                        <div key={length} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                          <span className="font-bold text-xs text-gray-500 w-12 text-center">{length}"</span>
                          <input
                            type="number" step="0.01" placeholder="0.00"
                            value={segDistribution[length] || ''}
                            onChange={e => setSegDistribution({ ...segDistribution, [length]: e.target.value })}
                            className="w-full border-none p-1 text-xs focus:outline-none font-mono text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                  >
                    Execute Size Segregation
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- 3. TRANSFORMATION & RATIO MIXING --- */}
        {activeTab === 'mixing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
              <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                Operation Selector
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMixMode('transformation')}
                  className={`w-full text-left p-3 rounded-xl border font-bold text-sm transition flex items-center gap-2.5 ${
                    mixMode === 'transformation' ? 'bg-primary border-primary text-white' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-100'
                  }`}
                >
                  <Atom size={16} /> Transform Hair Type
                </button>
                <button
                  onClick={() => setMixMode('blend')}
                  className={`w-full text-left p-3 rounded-xl border font-bold text-sm transition flex items-center gap-2.5 ${
                    mixMode === 'blend' ? 'bg-primary border-primary text-white' : 'bg-white hover:bg-slate-50 text-gray-700 border-gray-100'
                  }`}
                >
                  <Sliders size={16} /> Ratio Blender
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              {mixMode === 'transformation' ? (
                <form onSubmit={handleTransformation} className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                    Hair Transformation Process
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Size Sorted Batch *</label>
                      <select
                        value={transSourceId}
                        onChange={e => setTransSourceId(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                        required
                      >
                        <option value="">-- Select Sorted Batch --</option>
                        {activeSizeBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} ({b.lengthInches}") - {b.currentWeightKg.toFixed(2)}kg
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Converted Form *</label>
                      <select
                        value={transTargetForm}
                        onChange={e => setTransTargetForm(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                      >
                        <option value="MACHINE_REMY">Machine Remy Hair</option>
                        <option value="CUTICLE_FREE">Cuticle Free Hair</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Transformation Labor Cost (₹)</label>
                      <input
                        type="number" placeholder="Conversion labor"
                        value={transLabor} onChange={e => setTransLabor(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Operator Name</label>
                      <input
                        type="text" placeholder="Operator"
                        value={transOperator} onChange={e => setTransOperator(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                  >
                    Execute Converted Process
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRatioMix} className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                    Ratio Blender (Mixing Tool Integration)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mix Name / Reference *</label>
                      <input
                        type="text" placeholder="e.g. Standard 60-40 Remy Mix"
                        value={blendName} onChange={e => setBlendName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Output weight (kg) *</label>
                      <input
                        type="number" step="0.01" placeholder="Output Weight"
                        value={blendOutputWeight} onChange={e => setBlendOutputWeight(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-gray-50/50 p-4 border border-gray-150 rounded-xl mt-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Blend Contributors (Ratios)</span>
                      <button
                        type="button" onClick={handleAddBlendInput}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        + Add Batch
                      </button>
                    </div>

                    {blendInputs.map((input, idx) => (
                      <div key={idx} className="flex gap-4 items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex-1">
                          <select
                            value={input.batchId}
                            onChange={e => handleUpdateBlendInput(idx, 'batchId', e.target.value)}
                            className="w-full border-none p-1 text-xs focus:outline-none bg-white font-mono"
                            required
                          >
                            <option value="">-- Select Batch --</option>
                            {activeBlendableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.batchNumber} ({b.hairForm} {b.lengthInches ? `${b.lengthInches}"` : 'Bulk'}) - {b.currentWeightKg.toFixed(2)}kg
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-28 flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                          <input
                            type="number" placeholder="0"
                            value={input.percentage}
                            onChange={e => handleUpdateBlendInput(idx, 'percentage', e.target.value)}
                            className="w-full border-none p-1 text-xs focus:outline-none font-mono text-right bg-transparent"
                            required
                          />
                          <span className="text-xs font-bold text-gray-400">%</span>
                        </div>
                        {blendInputs.length > 1 && (
                          <button
                            type="button" onClick={() => handleRemoveBlendInput(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                  >
                    Execute Ratio Mix
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- 4. FINISHED GOODS (BOM) --- */}
        {activeTab === 'finished' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 h-fit">
              <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                Accessory Inwarding (Stock adjustment)
              </h3>
              <form onSubmit={handleQuickAddStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Accessory SKU *</label>
                  <select
                    value={quickAddSku}
                    onChange={e => setQuickAddSku(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                    required
                  >
                    <option value="">-- Choose SKU --</option>
                    {db.components.map(c => (
                      <option key={c.sku} value={c.sku}>{c.name} ({c.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity Inwarded *</label>
                  <input
                    type="number" placeholder="Count to add"
                    value={quickAddQty} onChange={e => setQuickAddQty(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-gray-800 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-sm"
                >
                  Adjust Component Inventory
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              {/* Accessory inventory status */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                  Accessory Stocks & Reorder Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {db.components.map(c => {
                    const isLow = c.qty <= c.threshold;
                    return (
                      <div key={c.sku} className={`p-4 rounded-xl border flex flex-col justify-between h-28 transition shadow-sm bg-white ${
                        isLow ? 'border-red-200 bg-red-50/20' : 'border-gray-100'
                      }`}>
                        <div>
                          <span className="block text-[10px] text-gray-400 font-mono">{c.sku}</span>
                          <span className="font-bold text-xs text-gray-800 mt-1 block leading-tight">{c.name}</span>
                        </div>
                        <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-100">
                          <span className={`text-sm font-extrabold font-mono ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                            {c.qty} {c.unit}
                          </span>
                          {isLow && (
                            <span className="bg-red-100 text-red-700 font-bold text-[9px] px-2 py-0.5 rounded-full">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manufacturing Production form */}
              <form onSubmit={handleProduceProduct} className="border-t border-gray-100 pt-6 space-y-4">
                <h3 className="font-bold text-gray-800 text-base border-b border-gray-100 pb-2">
                  Finished Goods Production (BOM Deduction)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Product Line *</label>
                    <select
                      value={prodSku}
                      onChange={e => setProdSku(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white"
                      required
                    >
                      <option value="">-- Choose Product --</option>
                      {db.finishedProducts.map(p => (
                        <option key={p.sku} value={p.sku}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Source Mixed Batch *</label>
                    <select
                      value={prodSourceBatchId}
                      onChange={e => setProdSourceBatchId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white font-mono"
                      required
                    >
                      <option value="">-- Choose Source Batch --</option>
                      {activeMixedBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber} ({b.hairForm}) - {b.currentWeightKg.toFixed(2)}kg
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Units to Manufacture *</label>
                    <input
                      type="number" placeholder="Quantity to produce"
                      value={prodQty} onChange={e => setProdQty(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Live Feasibility Check details */}
                {productionFeasibility && (
                  <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-3 text-xs">
                    <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Live Feasibility & BOM Allocation Check</span>
                    
                    {/* Hair check */}
                    <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                      <span>Hair Weight Required:</span>
                      <span className={`font-mono font-bold ${productionFeasibility.hairFeasible ? 'text-green-600' : 'text-red-600'}`}>
                        {productionFeasibility.hairRequiredKg.toFixed(2)} kg / {productionFeasibility.hairAvailableKg.toFixed(2)} kg available
                      </span>
                    </div>

                    {/* BOM component checks */}
                    <div className="space-y-1.5">
                      {productionFeasibility.componentFeasibility.map(item => (
                        <div key={item.sku} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                          <span>{item.name} ({item.sku}):</span>
                          <span className={`font-mono font-bold ${item.feasible ? 'text-green-600' : 'text-red-600'}`}>
                            {item.required} / {item.available} in stock
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions button toggle based on checks */}
                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-gray-500">Labor override (₹):</span>
                      <input
                        type="number" placeholder="Production labor"
                        value={prodLabor} onChange={e => setProdLabor(e.target.value)}
                        className="border border-gray-200 rounded px-2.5 py-1 text-xs w-32 focus:outline-none font-mono bg-white text-right"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={productionFeasibility ? !productionFeasibility.allFeasible : true}
                  className="w-full bg-primary hover:bg-gray-800 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl transition text-sm shadow-sm"
                >
                  Generate Finished Good & Deduct Stocks
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- 5. BATCH LINEAGE & TRACEABILITY REPORT --- */}
        {activeTab === 'traceability' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full md:max-w-md">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Target Batch to Trace Lineage</label>
                <select
                  value={traceTargetId}
                  onChange={e => setTraceTargetId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none bg-white font-mono"
                >
                  <option value="">-- Choose Batch --</option>
                  {db.batches.map(b => (
                    <option key={b.id} value={b.id}>{b.batchNumber} ({b.hairForm})</option>
                  ))}
                </select>
              </div>
            </div>

            {traceTree ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Lineage Map */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center overflow-auto min-h-[400px]">
                  <h3 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2 mb-6 w-full text-left">
                    Batch Lineage Genealogy Tree
                  </h3>
                  <div className="p-4 w-full flex justify-center">
                    <TreeNode node={traceTree} />
                  </div>
                </div>

                {/* Cost rollup details */}
                <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-gray-800 shadow-lg text-white space-y-6 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      Cost roll-up ledger
                    </span>
                    <h3 className="text-lg font-bold">Trace Batch costing</h3>
                    <p className="text-gray-400 text-xs">Accumulated cost calculation derived from processing steps, labor additions, yield waste adjustments, and BOM hardware costs.</p>
                  </div>

                  <div className="space-y-3 font-mono text-xs border-y border-gray-800 py-6">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Target SKU:</span>
                      <span className="text-accent">{traceTree.batchNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current form:</span>
                      <span>{traceTree.hairForm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current weight/Qty:</span>
                      <span>{traceTree.weight.toFixed(2)} {traceTree.sourceType === 'FINISHED_PRODUCTION' ? 'units' : 'kg'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Raw purchase supplier:</span>
                      <span>{traceTree.supplier}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-800/50">
                      <span className="text-gray-400">Direct unit cost:</span>
                      <span>₹{Math.round(traceTree.cost)} / {traceTree.sourceType === 'FINISHED_PRODUCTION' ? 'unit' : 'kg'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline pt-4">
                    <span className="text-xs font-bold text-gray-400 uppercase">Total Inventory Value:</span>
                    <span className="text-2xl font-extrabold text-accent font-mono">
                      ₹{Math.round(traceTree.weight * traceTree.cost).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400 italic">
                Select a batch above to generate its visual genealogy lineage map and cost rollup report.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
