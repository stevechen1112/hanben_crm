import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Settings as SettingsIcon, Trash2 } from 'lucide-react';

export default function Settings() {
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [contactMethods, setContactMethods] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', stock: 0 });
  const [newChannel, setNewChannel] = useState('');
  const [newContactMethod, setNewContactMethod] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [prodRes, chanRes, contactRes] = await Promise.all([
        axios.get('/api/settings/products'),
        axios.get('/api/settings/channels'),
        axios.get('/api/settings/contact-methods')
      ]);
      setProducts(prodRes.data);
      setChannels(chanRes.data);
      setContactMethods(contactRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Product Handlers
  const handleAddProduct = async (e) => {
    e.preventDefault();

    // 前端驗證
    if (!newProduct.name || newProduct.name.trim() === '') {
      alert('請輸入商品名稱');
      return;
    }

    try {
      await axios.post('/api/settings/products', newProduct);
      alert('商品新增成功！');
      setNewProduct({ name: '', stock: 0 });
      fetchSettings();
    } catch (error) {
      console.error('新增商品失敗:', error);
      const errorMessage = error.response?.data?.error || error.message || '未知錯誤';
      alert('新增商品失敗: ' + errorMessage);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({ ...product });
  };

  const handleSaveProduct = async (id) => {
    try {
      await axios.put(`/api/settings/products/${id}`, editingProduct);
      alert('商品更新成功！');
      setEditingProduct(null);
      fetchSettings();
    } catch (error) {
      alert('更新失敗');
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleUpdateProduct = async (id, name, stock) => {
    try {
      await axios.put(`/api/settings/products/${id}`, { name, stock });
      fetchSettings();
    } catch (error) {
      alert('更新失敗');
    }
  };

  // Channel Handlers
  const handleAddChannel = async (e) => {
    e.preventDefault();

    // 前端驗證
    if (!newChannel || newChannel.trim() === '') {
      alert('請輸入通路名稱');
      return;
    }

    try {
      await axios.post('/api/settings/channels', { name: newChannel });
      alert('通路新增成功！');
      setNewChannel('');
      fetchSettings();
    } catch (error) {
      console.error('新增通路失敗:', error);
      const errorMessage = error.response?.data?.error || error.message || '未知錯誤';
      alert('新增通路失敗: ' + errorMessage);
    }
  };

  co

  // Contact Method Handlers
  const handleAddContactMethod = async (e) => {
    e.preventDefault();

    if (!newContactMethod || newContactMethod.trim() === '') {
      alert('請輸入聯絡方式名稱');
      return;
    }

    try {
      await axios.post('/api/settings/contact-methods', { name: newContactMethod });
      alert('聯絡方式新增成功！');
      setNewContactMethod('');
      fetchSettings();
    } catch (error) {
      console.error('新增聯絡方式失敗:', error);
      const errorMessage = error.response?.data?.error || error.message || '未知錯誤';
      alert('新增聯絡方式失敗: ' + errorMessage);
    }
  };

  const handleDeleteContactMethod = async (id) => {
    if (!confirm('確定要刪除此聯絡方式嗎？')) return;
    try {
      await axios.delete(`/api/settings/contact-methods/${id}`);
      fetchSettings();
    } catch (error) {
      alert('刪除失敗');
    }
  };nst handleDeleteChannel = async (id) => {
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
{editingProduct?.id === product.id ? (
                  <>
                    <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="p-1 border rounded text-sm"
                      />
                      <input
                        type="number"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                        className="p-1 border rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSaveProduct(product.id)}
                        className="text-green-600 hover:bg-green-50 p-1 rounded text-sm px-2"
                      >
                        儲存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-500 hover:bg-gray-100 p-1 rounded text-sm px-2"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                      <span className="font-medium flex items-center">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">庫存:</span>
                        <span className="font-medium">{product.stock}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                    >
                      <Edit2 size={18} />
                    </button>
                  </>
                )}
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

        {/* Contact Method Management */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">聯絡方式管理</h3>

          <form onSubmit={handleAddContactMethod} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="聯絡方式名稱"
              required
              value={newContactMethod}
              onChange={e => setNewContactMethod(e.target.value)}
              className="flex-1 rounded-md border-gray-300 border p-2"
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </form>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {contactMethods.map(method => (
              <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{method.name}</span>
                <button
                  onClick={() => handleDeleteContactMethod(method.id)}
                  className="text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {contactMethods.length === 0 && <p className="text-gray-500 text-center py-4">尚無聯絡方式
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
