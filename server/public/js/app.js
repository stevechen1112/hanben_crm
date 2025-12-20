// ===== 預設選項設定區 - 在此編輯下拉選單的選項 =====
const OPTIONS = {
    channels: ['官網', '蝦皮', 'MOMO', '門市', '電話訂購', 'LINE'],
    products: ['A商品', 'B商品', 'C組合包', 'D特惠包'],
    logistics: ['黑貓', '新竹物流', '郵局', '超商取貨', '宅配通']
};
// =========================================================

function crmApp() {
    return {
        currentPage: 'dashboard',
        options: OPTIONS, // 將選項暴露給模板使用
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
