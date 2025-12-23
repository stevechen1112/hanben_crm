import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [search, page]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/orders?search=${search}&page=${page}&limit=20`);
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on search
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">訂單管理</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋訂單編號、客戶..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">訂單編號</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客戶姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">症狀</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯絡方式</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">社群名稱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center text-gray-500">載入中...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center text-gray-500">無資料</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.orderId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer?.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.symptoms || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.contactMethod || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.socialName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.items && order.items.length > 0 
                        ? order.items.map(item => `${item.productName} x${item.quantity}`).join(', ')
                        : order.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.remarks}>
                      {order.remarks || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.arrivalDate ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          已到貨
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          運送中
                        </span>
                      )}
                    </td>
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
