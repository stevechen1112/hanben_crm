import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/customers?search=${search}&page=${page}&limit=20`);
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">客戶管理</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋姓名、電話..."
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">症狀</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">社群名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯絡方式</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">訂單數</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">載入中...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">無資料</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.symptoms || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.socialName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contactMethod || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.orders?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
            >
              上一頁
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100"
            >
              下一頁
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                顯示第 <span className="font-medium">{(page - 1) * 20 + 1}</span> 到 <span className="font-medium">{Math.min(page * 20, pagination.total)}</span> 筆，共 <span className="font-medium">{pagination.total}</span> 筆
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
