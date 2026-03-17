import { useState } from 'react';
import { Search, Filter, FilePlus2, CheckCircle, Clock } from 'lucide-react';

const mockMOs = [
    { id: 'MO-FG-20260222-001', order: 'SO-20260221-112', room: 'Finished Goods', product: 'Machine Weft - 20"', qty: '50 bundles', status: 'In Progress', progress: 40 },
    { id: 'MO-SF-20260222-001', order: 'SO-20260221-112', room: 'Semi Finished', product: 'Machine Remy Bulk - 20"', qty: '5000g', status: 'In Progress', progress: 90 },
    { id: 'MO-WIP-20260222-001', order: 'SO-20260221-112', room: 'WIP Room', product: 'Non Remy 1x1 Segregation', qty: '6500g input', status: 'Completed', progress: 100 },
    { id: 'MO-FG-20260222-002', order: 'SO-20260220-449', room: 'Finished Goods', product: 'Keratin Tips - 18"', qty: '1000 pcs', status: 'Draft', progress: 0 },
];

export default function MOPage() {
    const [activeTab, setActiveTab] = useState('All');

    const tabs = ['All', 'Finished Goods', 'Semi Finished', 'WIP Room'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manufacturing Orders</h1>
                    <p className="text-gray-500 text-sm">Create and track production runs across rooms.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                    <FilePlus2 size={18} />
                    <span>New MO</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 p-4 flex justify-between items-center bg-gray-50/50">
                    <div className="flex space-x-6">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`text-sm font-medium pb-4 -mb-4 border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search MO or Order..."
                                className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary w-64 text-gray-800"
                            />
                        </div>
                        <button className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg text-sm text-gray-600 bg-white hover:bg-gray-50">
                            <Filter size={16} />
                            Filter
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white">
                        <div className="col-span-2">MO Number</div>
                        <div className="col-span-2">Sales Order</div>
                        <div className="col-span-2">Target Room</div>
                        <div className="col-span-3">Target Output</div>
                        <div className="col-span-2">Progress</div>
                        <div className="col-span-1 text-right">Status</div>
                    </div>

                    {mockMOs.filter(mo => activeTab === 'All' || mo.room === activeTab).map((mo) => (
                        <div key={mo.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50/50 cursor-pointer transition-colors group">
                            <div className="col-span-2 font-mono text-sm font-medium text-blue-600 group-hover:underline">
                                {mo.id}
                            </div>
                            <div className="col-span-2 text-sm text-gray-600">
                                {mo.order}
                            </div>
                            <div className="col-span-2">
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                    {mo.room}
                                </span>
                            </div>
                            <div className="col-span-3 text-sm font-medium text-gray-800">
                                {mo.product} ({mo.qty})
                            </div>
                            <div className="col-span-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${mo.progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                                            style={{ width: `${mo.progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500 w-8">{mo.progress}%</span>
                                </div>
                            </div>
                            <div className="col-span-1 text-right">
                                {mo.status === 'Completed' && <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={14} /> Done</span>}
                                {mo.status === 'In Progress' && <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium"><Clock size={14} /> Active</span>}
                                {mo.status === 'Draft' && <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">Draft</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
