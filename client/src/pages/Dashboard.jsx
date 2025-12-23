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
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/settings/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
        <Link to={link} className="text-sm text-blue-500 mt-4 block hover:underline">
          查看詳情 &rarr;
        </Link>
      )}
    </div>
  );

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

      {/* Product Stock Display */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">商品即時庫存</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-4">尚無商品資料</p>
          ) : (
            products.map(product => (
              <div key={product.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{product.name}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  product.stock <= 0 ? 'bg-red-100 text-red-700' :
                  product.stock <= 10 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  庫存: {product.stock}
                </span>
              </div>
            ))
          )}
        </div>
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
