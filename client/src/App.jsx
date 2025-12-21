import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Bell, PlusCircle, Menu, X, ChevronLeft } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import CustomerList from './pages/CustomerList';
import OrderForm from './pages/OrderForm';
import AfterSalesList from './pages/AfterSalesList';

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${isActive
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="mr-2 p-1 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold text-blue-600">Simple CRM</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold text-blue-600">Simple CRM</h1>
        </div>
        {/* Mobile menu header spacing or specific padding could be added here if needed, 
            but standard top padding is usually fine if we don't duplicate the header inside. 
            However, on mobile, the sidebar is full height. We might want a header inside it or just top padding.
            Let's add some top margin on mobile to align or just simple padding.
        */}
        <div className="p-6 md:hidden">
          {/* Optional: Add Logo here too or keep it simple */}
          <h1 className="text-xl font-bold text-blue-600">Menu</h1>
        </div>

        <nav className="px-4 space-y-2">
          <NavItem to="/" icon={LayoutDashboard} label="儀表板" />
          <NavItem to="/orders/new" icon={PlusCircle} label="新增訂單" />
          <NavItem to="/orders" icon={ShoppingCart} label="訂單管理" />
          <NavItem to="/customers" icon={Users} label="客戶管理" />
          <NavItem to="/after-sales" icon={Bell} label="售後關懷" />
        </nav>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full pt-16 md:pt-0">
        <div className="p-4 md:p-8"> {/* Reduced padding on mobile */}
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
