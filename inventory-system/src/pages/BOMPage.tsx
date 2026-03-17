import { useState } from 'react';
import { Save, FileText, AlertCircle } from 'lucide-react';

const RAW_LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];
const FINISHED_LENGTHS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40];

export default function BOMPage() {
    // matrix[finishedLen][rawLen] = percentage
    const [matrix, setMatrix] = useState<Record<number, Record<number, number>>>({});
    const [productName, setProductName] = useState('Machine Weft Bulk');
    const [wastagePct, setWastagePct] = useState(4.5);

    const handleCellChange = (finLen: number, rawLen: number, value: string) => {
        const num = parseFloat(value);
        setMatrix(prev => {
            const col = { ...(prev[finLen] || {}) };
            if (isNaN(num)) {
                delete col[rawLen];
            } else {
                col[rawLen] = num;
            }
            return { ...prev, [finLen]: col };
        });
    };

    const getColTotal = (finLen: number) => {
        const col = matrix[finLen] || {};
        return Object.values(col).reduce((sum, val) => sum + val, 0);
    };

    const isColValid = (finLen: number) => {
        const total = getColTotal(finLen);
        return total === 0 || Math.abs(total - 100) < 0.1;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Spec Sheet (BOM) / Ratio Mixer</h1>
                    <p className="text-gray-500 text-sm">Define manufacturing recipes using the Ratio Matrix.</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                    <Save size={18} />
                    <span>Save Spec Sheet</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Product Line</label>
                    <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Standard Wastage (%)</label>
                    <input
                        type="number"
                        value={wastagePct}
                        onChange={(e) => setWastagePct(parseFloat(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText size={18} /> Length Ratio Matrix
                    </h3>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                        <AlertCircle size={14} /> Columns must equal exactly 100%
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[600px] relative">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-100 sticky top-0 z-20 shadow-sm pt-2">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 bg-gray-100 z-30 shadow-[1px_0_0_#eee] w-24">Raw input ↓</th>
                                {FINISHED_LENGTHS.map(finLen => (
                                    <th key={finLen} className="px-3 py-3 text-center border-l border-gray-200 min-w-[80px]">
                                        {finLen}" Out
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {RAW_LENGTHS.map(rawLen => (
                                <tr key={rawLen} className="hover:bg-blue-50/30">
                                    <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 shadow-[1px_0_0_#eee]">
                                        {rawLen}" Raw
                                    </td>
                                    {FINISHED_LENGTHS.map(finLen => {
                                        const val = matrix[finLen]?.[rawLen];
                                        return (
                                            <td key={finLen} className="px-2 py-1 border-l border-gray-100 bg-white">
                                                <input
                                                    type="number"
                                                    placeholder="-"
                                                    value={val === undefined ? '' : val}
                                                    onChange={(e) => handleCellChange(finLen, rawLen, e.target.value)}
                                                    className="w-full text-center py-1.5 focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 rounded transition-colors text-gray-700"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_0_#eee] bg-gray-50 font-medium">
                            <tr>
                                <td className="px-4 py-3 sticky left-0 bg-gray-50 z-30 shadow-[1px_0_0_#eee]">Col Total</td>
                                {FINISHED_LENGTHS.map(finLen => {
                                    const total = getColTotal(finLen);
                                    const valid = isColValid(finLen);
                                    const hasData = total > 0;
                                    return (
                                        <td key={finLen} className="px-2 py-2 border-l border-gray-200 bg-gray-50 text-center">
                                            <span className={`inline-block w-full rounded py-1 ${hasData ? (valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'text-gray-400'}`}>
                                                {total}%
                                            </span>
                                        </td>
                                    )
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
