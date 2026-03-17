import { useState } from 'react';
import { Search, CornerDownRight, Box, Factory, ClipboardList, Scissors, CheckCircle2 } from 'lucide-react';

const TraceNode = ({ title, subtitle, icon, type, children, last }: any) => {
    const getColors = () => {
        switch (type) {
            case 'order': return 'border-blue-200 bg-blue-50 text-blue-700';
            case 'mo': return 'border-purple-200 bg-purple-50 text-purple-700';
            case 'raw': return 'border-orange-200 bg-orange-50 text-orange-700';
            case 'wip': return 'border-yellow-200 bg-yellow-50 text-yellow-700';
            case 'sf': return 'border-green-200 bg-green-50 text-green-700';
            default: return 'border-gray-200 bg-gray-50 text-gray-700';
        }
    };

    return (
        <div className="relative">
            {!last && <div className="absolute top-10 bottom-0 left-6 w-px bg-gray-200" />}
            <div className="flex gap-4 mb-6 relative">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 z-10 ${getColors()}`}>
                    {icon}
                </div>
                <div className="bg-white border text-left border-gray-100 p-4 rounded-xl shadow-sm flex-1 max-w-lg">
                    <h4 className="font-bold text-gray-800 flex justify-between">
                        {title}
                        <span className="text-xs font-mono font-normal text-gray-400">View Details</span>
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>
            </div>
            {children && (
                <div className="ml-12 relative">
                    <CornerDownRight className="absolute -left-6 top-6 text-gray-300 w-5 h-5" />
                    {children}
                </div>
            )}
        </div>
    );
};

export default function TraceabilityScreen() {
    const [query, setQuery] = useState('SO-20260221-112');
    const [searched, setSearched] = useState(false);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="text-center mb-10 pt-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Traceability Engine</h1>
                <p className="text-gray-500 mt-2 max-w-lg mx-auto">Enter any Order Number, MO Number, or Raw Hair LOT_ID to view its complete forward or backward lineage.</p>

                <div className="flex justify-center mt-8">
                    <div className="relative w-full max-w-xl flex items-center shadow-sm hover:shadow transition-shadow rounded-2xl bg-white border border-gray-100 overflow-hidden">
                        <Search className="absolute left-4 text-primary w-5 h-5" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g. SO-20260221-112 or LOT-20260222-SIVA-004"
                            className="w-full pl-12 pr-4 py-4 text-lg bg-transparent focus:outline-none"
                        />
                        <button
                            onClick={() => setSearched(true)}
                            className="bg-primary text-white font-medium px-8 py-4 hover:bg-gray-800 transition-colors"
                        >
                            Trace
                        </button>
                    </div>
                </div>
            </div>

            {searched && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Tracing: {query}</h2>
                            <p className="text-sm text-gray-500">Root node identified as Sales Order. Running recursive breakdown...</p>
                        </div>
                        <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-sm font-semibold flex items-center gap-2 border border-green-100">
                            <CheckCircle2 size={16} /> Backward Trace Complete
                        </div>
                    </div>

                    <div className="pl-4">
                        <TraceNode
                            title="Sales Order SO-20260221-112"
                            subtitle="Customer: Vogue Hair Inc. | Ordered: 50 bundles Machine Weft 20in"
                            icon={<ClipboardList size={24} />}
                            type="order"
                        >
                            <TraceNode
                                title="Finished Goods MO #MO-FG-20260222-001"
                                subtitle="Status: Completed | Yield: 50 bundles"
                                icon={<Factory size={24} />}
                                type="mo"
                            >
                                <div className="ml-12 mb-6 text-sm text-gray-500 italic bg-gray-50 px-4 py-2 border rounded-lg border-gray-100 w-max">
                                    Requires 5000g of Semi-Finished Machine Remy Bulk 20"
                                </div>

                                <TraceNode
                                    title="Semi Finished Stock (SF-ROOM)"
                                    subtitle="Item: Machine Remy Bulk 20in | Consumed: 5000g"
                                    icon={<Box size={24} />}
                                    type="sf"
                                >
                                    <TraceNode
                                        title="Semi Finished MO #MO-SF-20260222-001"
                                        subtitle="Status: Completed | Yield: 5000g Machine Remy Bulk 20in"
                                        icon={<Scissors size={24} />}
                                        type="mo"
                                    >
                                        <TraceNode
                                            title="WIP MO #MO-WIP-20260222-001 (Segregation)"
                                            subtitle="Operation: Segregate Non Remy 1x1. Target length: 20in."
                                            icon={<Factory size={24} />}
                                            type="mo"
                                        >
                                            <TraceNode
                                                title="Raw Lot Consumption: LOT-20260222-AHE-00001"
                                                subtitle="Supplier: Arun Hair Exports | Pulled from: Raw Hair Inventory | Qty: 6500g"
                                                icon={<Box size={24} />}
                                                type="raw"
                                                last={true}
                                            />
                                        </TraceNode>
                                    </TraceNode>
                                </TraceNode>
                            </TraceNode>
                        </TraceNode>
                    </div>
                </div>
            )}
        </div>
    );
}
