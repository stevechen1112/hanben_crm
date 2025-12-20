import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Bell, PlusCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import CustomerList from './pages/CustomerList';
import OrderForm from './pages/OrderForm';
import AfterSalesList from './pages/AfterSalesList';

function App() {
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">Simple CRM</h1>
        </div>
        <nav className="px-4 space-y-2">
          <NavItem to="/" icon={LayoutDashboard} label="儀表板" />
          <NavItem to="/orders/new" icon={PlusCircle} label="新增訂單" />
          <NavItem to="/orders" icon={ShoppingCart} label="訂單管理" />
          <NavItem to="/customers" icon={Users} label="客戶管理" />
          <NavItem to="/after-sales" icon={Bell} label="售後關懷" />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/new" element={<OrderForm />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/after-sales" element={<AfterSalesList />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
