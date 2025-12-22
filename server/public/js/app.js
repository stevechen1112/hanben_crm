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
            productName: '',
            quantity: 1,
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

        async submitOrder() {
            try {
                await axios.post('/api/orders', this.orderForm);
                alert('訂單建立成功！');
                // Reset form
                this.orderForm = {
                    orderId: '',
                    date: new Date().toISOString().split('T')[0],
                    name: '',
                    phone: '',
                    address: '',
                    channel: '',
                    productName: '',
                    quantity: 1,
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
                alert('建立失敗，請檢查欄位');
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
