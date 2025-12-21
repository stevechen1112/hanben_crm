import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Users, ShoppingBag, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalSales: 0,
    pendingAfterSalesCount: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, link }) => {
    const content = (
      <>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
        {link && (
          <div className="text-sm text-blue-500 mt-4 flex items-center">
            查看詳情 <span className="ml-1">&rarr;</span>
          </div>
        )}
      </>
    );

    const baseClasses = "bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden";

    if (link) {
      return (
        <Link
          to={link}
          className={`${baseClasses} block transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
        >
          {content}
        </Link>
      );
    }

    return (
      <div className={baseClasses}>
        {content}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">儀表板</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="總客戶數"
          value={stats.totalCustomers}
          icon={Users}
          color="bg-blue-500"
          link="/customers"
        />
        <StatCard
          title="總訂單數"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="bg-green-500"
          link="/orders"
        />
        <StatCard
          title="總銷售額"
          value={`$${stats.totalSales.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-500"
        />
        <StatCard
          title="待處理售後關懷"
          value={stats.pendingAfterSalesCount}
          icon={AlertTriangle}
          color="bg-red-500"
          link="/after-sales"
        />
      </div>

      {/* Placeholder for charts */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">銷售趨勢 (範例)</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          圖表區域 (需實作詳細數據API)
        </div>
      </div>
    </div>
  );
}
