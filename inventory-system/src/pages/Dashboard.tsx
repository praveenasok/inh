
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, AlertTriangle, PlayCircle } from 'lucide-react';

const data = [
    { name: 'Mon', output: 400 },
    { name: 'Tue', output: 300 },
    { name: 'Wed', output: 550 },
    { name: 'Thu', output: 450 },
    { name: 'Fri', output: 600 },
    { name: 'Sat', output: 700 },
    { name: 'Sun', output: 850 },
];

const StatCard = ({ title, value, icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-2">{value}</h3>
            <p className={`text-sm mt-2 font-medium flex items-center gap-1 ${trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {trend} vs last week
            </p>
        </div>
        <div className={`p-4 rounded-xl ${color}`}>
            {icon}
        </div>
    </div>
);

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 text-sm">Welcome back. Here is your factory's pulse today.</p>
                </div>
                <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                    Download Daily Report
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Orders"
                    value="142"
                    trend="+12%"
                    color="bg-purple-100 text-purple-600"
                    icon={<Package size={24} />}
                />
                <StatCard
                    title="Pending MOs"
                    value="38"
                    trend="-5%"
                    color="bg-blue-100 text-blue-600"
                    icon={<PlayCircle size={24} />}
                />
                <StatCard
                    title="Weekly Kg Output"
                    value="1,240kg"
                    trend="+18%"
                    color="bg-green-100 text-green-600"
                    icon={<TrendingUp size={24} />}
                />
                <StatCard
                    title="Wastage Alert"
                    value="4.2%"
                    trend="+1.1%"
                    color="bg-red-100 text-red-600"
                    icon={<AlertTriangle size={24} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 text-lg">Production Output Trends (Last 7 Days)</h3>
                        <select className="bg-gray-50 border border-gray-200 text-sm rounded-md px-3 py-1">
                            <option>All Rooms</option>
                            <option>Raw &rarr; WIP</option>
                            <option>WIP &rarr; SF</option>
                        </select>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1a1c23" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1a1c23" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#1a1c23', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="output" stroke="#1a1c23" strokeWidth={3} fillOpacity={1} fill="url(#colorOutput)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 text-lg mb-6">Recent Stock Movements</h3>
                    <div className="space-y-5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0">
                                <div className="w-2 h-2 mt-2 rounded-full bg-accent flex-shrink-0"></div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">12kg Non-Remy 18&quot; moved</p>
                                    <p className="text-xs text-gray-500 mt-1">Raw Inventory &rarr; WIP Room</p>
                                    <p className="text-xs font-mono text-gray-400 mt-1">LOT-20260222-AHE-{i}23</p>
                                </div>
                                <div className="ml-auto text-xs text-gray-400 font-medium">10m ago</div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-600 rounded-lg transition-colors">
                        View All Movements
                    </button>
                </div>
            </div>
        </div>
    );
}
