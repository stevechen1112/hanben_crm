const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const app = express();
const PORT = 3001;

app.use(cors());

function toUserError(error) {
  const message = error?.message || 'Unknown error';
  const code = error?.code;
  const target = error?.meta?.target;
  const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');

  // Prisma KnownRequestError codes
  if (code === 'P2002') {
    if (targetStr.includes('orderId')) return { status: 400, message: '訂單編號已存在，請更換訂單編號' };
    if (targetStr.includes('phone')) return { status: 400, message: '電話已存在，請更換電話或搜尋既有客戶' };
    if (targetStr.includes('name')) return { status: 400, message: '名稱已存在，請更換名稱' };
    return { status: 400, message: '資料已存在，請更換後再試' };
  }

  if (code === 'P2025') {
    return { status: 404, message: '找不到資料，可能已被刪除' };
  }

  // Custom thrown errors already human-readable
  if (
    message.startsWith('商品不存在:') ||
    message.startsWith('庫存不足:') ||
    message.includes('請至少新增') ||
    message.startsWith('庫存不足') ||
    message === '商品不存在'
  ) {
    return { status: 400, message };
  }

  return { status: 500, message };
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return undefined;
}

function normalizeItemsFromRow(row) {
  const itemsText = getRowValue(row, ['商品項目', 'items', 'Items']);
  if (itemsText !== undefined) {
    const s = String(itemsText).trim();
    if (!s) return [];
    // Accept: "A x2, B x1" or "A*2、B*1" or "A:2"
    return s
      .split(/,|、|\n|\r\n/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const m = part.match(/^(.+?)\s*(?:x|\*|：|:)\s*(\d+)$/i);
        if (m) return { productName: m[1].trim(), quantity: Number(m[2]) || 0 };
        return { productName: part.trim(), quantity: 1 };
      })
      .filter((it) => it.productName && it.quantity > 0);
  }

  const productName = getRowValue(row, ['商品', '商品名稱', 'productName', 'Product', '產品']);
  const quantity = getRowValue(row, ['數量', 'quantity', 'Quantity']);
  const p = String(productName || '').trim();
  const q = Number(quantity) || 0;
  if (!p || q <= 0) return [];
  return [{ productName: p, quantity: q }];
}

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

// --- Import/Export (Excel) ---

