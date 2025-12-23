function crmApp() {
    return {
        currentPage: 'dashboard',
        // Options loaded from API
        options: {
            channels: [],
            products: [],
            logistics: []
        },
        // Settings Form Data
        newProduct: { name: '', stock: 0 },
        newChannel: { name: '' },
        newLogistics: { name: '' },

        // Inventory adjustments
        stockAdjust: {},
        stockNote: {},
        showMovements: {},
        movementsByProduct: {},

        // Customer edit (inline)
        editingCustomerId: null,
        customerEdit: { id: null, name: '', phone: '', address: '', symptoms: '' },

        // Order edit (inline)
        editingOrderId: null,
        orderEdit: { id: null, orderId: '', date: '', name: '', phone: '', address: '', channel: '', amount: 0, shippingFee: 0, logistics: '', arrivalDate: '', afterSalesNotes: '' },

        stats: {
            totalCustomers: 0,
            totalOrders: 0,
            totalSales: 0,
            pendingAfterSalesCount: 0
        },
        orderForm: {
            orderId: '',
            date: new Date().toISOString().split('T')[0],
            name: '',
            phone: '',
            address: '',
            channel: '',
            items: [
                { productName: '', quantity: 1 }
            ],
            amount: 0,
            shippingFee: 0,
            logistics: '',
            arrivalDate: '',
            remarks: ''
        },
        orders: { data: [], pagination: { total: 0, totalPages: 1 } },
        customers: { data: [], pagination: { total: 0, totalPages: 1 } },
        pendingAfterSales: [],
        searchOrders: '',
        searchCustomers: '',
        ordersPage: 1,
        customersPage: 1,

        async init() {
            await this.loadDashboard();
            await this.fetchOptions();
        },

        async fetchOptions() {
            try {
                const [pRes, cRes, lRes] = await Promise.all([
                    axios.get('/api/products'),
                    axios.get('/api/channels'),
                    axios.get('/api/logistics')
                ]);
                this.options.products = pRes.data;
                this.options.channels = cRes.data;
                this.options.logistics = lRes.data;
            } catch (error) {
                console.error('Error loading options:', error);
            }
        },

        // --- Settings Management ---
        async addProduct() {
            if (!this.newProduct.name) return;
            try {
                await axios.post('/api/products', this.newProduct);
                this.newProduct = { name: '', stock: 0 };
                await this.fetchOptions();
            } catch (e) { alert('新增失敗: ' + e.message); }
        },

        async adjustProductStock(productId, direction) {
            const qty = Number(this.stockAdjust[productId]) || 0;
            if (qty <= 0) {
                alert('請輸入調整數量（大於 0）');
                return;
            }
            const delta = direction === 'in' ? qty : -qty;
            const note = this.stockNote[productId] || '';
            try {
                await axios.post(`/api/products/${productId}/adjust-stock`, { delta, note });
                this.stockAdjust[productId] = '';
                this.stockNote[productId] = '';
                await this.fetchOptions();
                if (this.showMovements[productId]) {
                    await this.loadProductMovements(productId);
                }
            } catch (e) {
                alert(e?.response?.data?.error || '調整失敗');
            }
        },

        async toggleMovements(productId) {
            this.showMovements[productId] = !this.showMovements[productId];
            if (this.showMovements[productId]) {
                await this.loadProductMovements(productId);
            }
        },

        async loadProductMovements(productId) {
            try {
                const res = await axios.get(`/api/products/${productId}/movements?limit=10`);
                this.movementsByProduct[productId] = res.data;
            } catch (e) {
                this.movementsByProduct[productId] = [];
            }
        },
        async deleteProduct(id) {
            if (!confirm('確定刪除?')) return;
            try {
                await axios.delete(`/api/products/${id}`);
                await this.fetchOptions();
            } catch (e) { alert('刪除失敗'); }
        },
        async addChannel() {
            if (!this.newChannel.name) return;
            try {
                await axios.post('/api/channels', this.newChannel);
                this.newChannel = { name: '' };
                await this.fetchOptions();
            } catch (e) { alert('新增失敗: ' + e.message); }
        },
        async deleteChannel(id) {
            if (!confirm('確定刪除?')) return;
            try {
                await axios.delete(`/api/channels/${id}`);
                await this.fetchOptions();
            } catch (e) { alert('刪除失敗'); }
        },
        async addLogistics() {
            if (!this.newLogistics.name) return;
            try {
                await axios.post('/api/logistics', this.newLogistics);
                this.newLogistics = { name: '' };
                await this.fetchOptions();
            } catch (e) { alert('新增失敗: ' + e.message); }
        },
        async deleteLogistics(id) {
            if (!confirm('確定刪除?')) return;
            try {
                await axios.delete(`/api/logistics/${id}`);
                await this.fetchOptions();
            } catch (e) { alert('刪除失敗'); }
        },

        async loadDashboard() {
            try {
                const res = await axios.get('/api/dashboard');
                this.stats = res.data;
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        },

        exportOrders() {
            window.open('/api/export/orders', '_blank');
        },

        downloadOrdersTemplate() {
            window.open('/api/export/orders-template', '_blank');
        },

        exportCustomers() {
            window.open('/api/export/customers', '_blank');
        },

        downloadCustomersTemplate() {
            window.open('/api/export/customers-template', '_blank');
        },

        triggerOrdersImport() {
            this.$refs?.ordersImportFile?.click();
        },

        triggerCustomersImport() {
            this.$refs?.customersImportFile?.click();
        },

        async importOrders(event) {
            const file = event?.target?.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            try {
                const res = await axios.post('/api/import/orders', form);
                alert(`匯入完成！成功匯入/更新 ${res.data.count} 筆訂單。`);
                await this.loadOrders();
                await this.loadDashboard();
            } catch (e) {
                alert(e?.response?.data?.error || '匯入失敗，請檢查檔案格式');
            } finally {
                event.target.value = '';
            }
        },

        async importCustomers(event) {
            const file = event?.target?.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            try {
                const res = await axios.post('/api/import/customers', form);
                alert(`匯入完成！成功匯入/更新 ${res.data.count} 筆客戶資料。`);
                await this.loadCustomers();
                await this.loadDashboard();
            } catch (e) {
                alert(e?.response?.data?.error || '匯入失敗，請檢查檔案格式');
            } finally {
                event.target.value = '';
            }
        },

        async lookupCustomer() {
            if (this.orderForm.phone.length >= 8) {
                try {
                    const res = await axios.get(`/api/customers/lookup?phone=${this.orderForm.phone}`);
                    if (res.data) {
                        this.orderForm.name = res.data.name;
                        this.orderForm.address = res.data.address || '';
                    }
                } catch (error) {
                    console.error('Lookup failed:', error);
                }
            }
        },

        addOrderItem() {
            this.orderForm.items.push({ productName: '', quantity: 1 });
        },

        removeOrderItem(index) {
            if (this.orderForm.items.length <= 1) return;
            this.orderForm.items.splice(index, 1);
        },

        formatOrderItems(order) {
            if (Array.isArray(order.items) && order.items.length > 0) {
                return order.items.map((it) => `${it.productName} x${it.quantity}`).join(', ');
            }
            return order.productName || '';
        },

        async submitOrder() {
            try {
                const payload = {
                    ...this.orderForm,
                    orderItems: (this.orderForm.items || [])
                        .map((it) => ({ productName: (it.productName || '').trim(), quantity: Number(it.quantity) || 0 }))
                        .filter((it) => it.productName && it.quantity > 0)
                };

                await axios.post('/api/orders', payload);
                alert('訂單建立成功！');
                // Reset form
                this.orderForm = {
                    orderId: '',
                    date: new Date().toISOString().split('T')[0],
                    name: '',
                    phone: '',
                    address: '',
                    channel: '',
                    items: [
                        { productName: '', quantity: 1 }
                    ],
                    amount: 0,
                    shippingFee: 0,
                    logistics: '',
                    arrivalDate: '',
                    remarks: ''
                };
                this.currentPage = 'orders';
                await this.loadOrders();
                await this.loadDashboard();
            } catch (error) {
                console.error('Error creating order:', error);
                alert(error?.response?.data?.error || '建立失敗，請檢查欄位');
            }
        },

        async loadOrders() {
            try {
                const res = await axios.get(`/api/orders?search=${this.searchOrders}&page=${this.ordersPage}&limit=20`);
                this.orders = res.data;
            } catch (error) {
                console.error('Error loading orders:', error);
            }
        },

        async loadCustomers() {
            try {
                const res = await axios.get(`/api/customers?search=${this.searchCustomers}&page=${this.customersPage}&limit=20`);
                this.customers = res.data;
            } catch (error) {
                console.error('Error loading customers:', error);
            }
        },

        startEditCustomer(customer) {
            this.editingCustomerId = customer.id;
            this.customerEdit = {
                id: customer.id,
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || '',
                symptoms: customer.symptoms || ''
            };
        },

        cancelEditCustomer() {
            this.editingCustomerId = null;
            this.customerEdit = { id: null, name: '', phone: '', address: '', symptoms: '' };
        },

        async saveCustomerEdit() {
            if (!this.customerEdit.id) return;
            try {
                await axios.put(`/api/customers/${this.customerEdit.id}`, {
                    name: this.customerEdit.name,
                    phone: this.customerEdit.phone,
                    address: this.customerEdit.address,
                    symptoms: this.customerEdit.symptoms
                });
                this.cancelEditCustomer();
                await this.loadCustomers();
                alert('客戶資料已更新');
            } catch (e) {
                alert(e?.response?.data?.error || '更新失敗');
            }
        },

        // Order edit functions
        startEditOrder(order) {
            this.editingOrderId = order.id;
            this.orderEdit = {
                id: order.id,
                orderId: order.orderId || '',
                date: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
                name: order.customer?.name || '',
                phone: order.customer?.phone || '',
                address: order.customer?.address || '',
                channel: order.channel || '',
                amount: order.amount || 0,
                shippingFee: order.shippingFee || 0,
                logistics: order.logistics || '',
                arrivalDate: order.arrivalDate ? new Date(order.arrivalDate).toISOString().split('T')[0] : '',
                afterSalesNotes: order.afterSalesNotes || ''
            };
        },

        cancelEditOrder() {
            this.editingOrderId = null;
            this.orderEdit = { id: null, orderId: '', date: '', name: '', phone: '', address: '', channel: '', amount: 0, shippingFee: 0, logistics: '', arrivalDate: '', afterSalesNotes: '' };
        },

        async saveOrderEdit() {
            if (!this.orderEdit.id) return;
            try {
                const payload = {
                    orderId: this.orderEdit.orderId,
                    date: this.orderEdit.date,
                    channel: this.orderEdit.channel,
                    amount: Number(this.orderEdit.amount) || 0,
                    shippingFee: Number(this.orderEdit.shippingFee) || 0,
                    logistics: this.orderEdit.logistics,
                    arrivalDate: this.orderEdit.arrivalDate || null,
                    afterSalesNotes: this.orderEdit.afterSalesNotes
                };
                await axios.put(`/api/orders/${this.orderEdit.id}`, payload);
                this.cancelEditOrder();
                await this.loadOrders();
                alert('訂單資料已更新');
            } catch (e) {
                alert(e?.response?.data?.error || '更新失敗');
            }
        },

        async loadPendingAfterSales() {
            try {
                const res = await axios.get('/api/orders/pending-after-sales');
                this.pendingAfterSales = res.data;
            } catch (error) {
                console.error('Error loading pending after sales:', error);
            }
        },

        async updateAfterSales(orderId, notes) {
            if (!notes) {
                alert('請輸入售後關懷紀錄');
                return;
            }
            try {
                await axios.put(`/api/orders/${orderId}`, { afterSalesNotes: notes });
                await this.loadPendingAfterSales();
                await this.loadDashboard();
                alert('售後關懷紀錄已儲存');
            } catch (error) {
                console.error('Error updating after sales:', error);
                alert('更新失敗');
            }
        }
    };
}
