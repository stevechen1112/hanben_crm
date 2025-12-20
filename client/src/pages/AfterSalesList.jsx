import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, Phone, Package, Calendar } from 'lucide-react';

export default function AfterSalesList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const res = await axios.get('/api/orders/pending-after-sales');
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const [notesState, setNotesState] = useState({});


  const handleNoteChange = (id, val) => {
    setNotesState(prev => ({ ...prev, [id]: val }));
  };

  const handleUpdateNotes = async (id) => {
    const notes = notesState[id];
    if (!notes) return;
    try {
      await axios.put(`/api/orders/${id}`, { afterSalesNotes: notes });
      setNotesState(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchPendingOrders();
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('更新失敗');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <h2 className="text-2xl font-bold text-gray-800">售後關懷待辦事項</h2>
        <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {orders.length} 筆待處理
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <p className="text-lg">太棒了！目前沒有需要處理的售後關懷。</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">

                  {/* Order Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={20} className="text-red-500" />
                      <span className="font-bold text-lg text-gray-800">訂單 #{order.orderId}</span>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        到貨: {order.arrivalDate ? new Date(order.arrivalDate).toLocaleDateString() : '未定'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Phone size={16} />
                        <span className="font-medium text-gray-900">{order.customer?.name || '未知客戶'}</span>
                        <span>{order.customer?.phone || ''}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package size={16} />
                        <span>{order.productName}</span>
                        <span className="text-gray-400">x{order.quantity}</span>
                      </div>
                    </div>

                    {order.remarks && (
                      <div className="text-sm text-gray-500 italic bg-yellow-50 p-2 rounded">
                        備註: {order.remarks}
                      </div>
                    )}
                  </div>

                  {/* Action Area */}
                  <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      售後關懷紀錄 (填寫後即完成)
                    </label>
                    <div className="flex flex-col space-y-2">
                      <textarea
                        rows="2"
                        value={notesState[order.id] || ''}
                        onChange={(e) => handleNoteChange(order.id, e.target.value)}
                        placeholder="例如：客戶表示使用狀況良好..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleUpdateNotes(order.id);
                          }
                        }}
                      ></textarea>
                      <button
                        className="self-end bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 text-sm transition-colors disabled:bg-blue-300"
                        disabled={!notesState[order.id]}
                        onClick={() => handleUpdateNotes(order.id)}
                      >
                        儲存紀錄
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

