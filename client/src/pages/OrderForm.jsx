import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Plus, Trash2 } from 'lucide-react';

export default function OrderForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [contactMethods, setContactMethods] = useState([]);
  
  const [formData, setFormData] = useState({
    orderId: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    phone: '',
    address: '',
    channel: '',
    socialName: '',
    contactMethod: '',
    symptoms: '',
    amount: 0,
    shippingFee: 0,
    logistics: '',
    arrivalDate: '',
    remarks: ''
  });

  const [orderItems, setOrderItems] = useState([{ productName: '', quantity: 1 }]);

  useEffect(() => {
    const fetchOptions = async () => {
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
        console.error('Error fetching options:', error);
      }
    };
    fetchOptions();
  }, []);

  // Auto-fill customer data when phone changes (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.phone.length >= 8) { // Assuming valid phone is at least 8 digits
        setLookupLoading(true);
        try {
          const res = await axios.get(`/api/customers/lookup?phone=${formData.phone}`);
          if (res.data) {
            setFormData(prev => ({
              ...prev,
              name: res.data.name,
              address: res.data.address || prev.address,
              symptoms: res.data.symptoms || prev.symptoms,
              socialName: res.data.socialName || prev.socialName,
              contactMethod: res.data.contactMethod || prev.contactMethod
            }));
          }
        } catch (error) {
          console.error("Lookup failed", error);
        } finally {
          setLookupLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.phone]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const addItem = () => {
    setOrderItems([...orderItems, { productName: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const getProductStock = (productName) => {
    const product = products.find(p => p.name === productName);
    return product ? product.stock : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Filter out empty items
      const validItems = orderItems.filter(item => item.productName && item.quantity > 0);
      if (validItems.length === 0) {
        alert('請至少新增一個商品項目');
        setLoading(false);
        return;
      }
      
      await axios.post('/api/orders', { ...formData, orderItems: validItems });
      alert('訂單建立成功！');
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('建立失敗：' + (error.response?.data?.error || '請檢查欄位'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">新增訂單</h2>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info - Moved to top for better flow (Phone first) */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">客戶資訊 (輸入電話自動帶入)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">電話 <span className="text-red-500">*</span></label>
                <div className="relative mt-1">
                  <input 
                    required 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="0912345678"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" 
                  />
                  {lookupLoading && (
                    <div className="absolute right-2 top-2.5">
                      <Loader2 className="animate-spin text-blue-500" size={16} />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名 <span className="text-red-500">*</span></label>
                <input required name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">症狀</label>
                <input name="symptoms" value={formData.symptoms} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700">地址</label>
                <input name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">訂單資訊</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">訂單編號 <span className="text-red-500">*</span></label>
              <input required name="orderId" value={formData.orderId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">日期 <span className="text-red-500">*</span></label>
              <input type="date" required name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">通路</label>
              <input list="channels" name="channel" value={formData.channel} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              <datalist id="channels">
                {channels.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">社群名稱</label>
              <input name="socialName" value={formData.socialName} onChange={handleChange} placeholder="客戶的社群暱稱" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">聯絡方式</label>
              <input list="contactMethods" name="contactMethod" value={formData.contactMethod} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              <datalist id="contactMethods">
                {contactMethods.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">商品與物流</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">商品項目</label>
                <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                  <Plus size={16} /> 新增商品
                </button>
              </div>
              {orderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input 
                      list="products" 
                      value={item.productName} 
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      placeholder="選擇商品"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" 
                    />
                    {item.productName && getProductStock(item.productName) !== null && (
                      <span className={`text-xs mt-1 inline-block ${getProductStock(item.productName) <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                        庫存: {getProductStock(item.productName)}
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    placeholder="數量"
                    className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" 
                  />
                  {orderItems.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <datalist id="products">
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">銷售金額</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">運費</label>
                <input type="number" name="shippingFee" value={formData.shippingFee} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">物流</label>
                <input list="logistics" name="logistics" value={formData.logistics} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                <datalist id="logistics">
                  <option value="黑貓" />
                  <option value="新竹物流" />
                  <option value="郵局" />
                  <option value="超商取貨" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">到貨日期</label>
                <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">數量</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">銷售金額</label>
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">運費</label>
                <input type="number" name="shippingFee" value={formData.shippingFee} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">物流</label>
                <input list="logistics" name="logistics" value={formData.logistics} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                <datalist id="logistics">
                  <option value="黑貓" />
                  <option value="新竹物流" />
                  <option value="郵局" />
                  <option value="超商取貨" />
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">到貨日期</label>
              <input type="date" name="arrivalDate" value={formData.arrivalDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
            </div>
          </div>
          
          <div className="md:col-span-2">
             <label className="block text-sm font-medium text-gray-700">備註</label>
             <textarea name="remarks" value={formData.remarks} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" rows="3"></textarea>
          </div>

        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {loading ? '處理中...' : '建立訂單'}
          </button>
        </div>
      </form>
    </div>
  );
}
