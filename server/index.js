const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Helpers ---
function getAfterSalesDueDate(arrivalDate) {
  if (!arrivalDate) return null;
  const date = new Date(arrivalDate);
  date.setDate(date.getDate() + 5);
  return date;
}

// --- Routes ---

// 1. Dashboard Stats & Alerts
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalCustomers = await prisma.customer.count();
    const totalOrders = await prisma.order.count();
    const totalSales = await prisma.order.aggregate({
      _sum: { amount: true }
    });

    // Find pending after-sales care
    // Logic: Arrival Date exists AND (Arrival Date + 5 days <= Now) AND (afterSalesNotes is null or empty)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const pendingAfterSalesCount = await prisma.order.count({
      where: {
        arrivalDate: {
          lte: fiveDaysAgo,
          not: null
        },
        OR: [
          { afterSalesNotes: null },
          { afterSalesNotes: "" }
        ]
      }
    });

    res.json({
      totalCustomers,
      totalOrders,
      totalSales: totalSales._sum.amount || 0,
      pendingAfterSalesCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Pending After-Sales Orders
app.get('/api/orders/pending-after-sales', async (req, res) => {
  try {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const orders = await prisma.order.findMany({
      where: {
        arrivalDate: {
          lte: fiveDaysAgo,
          not: null
        },
        OR: [
          { afterSalesNotes: null },
          { afterSalesNotes: "" }
        ]
      },
      include: { customer: true },
      orderBy: { arrivalDate: 'asc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Customers CRUD
app.get('/api/customers', async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * Number(limit);

  const where = search ? {
    OR: [
      { name: { contains: search } },
      { phone: { contains: search } }
    ]
  } : {};

  try {
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        include: { orders: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      data: customers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, symptoms } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id: Number(id) },
      data: { name, phone, address, symptoms }
    });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Orders CRUD
app.get('/api/orders', async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * Number(limit);

  const where = search ? {
    OR: [
      { orderId: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } }
    ]
  } : {};

  try {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: { customer: true },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      data: orders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const {
    orderId, date, name, phone, address,
    channel, productName, quantity, amount,
    shippingFee, logistics, arrivalDate, afterSalesNotes, remarks
  } = req.body;

  try {
    // 1. Find or Create Customer
    const customer = await prisma.customer.upsert({
      where: { phone },
      update: {
        name,
        address: address || undefined
      },
      create: {
        name,
        phone,
        address
      },
    });

    // 2. Create Order
    const order = await prisma.order.create({
      data: {
        orderId: orderId || `AUTO-${Date.now()}`,
        date: date ? new Date(date) : new Date(),
        channel: channel || null,
        productName: productName || null,
        quantity: Number(quantity) || 1,
        amount: Number(amount) || 0,
        shippingFee: Number(shippingFee) || 0,
        logistics: logistics || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        afterSalesNotes: afterSalesNotes || null,
        remarks: remarks || null,
        customerId: customer.id
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // Handle date conversions if present
  if (data.date) data.date = new Date(data.date);
  if (data.arrivalDate) data.arrivalDate = new Date(data.arrivalDate);

  try {
    const order = await prisma.order.update({
      where: { id: Number(id) },
      data
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer by phone (for auto-fill)
app.get('/api/customers/lookup', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone required' });

  try {
    const customer = await prisma.customer.findUnique({
      where: { phone }
    });
    res.json(customer || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// --- Import/Export ---

// 5. Export Orders
app.get('/api/export/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { date: 'desc' }
    });

    const data = orders.map(o => ({
      '訂單編號': o.orderId,
      '日期': o.date.toISOString().split('T')[0],
      '姓名': o.customer.name,
      '地址': o.customer.address || '',
      '電話': o.customer.phone,
      '通路': o.channel || '',
      '商品名稱': o.productName || '',
      '數量': o.quantity,
      '銷售金額': o.amount,
      '運費': o.shippingFee,
      '物流': o.logistics || '',
      '到貨日期': o.arrivalDate ? o.arrivalDate.toISOString().split('T')[0] : '',
      '售後關懷(+D5)': o.afterSalesNotes || '',
      '備註': o.remarks || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="orders_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Export Customers
app.get('/api/export/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const data = customers.map(c => ({
      '姓名': c.name,
      '地址': c.address || '',
      '電話': c.phone,
      '症狀': c.symptoms || '',
      '訂單總數': c._count.orders,
      '建立日期': c.createdAt.toISOString().split('T')[0]
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="customers_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Import Orders
app.post('/api/import/orders', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let count = 0;
    for (const row of rawData) {
      const {
        '訂單編號': orderId, '日期': date, '姓名': name, '電話': phone,
        '地址': address, '通路': channel, '商品名稱': productName,
        '數量': quantity, '銷售金額': amount, '運費': shippingFee,
        '物流': logistics, '到貨日期': arrivalDate, '售後關懷(+D5)': afterSalesNotes,
        '備註': remarks
      } = row;

      if (!phone || !orderId) continue;

      // Ensure customer exists
      const customer = await prisma.customer.upsert({
        where: { phone: String(phone) },
        update: { name: String(name), address: address ? String(address) : undefined },
        create: { name: String(name), phone: String(phone), address: address ? String(address) : null }
      });

      // Create or update order
      await prisma.order.upsert({
        where: { orderId: String(orderId) },
        update: {
          date: new Date(date),
          channel: channel ? String(channel) : null,
          productName: productName ? String(productName) : null,
          quantity: Number(quantity) || 1,
          amount: Number(amount) || 0,
          shippingFee: Number(shippingFee) || 0,
          logistics: logistics ? String(logistics) : null,
          arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
          afterSalesNotes: afterSalesNotes ? String(afterSalesNotes) : null,
          remarks: remarks ? String(remarks) : null,
          customerId: customer.id
        },
        create: {
          orderId: String(orderId),
          date: new Date(date),
          channel: channel ? String(channel) : null,
          productName: productName ? String(productName) : null,
          quantity: Number(quantity) || 1,
          amount: Number(amount) || 0,
          shippingFee: Number(shippingFee) || 0,
          logistics: logistics ? String(logistics) : null,
          arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
          afterSalesNotes: afterSalesNotes ? String(afterSalesNotes) : null,
          remarks: remarks ? String(remarks) : null,
          customerId: customer.id
        }
      });
      count++;
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Import Customers
app.post('/api/import/customers', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let count = 0;
    for (const row of rawData) {
      const { '姓名': name, '電話': phone, '地址': address, '症狀': symptoms } = row;
      if (!phone || !name) continue;

      await prisma.customer.upsert({
        where: { phone: String(phone) },
        update: {
          name: String(name),
          address: address ? String(address) : undefined,
          symptoms: symptoms ? String(symptoms) : undefined
        },
        create: {
          name: String(name),
          phone: String(phone),
          address: address ? String(address) : null,
          symptoms: symptoms ? String(symptoms) : null
        }
      });
      count++;
    }
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