app.get('/api/export/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
      orderBy: { createdAt: 'desc' }
    });

    const rows = customers.map((c) => ({
      姓名: c.name,
      電話: c.phone,
      地址: c.address || '',
      症狀: c.symptoms || '',
      訂單數: Array.isArray(c.orders) ? c.orders.length : 0,
      建立時間: c.createdAt ? new Date(c.createdAt).toISOString() : ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.xlsx"');
    res.send(buffer);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/import/customers', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: '請上傳 Excel 檔案（.xlsx/.xls）' });
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetNames = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
    if (sheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel 檔案沒有工作表' });
    }

    let rows = [];
    for (const name of sheetNames) {
      const ws = wb.Sheets[name];
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (Array.isArray(parsed) && parsed.length > 0) {
        rows = parsed;
        break;
      }
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Excel 沒有資料列' });
    }

    let count = 0;
    for (const row of rows) {
      const phone = String(getRowValue(row, ['電話', 'phone', 'Phone']) || '').trim();
      const name = String(getRowValue(row, ['姓名', 'name', 'Name']) || '').trim();
      const address = String(getRowValue(row, ['地址', 'address', 'Address']) || '').trim();
      const symptoms = String(getRowValue(row, ['症狀', 'symptoms', 'Symptoms']) || '').trim();
      if (!phone || !name) continue;

      await prisma.customer.upsert({
        where: { phone },
        update: {
          name,
          address: address || null,
          symptoms: symptoms || null
        },
        create: {
          name,
          phone,
          address: address || null,
          symptoms: symptoms || null
        }
      });
      count++;
    }

    res.json({ count });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.get('/api/export/customers-template', async (req, res) => {
  try {
    const rows = [
      { 姓名: '', 電話: '', 地址: '', 症狀: '' }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customers-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.get('/api/export/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: true, items: true },
      orderBy: { date: 'desc' }
    });

    const rows = orders.map((o) => ({
      訂單編號: o.orderId,
      日期: o.date ? new Date(o.date).toISOString().slice(0, 10) : '',
      姓名: o.customer?.name || '',
      電話: o.customer?.phone || '',
      地址: o.customer?.address || '',
      通路: o.channel || '',
      商品項目: Array.isArray(o.items) && o.items.length > 0
        ? o.items.map((it) => `${it.productName} x${it.quantity}`).join(', ')
        : (o.productName || ''),
      金額: o.amount ?? 0,
      運費: o.shippingFee ?? 0,
      物流: o.logistics || '',
      到貨日期: o.arrivalDate ? new Date(o.arrivalDate).toISOString().slice(0, 10) : '',
      售後關懷: o.afterSalesNotes || '',
      備註: o.remarks || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
    res.send(buffer);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/import/orders', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: '請上傳 Excel 檔案（.xlsx/.xls）' });
    }

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetNames = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
    if (sheetNames.length === 0) {
      return res.status(400).json({ error: 'Excel 檔案沒有工作表' });
    }

    let rows = [];
    for (const name of sheetNames) {
      const ws = wb.Sheets[name];
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (Array.isArray(parsed) && parsed.length > 0) {
        rows = parsed;
        break;
      }
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Excel 沒有資料列' });
    }

    let count = 0;
    for (const row of rows) {
      const orderId = String(getRowValue(row, ['訂單編號', 'orderId', 'OrderId']) || '').trim();
      const phone = String(getRowValue(row, ['電話', 'phone', 'Phone']) || '').trim();
      const name = String(getRowValue(row, ['姓名', 'name', 'Name']) || '').trim();
      if (!orderId || !phone || !name) continue;

      const address = String(getRowValue(row, ['地址', 'address', 'Address']) || '').trim();
      const channel = String(getRowValue(row, ['通路', 'channel', 'Channel']) || '').trim();
      const logistics = String(getRowValue(row, ['物流', 'logistics', 'Logistics']) || '').trim();
      const afterSalesNotes = String(getRowValue(row, ['售後關懷', 'afterSalesNotes', 'AfterSalesNotes']) || '').trim();
      const remarks = String(getRowValue(row, ['備註', 'remarks', 'Remarks']) || '').trim();

      const dateVal = getRowValue(row, ['日期', 'date', 'Date']);
      const arrivalVal = getRowValue(row, ['到貨日期', 'arrivalDate', 'ArrivalDate']);
      const date = parseExcelDate(dateVal) || new Date();
      const arrivalDate = parseExcelDate(arrivalVal);

      const amount = Number(getRowValue(row, ['金額', 'amount', 'Amount']) || 0) || 0;
      const shippingFee = Number(getRowValue(row, ['運費', 'shippingFee', 'ShippingFee']) || 0) || 0;

      const normalizedItems = normalizeItemsFromRow(row);
      if (normalizedItems.length === 0) continue;

      const qtyByName = new Map();
      for (const it of normalizedItems) {
        qtyByName.set(it.productName, (qtyByName.get(it.productName) || 0) + it.quantity);
      }
      const summaryNames = Array.from(qtyByName.keys()).join('、');
      const totalQty = Array.from(qtyByName.values()).reduce((a, b) => a + b, 0);

      await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { phone },
          update: { name, address: address || null },
          create: { name, phone, address: address || null }
        });

        // Ensure products exist so OrderItem can reference productId.
        const productByName = new Map();
        for (const [pName] of qtyByName.entries()) {
          const product = await tx.product.upsert({
            where: { name: pName },
            update: {},
            create: { name: pName, stock: 0 }
          });
          productByName.set(pName, product);
        }

        // Upsert order by unique orderId. Replace items to match import row.
        const existing = await tx.order.findUnique({ where: { orderId } });
        if (existing) {
          await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
          await tx.order.update({
            where: { id: existing.id },
            data: {
              date,
              channel: channel || null,
              productName: summaryNames,
              quantity: totalQty,
              amount,
              shippingFee,
              logistics: logistics || null,
              arrivalDate: arrivalDate || null,
              afterSalesNotes: afterSalesNotes || null,
              remarks: remarks || null,
              customerId: customer.id,
              items: {
                create: normalizedItems.map((it) => ({
                  productId: productByName.get(it.productName).id,
                  productName: it.productName,
                  quantity: it.quantity
                }))
              }
            }
          });
        } else {
          await tx.order.create({
            data: {
              orderId,
              date,
              channel: channel || null,
              productName: summaryNames,
              quantity: totalQty,
              amount,
              shippingFee,
              logistics: logistics || null,
              arrivalDate: arrivalDate || null,
              afterSalesNotes: afterSalesNotes || null,
              remarks: remarks || null,
              customerId: customer.id,
              items: {
                create: normalizedItems.map((it) => ({
                  productId: productByName.get(it.productName).id,
                  productName: it.productName,
                  quantity: it.quantity
                }))
              }
            }
          });
        }
      });

      count++;
    }

    res.json({ count });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.get('/api/export/orders-template', async (req, res) => {
  try {
    const rows = [
      {
        訂單編號: '',
        日期: '',
        姓名: '',
        電話: '',
        地址: '',
        通路: '',
        商品項目: '',
        金額: 0,
        運費: 0,
        物流: '',
        到貨日期: '',
        售後關懷: '',
        備註: ''
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
        include: { customer: true, items: true },
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/orders', async (req, res) => {
  const {
    orderId, date, name, phone, address,
    channel, productName, quantity, amount,
    shippingFee, logistics, arrivalDate, afterSalesNotes, remarks
  } = req.body;

  const orderItems = Array.isArray(req.body.orderItems) ? req.body.orderItems : null;

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

    // 2. Build normalized items (multi-item preferred)
    const normalizedItems = (orderItems && orderItems.length > 0)
      ? orderItems
        .map((item) => ({
          productName: String(item.productName || '').trim(),
          quantity: Number(item.quantity) || 0
        }))
        .filter((item) => item.productName && item.quantity > 0)
      : (productName
        ? [{ productName: String(productName).trim(), quantity: Number(quantity) || 1 }]
        : []);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ error: '請至少新增 1 個商品項目' });
    }

    // Aggregate quantities per product name
    const qtyByName = new Map();
    for (const item of normalizedItems) {
      qtyByName.set(item.productName, (qtyByName.get(item.productName) || 0) + item.quantity);
    }

    // 3. Transaction: validate stock, create order + items, decrement stock
    const order = await prisma.$transaction(async (tx) => {
      const productsByName = new Map();
      for (const [pName, qty] of qtyByName.entries()) {
        const product = await tx.product.findUnique({ where: { name: pName } });
        if (!product) {
          throw new Error(`商品不存在: ${pName} (請先到系統設定新增商品)`);
        }
        if (product.stock < qty) {
          throw new Error(`庫存不足: ${pName} 目前庫存 ${product.stock}，需求 ${qty}`);
        }
        productsByName.set(pName, product);
      }

      const summaryNames = Array.from(qtyByName.keys()).join('、');
      const totalQty = Array.from(qtyByName.values()).reduce((a, b) => a + b, 0);

      const created = await tx.order.create({
        data: {
          orderId,
          date: new Date(date),
          channel,
          // Legacy fields kept for compatibility with existing UI/table columns
          productName: summaryNames,
          quantity: totalQty,
          amount: Number(amount),
          shippingFee: Number(shippingFee),
          logistics,
          arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
          afterSalesNotes,
          remarks,
          customerId: customer.id,
          items: {
            create: normalizedItems.map((it) => ({
              productId: productsByName.get(it.productName).id,
              productName: it.productName,
              quantity: it.quantity
            }))
          }
        },
        include: { items: true }
      });

      for (const [pName, qty] of qtyByName.entries()) {
        await tx.product.update({
          where: { id: productsByName.get(pName).id },
          data: { stock: { decrement: qty } }
        });

        await tx.stockMovement.create({
          data: {
            productId: productsByName.get(pName).id,
            quantity: -qty,
            type: 'SALE',
            ref: orderId,
            note: '訂單扣庫存'
          }
        });
      }

      return created;
    });

    res.json(order);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

// --- Settings: Products, Channels, Logistics ---

// Products
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany();
  res.json(products);
});

// Stock movements (recent)
app.get('/api/products/:id/movements', async (req, res) => {
  const { id } = req.params;
  const limit = Number(req.query.limit) || 10;
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: Number(id) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50)
    });
    res.json(movements);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

// Adjust stock (+/-)
app.post('/api/products/:id/adjust-stock', async (req, res) => {
  const { id } = req.params;
  const delta = Number(req.body.delta);
  const note = req.body.note ? String(req.body.note) : null;
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'delta 必須為非 0 數字' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: Number(id) } });
      if (!product) throw new Error('商品不存在');

      const nextStock = product.stock + delta;
      if (nextStock < 0) throw new Error(`庫存不足：目前 ${product.stock}，調整 ${delta}`);

      const updated = await tx.product.update({
        where: { id: Number(id) },
        data: { stock: { increment: delta } }
      });

      await tx.stockMovement.create({
        data: {
          productId: updated.id,
          quantity: delta,
          type: delta > 0 ? 'IN' : 'OUT',
          ref: 'MANUAL',
          note
        }
      });

      return updated;
    });

    res.json(result);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, stock } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, stock: Number(stock) || 0 }
    });
    res.json(product);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.delete('/api/channels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.channel.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
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
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.delete('/api/logistics/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.logistics.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

// --- Settings API ---

// Products
app.get('/api/settings/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/settings/products', async (req, res) => {
  const { name, stock } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, stock: Number(stock) || 0 }
    });
    res.json(product);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.put('/api/settings/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stock } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { name, stock: Number(stock) }
    });
    res.json(product);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.delete('/api/settings/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

// Channels
app.get('/api/settings/channels', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({ orderBy: { name: 'asc' } });
    res.json(channels);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.post('/api/settings/channels', async (req, res) => {
  const { name } = req.body;
  try {
    const channel = await prisma.channel.create({ data: { name } });
    res.json(channel);
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.delete('/api/settings/channels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.channel.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    const { status, message } = toUserError(error);
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
