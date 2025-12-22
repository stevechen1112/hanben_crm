const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
        orderId,
        date: new Date(date),
        channel,
        productName,
        quantity: Number(quantity),
        amount: Number(amount),
        shippingFee: Number(shippingFee),
        logistics,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        afterSalesNotes,
        remarks,
        customerId: customer.id
      }
    });

    // 3. Update Stock (if product exists)
    if (productName) {
      try {
        const product = await prisma.product.findUnique({ where: { name: productName } });
        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: product.stock - Number(quantity) }
          });
        }
      } catch (e) {
        console.error("Failed to update stock:", e);
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
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

// --- Settings: Products, Channels, Logistics ---

// Products
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const { name, stock } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, stock: Number(stock) || 0 }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stock } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { name, stock: Number(stock) }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Channels
app.get('/api/channels', async (req, res) => {
  const channels = await prisma.channel.findMany();
  res.json(channels);
});

app.post('/api/channels', async (req, res) => {
  const { name } = req.body;
  try {
    const channel = await prisma.channel.create({ data: { name } });
    res.json(channel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/channels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.channel.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logistics
app.get('/api/logistics', async (req, res) => {
  const logistics = await prisma.logistics.findMany();
  res.json(logistics);
});

app.post('/api/logistics', async (req, res) => {
  const { name } = req.body;
  try {
    const item = await prisma.logistics.create({ data: { name } });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/logistics/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.logistics.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
