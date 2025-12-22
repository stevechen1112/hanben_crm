import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', stock: 0 });
  const [newChannel, setNewChannel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [prodRes, chanRes] = await Promise.all([
        axios.get('/api/settings/products'),
        axios.get('/api/settings/channels')
      ]);
      setProducts(prodRes.data);
      setChannels(chanRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Product Handlers
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/settings/products', newProduct);
      setNewProduct({ name: '', stock: 0 });
      fetchSettings();
    } catch (error) {
      alert('新增商品失敗: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('確定要刪除此商品嗎？')) return;
    try {
      await axios.delete(`/api/settings/products/${id}`);
      fetchSettings();
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleUpdateProduct = async (id, name, stock) => {
    try {
      await axios.put(`/api/settings/products/${id}`, { name, stock });
      // alert('更新成功'); // Optional: too noisy
      fetchSettings();
    } catch (error) {
      alert('更新失敗');
    }
  };

  // Channel Handlers
  const handleAddChannel = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/settings/channels', { name: newChannel });
      setNewChannel('');
      fetchSettings();
    } catch (error) {
      alert('新增通路失敗: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!confirm('確定要刪除此通路嗎？')) return;
    try {
      await axios.delete(`/api/settings/channels/${id}`);
      fetchSettings();
    } catch (error) {
      alert('刪除失敗');
    }
  };

  if (loading) return <div className="p-8">載入中...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <SettingsIcon /> 系統設定
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Management */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">商品管理</h3>
          
          <form onSubmit={handleAddProduct} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="商品名稱"
              required
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              className="flex-1 rounded-md border-gray-300 border p-2"
            />
            <input
              type="number"
              placeholder="庫存"
              required
              value={newProduct.stock}
              onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
              className="w-24 rounded-md border-gray-300 border p-2"
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {products.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                  <span className="font-medium flex items-center">{product.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">庫存:</span>
                    <input 
                      type="number" 
                      defaultValue={product.stock}
                      onBlur={(e) => handleUpdateProduct(product.id, product.name, e.target.value)}
                      className="w-20 p-1 border rounded text-sm"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {products.length === 0 && <p className="text-gray-500 text-center py-4">尚無商品資料</p>}
          </div>
        </div>

        {/* Channel Management */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">通路管理</h3>
          
          <form onSubmit={handleAddChannel} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="通路名稱"
              required
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              className="flex-1 rounded-md border-gray-300 border p-2"
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {channels.map(channel => (
              <div key={channel.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{channel.name}</span>
                <button 
                  onClick={() => handleDeleteChannel(channel.id)}
                  className="text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {channels.length === 0 && <p className="text-gray-500 text-center py-4">尚無通路資料</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
