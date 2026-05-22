const express = require('express');
const cors = require('cors');
const Datastore = require('@seald-io/nedb');
const { v4: uuidv4 } = require('uuid');
const path = require('path'); 
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- Databases ---
const db = {
  items:        new Datastore({ filename: './data/items.db',        autoload: true }),
  warehouses:   new Datastore({ filename: './data/warehouses.db',   autoload: true }),
  vendors:      new Datastore({ filename: './data/vendors.db',      autoload: true }),
  outlets:      new Datastore({ filename: './data/outlets.db',      autoload: true }),
  stock:        new Datastore({ filename: './data/stock.db',        autoload: true }),
  transactions: new Datastore({ filename: './data/transactions.db', autoload: true }),
  invoices:     new Datastore({ filename: path.join(DATA_DIR, 'invoices.db'),     autoload: true }),
  categories:   new Datastore({ filename: './data/categories.db',   autoload: true }),
  users:        new Datastore({ filename: './data/users.db',        autoload: true }),
  gatepasses:   new Datastore({ filename: './data/gatepasses.db',   autoload: true }),
};

const findAll = (d) => new Promise((res, rej) => d.find({}, (e, docs) => e ? rej(e) : res(docs)));
const findOne = (d, q) => new Promise((res, rej) => d.findOne(q, (e, doc) => e ? rej(e) : res(doc)));
const insert  = (d, doc) => new Promise((res, rej) => d.insert(doc, (e, nd) => e ? rej(e) : res(nd)));
const update  = (d, q, u, o={}) => new Promise((res, rej) => d.update(q, u, o, (e, n) => e ? rej(e) : res(n)));
const remove  = (d, q, o={}) => new Promise((res, rej) => d.remove(q, o, (e, n) => e ? rej(e) : res(n)));

// --- Seed defaults ---
async function seed() {
  const wh = await findAll(db.warehouses);
  if (wh.length === 0) {
    await insert(db.warehouses, [
      { _id: 'wh1', name: 'RR', location: '', phone: '' },
      { _id: 'wh2', name: 'CP', location: '', phone: '' },
      { _id: 'wh3', name: 'TN', location: '', phone: '' },
    ]);
  }
  const out = await findAll(db.outlets);
  if (out.length === 0) {
    await insert(db.outlets, [
      { _id: 'out1', name: 'KG', location: '', phone: '' },
      { _id: 'out2', name: 'VN', location: '', phone: '' },
      { _id: 'out3', name: 'CP', location: '', phone: '' },
      { _id: 'out4', name: 'PC', location: '', phone: '' },
    ]);
  }
  const cats = await findAll(db.categories);
  if (cats.length === 0) {
    await insert(db.categories, [
      { _id: 'cat-box',     name: 'Box',             icon: '📦', subcategories: ['Fancy Box', 'Dry Fruit Box', 'Metal Box'] },
      { _id: 'cat-bag',     name: 'Bag',             icon: '👜', subcategories: ['Paper Bag', 'Jute Bag', 'Digital Print Bag'] },
      { _id: 'cat-packing', name: 'Packing Material', icon: '🎁', subcategories: [] },
    ]);
  }
}
seed();

// Helper: remove item and ALL related data everywhere
async function removeItemAndStock(itemId) {
  await remove(db.items, { _id: itemId });
  // Remove all stock records for this item across all warehouses
  await db.stock.remove({ itemId: itemId }, { multi: true });
  // Remove all transactions for this item
  await db.transactions.remove({ itemId: itemId }, { multi: true });
  // Remove from any dispatch/gatepass items lists
  const passes = await findAll(db.gatepasses);
  for (const pass of passes) {
    const newItems = (pass.items || []).filter(i => i.itemId !== itemId);
    if (newItems.length !== (pass.items || []).length) {
      if (newItems.length === 0) {
        await remove(db.gatepasses, { _id: pass._id });
      } else {
        await update(db.gatepasses, { _id: pass._id }, { $set: { items: newItems } });
      }
    }
  }
}

// ====== STAFF / USER MANAGEMENT ======
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await findAll(db.users);
    // Never return passwords
    res.json(staff.map(s => ({ ...s, password: undefined })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff', async (req, res) => {
  try {
    const { name, username, password, role, locationId, locationName, locationType } = req.body;
    if (!name || !username || !password || !role) return res.status(400).json({ error: 'name, username, password, role required' });
    const existing = await findOne(db.users, { username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });
    const user = await insert(db.users, {
      name, username, password, role,
      locationId: locationId || null,
      locationName: locationName || null,
      locationType: locationType || null, // 'warehouse' or 'outlet'
      active: true,
      createdAt: new Date()
    });
    res.json({ ...user, password: undefined });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/staff/:id', async (req, res) => {
  try {
    const { name, username, password, role, locationId, locationName, locationType, active, permissions } = req.body;
    const upd = { name, username, role, locationId, locationName, locationType, active };
    if (password) upd.password = password;
    if (permissions) upd.permissions = permissions;
    await update(db.users, { _id: req.params.id }, { $set: upd });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/staff/:id', async (req, res) => {
  try {
    await remove(db.users, { _id: req.params.id });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/staff/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await findOne(db.users, { username, password, active: true });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    res.json({ ...user, password: undefined });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ====== TEST ======
app.get('/api/test', (req, res) => res.json({ ok: true, version: 'v2-with-gatepasses', hasGatepasses: true }));

// ====== CATEGORIES ======
app.get('/api/categories', async (req, res) => {
  res.json(await findAll(db.categories));
});
app.post('/api/categories', async (req, res) => {
  const { name, icon, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const cat = await insert(db.categories, { name, icon: icon || null, parentId: parentId || null, subcategories: [] });
  res.json(cat);
});
app.post('/api/categories/:id/subcategory', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const cat = await findOne(db.categories, { _id: req.params.id });
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const subs = [...(cat.subcategories || []), name];
  await update(db.categories, { _id: req.params.id }, { $set: { subcategories: subs } });
  res.json({ ok: true });
});
app.delete('/api/categories/:id/subcategory', async (req, res) => {
  const { name } = req.body;
  const cat = await findOne(db.categories, { _id: req.params.id });
  if (!cat) return res.status(404).json({ error: 'Not found' });
  // Delete all items under this subcategory and their stock
  const catPath = cat.name + ' › ' + name;
  const subItems = await findAll(db.items);
  for (const item of subItems) {
    if (item.category && (item.category === catPath || item.category.startsWith(catPath + ' ›'))) {
      await removeItemAndStock(item._id);
    }
  }
  // Also remove sub-sub categories under this sub
  const subSubs = (cat.subsubcategories || []).filter(s => s.startsWith(name + ':'));
  const remainingSubSubs = (cat.subsubcategories || []).filter(s => !s.startsWith(name + ':'));
  const subs = (cat.subcategories || []).filter(s => s !== name);
  await update(db.categories, { _id: req.params.id }, { $set: { subcategories: subs, subsubcategories: remainingSubSubs } });
  res.json({ ok: true });
});
app.put('/api/categories/:id', async (req, res) => {
  const { name, location, subsubcategories, subcategories, icon } = req.body;
  const upd = {}
  if (name !== undefined) upd.name = name
  if (icon !== undefined) upd.icon = icon
  if (location !== undefined) upd.location = location
  if (subsubcategories !== undefined) upd.subsubcategories = subsubcategories
  if (subcategories !== undefined) upd.subcategories = subcategories
  await update(db.categories, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});
app.delete('/api/categories/:id', async (req, res) => {
  const cat = await findOne(db.categories, { _id: req.params.id });
  if (!cat) return res.status(404).json({ error: 'Not found' });
  // Delete all items under this category and their stock
  const allItems = await findAll(db.items);
  for (const item of allItems) {
    if (item.category && (item.category === cat.name || item.category.startsWith(cat.name + ' ›'))) {
      await removeItemAndStock(item._id);
    }
  }
  await remove(db.categories, { _id: req.params.id });
  res.json({ ok: true });
});


// ====== USERS & AUTH ======
async function seedUsers() {
  const users = await findAll(db.users);
  if (users.length === 0) {
    const wh = await findAll(db.warehouses);
    const out = await findAll(db.outlets);
    await db.users.insert([
      { username: 'admin', password: 'admin123', role: 'admin', locationId: null, locationName: 'All Locations' },
      { username: 'warehouse1', password: 'wh1pass', role: 'warehouse', locationId: wh[0]?._id, locationName: wh[0]?.name || 'Warehouse 1' },
      { username: 'warehouse2', password: 'wh2pass', role: 'warehouse', locationId: wh[1]?._id, locationName: wh[1]?.name || 'Warehouse 2' },
      { username: 'warehouse3', password: 'wh3pass', role: 'warehouse', locationId: wh[2]?._id, locationName: wh[2]?.name || 'Warehouse 3' },
      { username: 'outlet1', password: 'out1pass', role: 'outlet', locationId: out[0]?._id, locationName: out[0]?.name || 'Outlet 1' },
      { username: 'outlet2', password: 'out2pass', role: 'outlet', locationId: out[1]?._id, locationName: out[1]?.name || 'Outlet 2' },
      { username: 'outlet3', password: 'out3pass', role: 'outlet', locationId: out[2]?._id, locationName: out[2]?.name || 'Outlet 3' },
      { username: 'outlet4', password: 'out4pass', role: 'outlet', locationId: out[3]?._id, locationName: out[3]?.name || 'Outlet 4' },
    ]);
  }
}
setTimeout(seedUsers, 500);

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await findOne(db.users, { username, password });
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  res.json({ user: { _id: user._id, username: user.username, role: user.role, locationId: user.locationId, locationName: user.locationName } });
});

app.get('/api/users', async (req, res) => {
  const users = await findAll(db.users);
  res.json(users.map(u => ({ ...u, password: undefined })));
});

app.post('/api/users', async (req, res) => {
  const { username, password, role, locationId, locationName } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role required' });
  const existing = await findOne(db.users, { username });
  if (existing) return res.status(400).json({ error: 'Username already exists' });
  const user = await insert(db.users, { username, password, role, locationId: locationId || null, locationName: locationName || '' });
  res.json({ ...user, password: undefined });
});

app.delete('/api/users/:id', async (req, res) => {
  await remove(db.users, { _id: req.params.id });
  res.json({ ok: true });
});

// ====== IMAGE UPLOAD ======
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ====== ITEMS ======
app.get('/api/items', async (req, res) => {
  res.json(await findAll(db.items));
});
app.post('/api/items', async (req, res) => {
  const { name, unit, category, categoryId, reorderLevel, imageUrl, costPrice, sellingPrice, vendorId, vendorName, vendorCode } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'Name and unit required' });
  // Auto-generate item code: first 2 letters of category + timestamp
  const catPrefix = (category || 'GN').replace(/[^a-zA-Z]/g,'').substring(0,2).toUpperCase();
  const itemCode = catPrefix + Date.now().toString().slice(-5);
  const item = await insert(db.items, {
    name, unit,
    category: category||'General',
    categoryId: categoryId||null,
    reorderLevel: reorderLevel||0,
    imageUrl: imageUrl||null,
    itemCode,
    costPrice: costPrice||0,
    sellingPrice: sellingPrice||0,
    vendorId: vendorId||null,
    vendorName: vendorName||'',
    vendorCode: vendorCode||'',
    createdAt: new Date()
  });
  res.json(item);
});
app.put('/api/items/:id', async (req, res) => {
  const { name, unit, reorderLevel, category, imageUrl, costPrice, sellingPrice, vendorId, vendorName, vendorCode } = req.body;
  const upd = {};
  if (name !== undefined) upd.name = name;
  if (unit !== undefined) upd.unit = unit;
  if (reorderLevel !== undefined) upd.reorderLevel = reorderLevel;
  if (category !== undefined) upd.category = category;
  if (imageUrl !== undefined) upd.imageUrl = imageUrl;
  if (costPrice !== undefined) upd.costPrice = costPrice;
  if (sellingPrice !== undefined) upd.sellingPrice = sellingPrice;
  if (vendorId !== undefined) upd.vendorId = vendorId;
  if (vendorName !== undefined) upd.vendorName = vendorName;
  if (vendorCode !== undefined) upd.vendorCode = vendorCode;
  await update(db.items, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});
app.delete('/api/items/:id', async (req, res) => {
  await removeItemAndStock(req.params.id);
  res.json({ ok: true });
});

// ====== WAREHOUSES ======
app.get('/api/warehouses', async (req, res) => {
  const warehouses = await findAll(db.warehouses);
  const stock = await findAll(db.stock);
  const items = await findAll(db.items);
  const itemMap = Object.fromEntries(items.map(i => [i._id, i]));
  const result = warehouses.map(w => ({
    ...w,
    stock: stock.filter(s => s.warehouseId === w._id).map(s => ({
      ...s,
      item: itemMap[s.itemId] || null
    }))
  }));
  res.json(result);
});
app.put('/api/warehouses/:id', async (req, res) => {
  const { name, location, phone } = req.body;
  const upd = {};
  if (name !== undefined) upd.name = name;
  if (location !== undefined) upd.location = location;
  if (phone !== undefined) upd.phone = phone;
  await update(db.warehouses, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});

// ====== VENDORS ======
app.get('/api/vendors', async (req, res) => {
  res.json(await findAll(db.vendors));
});
app.post('/api/vendors', async (req, res) => {
  const { name, contact, email, address, gst, items: vendorItems } = req.body;
  if (!name) return res.status(400).json({ error: 'Vendor name required' });
  const v = await insert(db.vendors, { name, contact: contact||'', email: email||'', address: address||'', gst: gst||'', items: vendorItems||[], createdAt: new Date() });
  res.json(v);
});
app.put('/api/vendors/:id', async (req, res) => {
  const { name, contact, email, address, gst } = req.body;
  const upd = {};
  if (name !== undefined) upd.name = name;
  if (contact !== undefined) upd.contact = contact;
  if (email !== undefined) upd.email = email;
  if (address !== undefined) upd.address = address;
  if (gst !== undefined) upd.gst = gst;
  await update(db.vendors, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});
app.delete('/api/vendors/:id', async (req, res) => {
  await remove(db.vendors, { _id: req.params.id });
  res.json({ ok: true });
});

// ====== OUTLETS ======
app.get('/api/outlets', async (req, res) => {
  const outlets = await findAll(db.outlets);
  const txns = await findAll(db.transactions);
  const items = await findAll(db.items);
  const itemMap = Object.fromEntries(items.map(i => [i._id, i]));
  // Build outlet stock from transfer transactions
  const result = outlets.map(o => {
    const transfers = txns.filter(t => t.type === 'transfer' && t.toId === o._id);
    const stockMap = {};
    transfers.forEach(t => {
      if (!stockMap[t.itemId]) stockMap[t.itemId] = { itemId: t.itemId, item: itemMap[t.itemId], received: 0, sold: 0 };
      stockMap[t.itemId].received += t.quantity;
    });
    const sales = txns.filter(t => t.type === 'sale' && t.fromId === o._id);
    sales.forEach(t => {
      if (!stockMap[t.itemId]) stockMap[t.itemId] = { itemId: t.itemId, item: itemMap[t.itemId], received: 0, sold: 0 };
      stockMap[t.itemId].sold += t.quantity;
    });
    return { ...o, stock: Object.values(stockMap) };
  });
  res.json(result);
});
app.put('/api/outlets/:id', async (req, res) => {
  const { name, location, phone } = req.body;
  const upd = {};
  if (name !== undefined) upd.name = name;
  if (location !== undefined) upd.location = location;
  if (phone !== undefined) upd.phone = phone;
  await update(db.outlets, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});

// ====== PURCHASE from vendor → warehouse ======
app.post('/api/purchase', async (req, res) => {
  const { vendorId, warehouseId, itemId, quantity, note, pricePerUnit } = req.body;
  if (!warehouseId || !itemId || !quantity || quantity <= 0)
    return res.status(400).json({ error: 'warehouseId, itemId, quantity required' });

  // Update warehouse stock
  const existing = await findOne(db.stock, { warehouseId, itemId });
  if (existing) {
    await update(db.stock, { _id: existing._id }, { $inc: { quantity } });
  } else {
    await insert(db.stock, { warehouseId, itemId, quantity });
  }

  // Log transaction
  const txn = await insert(db.transactions, {
    type: 'purchase',
    fromId: vendorId || null,
    fromType: 'vendor',
    toId: warehouseId,
    toType: 'warehouse',
    itemId,
    quantity,
    pricePerUnit: pricePerUnit || 0,
    note: note || '',
    createdAt: new Date()
  });
  res.json(txn);
});

// ====== TRANSFER from warehouse → outlet ======
app.post('/api/transfer', async (req, res) => {
  const { outletId, itemId, quantity, note } = req.body;
  if (!outletId || !itemId || !quantity || quantity <= 0)
    return res.status(400).json({ error: 'outletId, itemId, quantity required' });

  // Find warehouse(s) that have enough stock
  const stocks = await new Promise((res2, rej) =>
    db.stock.find({ itemId }).sort({ quantity: -1 }).exec((e, d) => e ? rej(e) : res2(d))
  );
  const total = stocks.reduce((s, x) => s + x.quantity, 0);
  if (total < quantity) return res.status(400).json({ error: `Not enough stock. Total available: ${total}` });

  // Deduct from warehouses (highest stock first)
  let remaining = quantity;
  const deductions = [];
  for (const s of stocks) {
    if (remaining <= 0) break;
    const take = Math.min(s.quantity, remaining);
    await update(db.stock, { _id: s._id }, { $inc: { quantity: -take } });
    deductions.push({ warehouseId: s.warehouseId, took: take });
    remaining -= take;
  }

  // Log transaction
  const txn = await insert(db.transactions, {
    type: 'transfer',
    fromId: deductions[0].warehouseId,
    fromType: 'warehouse',
    toId: outletId,
    toType: 'outlet',
    itemId,
    quantity,
    deductions,
    note: note || '',
    createdAt: new Date()
  });
  res.json(txn);
});

// ====== SALE at outlet (mark as sold) ======
app.post('/api/sale', async (req, res) => {
  const { outletId, itemId, quantity, note } = req.body;
  const txn = await insert(db.transactions, {
    type: 'sale',
    fromId: outletId,
    fromType: 'outlet',
    toId: null,
    toType: null,
    itemId,
    quantity,
    note: note || '',
    createdAt: new Date()
  });
  res.json(txn);
});

// ====== DELETE TRANSACTION (reverses stock) ======
app.delete('/api/transactions/:id', async (req, res) => {
  const txn = await findOne(db.transactions, { _id: req.params.id });
  if (!txn) return res.status(404).json({ error: 'Not found' });

  // Reverse the stock effect based on transaction type
  if (txn.itemId && txn.quantity) {
    if (txn.type === 'purchase' && txn.toId) {
      // Purchase: remove stock from destination warehouse
      const s = await findOne(db.stock, { warehouseId: txn.toId, itemId: txn.itemId });
      if (s) {
        const newQty = Math.max(0, s.quantity - txn.quantity);
        await update(db.stock, { _id: s._id }, { $set: { quantity: newQty } });
      }
    } else if (txn.type === 'transfer' && txn.toId && txn.fromId) {
      // Transfer: reverse by moving stock back from destination to source
      const dest = await findOne(db.stock, { warehouseId: txn.toId, itemId: txn.itemId });
      if (dest) await update(db.stock, { _id: dest._id }, { $set: { quantity: Math.max(0, dest.quantity - txn.quantity) } });
      const src = await findOne(db.stock, { warehouseId: txn.fromId, itemId: txn.itemId });
      if (src) await update(db.stock, { _id: src._id }, { $inc: { quantity: txn.quantity } });
    }
  }

  await remove(db.transactions, { _id: req.params.id });
  res.json({ ok: true });
});

// ====== RENAME WAREHOUSES/OUTLETS ======
app.post('/api/rename-defaults', async (req, res) => {
  const whMap = { 'Warehouse 1': 'RR', 'Warehouse 2': 'CP', 'Warehouse 3': 'TN' }
  const outMap = { 'Outlet 1': 'KG', 'Outlet 2': 'VN', 'Outlet 3': 'CP', 'Outlet 4': 'PC' }
  for (const [old, newName] of Object.entries(whMap)) {
    const wh = await findOne(db.warehouses, { name: old })
    if (wh) await update(db.warehouses, { _id: wh._id }, { $set: { name: newName } })
  }
  for (const [old, newName] of Object.entries(outMap)) {
    const out = await findOne(db.outlets, { name: old })
    if (out) await update(db.outlets, { _id: out._id }, { $set: { name: newName } })
  }
  // Also update transaction references
  const txns = await findAll(db.transactions)
  for (const t of txns) {
    const upd = {}
    if (whMap[t.fromName]) upd.fromName = whMap[t.fromName]
    if (whMap[t.toName]) upd.toName = whMap[t.toName]
    if (outMap[t.fromName]) upd.fromName = outMap[t.fromName]
    if (outMap[t.toName]) upd.toName = outMap[t.toName]
    if (Object.keys(upd).length) await update(db.transactions, { _id: t._id }, { $set: upd })
  }
  res.json({ ok: true })
})

// ====== CLEANUP ORPHANED DATA ======
app.post('/api/cleanup-orphans', async (req, res) => {
  try {
    const categories = await findAll(db.categories);
    const allItems = await findAll(db.items);
    let removedItems = 0;
    let removedStock = 0;
    let removedTxns = 0;

    // Get valid master category names
    const validMasters = new Set(categories.map(c => c.name));

    // Remove items whose master category no longer exists OR are uncategorised
    for (const item of allItems) {
      if (!item.category || item.category === 'General' || item.category === 'Uncategorised' || item.category === '') {
        await removeItemAndStock(item._id);
        removedItems++;
        continue;
      }
      const master = item.category.split(' › ')[0].trim();
      if (!validMasters.has(master)) {
        await removeItemAndStock(item._id);
        removedItems++;
      }
    }

    // Remove orphaned stock records (no matching item)
    const remainingItems = await findAll(db.items);
    const itemIds = new Set(remainingItems.map(i => i._id));
    const allStock = await findAll(db.stock);
    for (const s of allStock) {
      if (!itemIds.has(s.itemId)) {
        await db.stock.remove({ _id: s._id }, {});
        removedStock++;
      }
    }

    // Remove orphaned transactions (no matching item)
    const allTxns = await findAll(db.transactions);
    for (const t of allTxns) {
      if (t.itemId && !itemIds.has(t.itemId)) {
        await remove(db.transactions, { _id: t._id });
        removedTxns++;
      }
    }

    res.json({ ok: true, removedItems, removedStock, removedTxns });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== FIX SUBSUB KEYS after subcategory rename ======
app.post('/api/fix-subsub-keys', async (req, res) => {
  try {
    const categories = await findAll(db.categories);
    let fixed = 0;
    for (const cat of categories) {
      const subs = cat.subcategories || [];
      const subSubs = cat.subsubcategories || [];
      if (subSubs.length === 0) continue;
      
      // For each subsub key, check if its prefix matches an actual sub
      const fixedKeys = [];
      let changed = false;
      for (const key of subSubs) {
        const colonIdx = key.indexOf(':');
        if (colonIdx === -1) { fixedKeys.push(key); continue; }
        const prefix = key.substring(0, colonIdx);
        const suffix = key.substring(colonIdx + 1);
        
        // Check if prefix exactly matches a sub
        if (subs.includes(prefix)) {
          fixedKeys.push(key);
        } else {
          // Find closest matching sub (fuzzy)
          const match = subs.find(s => s.toLowerCase().replace(/\s+/g,'') === prefix.toLowerCase().replace(/\s+/g,''));
          if (match) {
            fixedKeys.push(match + ':' + suffix);
            changed = true;
            fixed++;
          } else {
            fixedKeys.push(key); // keep as-is
          }
        }
      }
      if (changed) {
        await update(db.categories, { _id: cat._id }, { $set: { subsubcategories: fixedKeys } });
      }
    }
    res.json({ ok: true, fixed });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== CLEANUP ITEM CATEGORIES ======
app.post('/api/cleanup-categories', async (req, res) => {
  try {
    const items = await findAll(db.items);
    const categories = await findAll(db.categories);
    let fixed = 0;

    // normalize: lowercase, remove spaces
    const norm = s => (s || '').toLowerCase().replace(/\s+/g, '');

    for (const item of items) {
      if (!item.category || item.category === 'General') continue;
      const parts = item.category.split('›').map(p => p.trim());
      const masterName = parts[0];
      const subName = parts[1];
      const subSubName = parts[2];

      // Fuzzy match master category
      const master = categories.find(c => norm(c.name) === norm(masterName));
      if (!master) continue;

      let correctPath = master.name;

      if (subName) {
        // Fuzzy match subcategory
        const matchSub = (master.subcategories || []).find(s => norm(s) === norm(subName));
        if (matchSub) {
          correctPath += ' › ' + matchSub;
          if (subSubName) {
            // Fuzzy match sub-sub
            const subSubs = (master.subsubcategories || [])
              .filter(s => s.startsWith(matchSub + ':'))
              .map(s => s.split(':')[1]);
            const matchSubSub = subSubs.find(s => norm(s) === norm(subSubName));
            if (matchSubSub) correctPath += ' › ' + matchSubSub;
            else correctPath += ' › ' + subSubName; // keep original if no match
          }
        } else {
          // Try partial match - find sub that contains subName or vice versa
          const partialSub = (master.subcategories || []).find(s =>
            norm(s).includes(norm(subName)) || norm(subName).includes(norm(s))
          );
          if (partialSub) {
            correctPath += ' › ' + partialSub;
            if (subSubName) {
              const subSubs = (master.subsubcategories || [])
                .filter(s => s.startsWith(partialSub + ':'))
                .map(s => s.split(':')[1]);
              const matchSubSub = subSubs.find(s => norm(s) === norm(subSubName)) ||
                subSubs.find(s => norm(s).includes(norm(subSubName)) || norm(subSubName).includes(norm(s)));
              if (matchSubSub) correctPath += ' › ' + matchSubSub;
              else correctPath += ' › ' + subSubName;
            }
          }
        }
      }

      if (correctPath !== item.category) {
        await update(db.items, { _id: item._id }, { $set: { category: correctPath } });
        fixed++;
        console.log(`Fixed: "${item.category}" → "${correctPath}"`);
      }
    }
    res.json({ ok: true, fixed });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== EDIT TRANSACTION ======
app.put('/api/transactions/:id', async (req, res) => {
  const { quantity, pricePerUnit, note } = req.body;
  const upd = {};
  if (quantity !== undefined) upd.quantity = quantity;
  if (pricePerUnit !== undefined) upd.pricePerUnit = pricePerUnit;
  if (note !== undefined) upd.note = note;
  await update(db.transactions, { _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});

// ====== TRANSACTIONS LOG ======
app.get('/api/transactions', async (req, res) => {
  const txns = await new Promise((res2, rej) =>
    db.transactions.find({}).sort({ createdAt: -1 }).limit(200).exec((e, d) => e ? rej(e) : res2(d))
  );
  const items = await findAll(db.items);
  const warehouses = await findAll(db.warehouses);
  const vendors = await findAll(db.vendors);
  const outlets = await findAll(db.outlets);
  const itemMap = Object.fromEntries(items.map(i => [i._id, i]));
  const whMap = Object.fromEntries(warehouses.map(w => [w._id, w]));
  const vMap = Object.fromEntries(vendors.map(v => [v._id, v]));
  const oMap = Object.fromEntries(outlets.map(o => [o._id, o]));
  const entityName = (type, id) => {
    if (!id) return '—';
    if (type === 'warehouse') return whMap[id]?.name || id;
    if (type === 'vendor') return vMap[id]?.name || id;
    if (type === 'outlet') return oMap[id]?.name || id;
    return id;
  };
  res.json(txns.map(t => ({
    ...t,
    itemName: itemMap[t.itemId]?.name || t.itemId,
    itemUnit: itemMap[t.itemId]?.unit || '',
    fromName: entityName(t.fromType, t.fromId),
    toName: entityName(t.toType, t.toId),
  })));
});

// ====== STOCK SUMMARY ======
app.get('/api/stock-summary', async (req, res) => {
  const stock = await findAll(db.stock);
  const items = await findAll(db.items);
  const warehouses = await findAll(db.warehouses);
  const itemMap = Object.fromEntries(items.map(i => [i._id, i]));
  const whMap = Object.fromEntries(warehouses.map(w => [w._id, w]));
  const warehouseIds = new Set(warehouses.map(w => w._id));
  // Group by item — only include stock from warehouses (not outlets)
  const summary = {};
  stock.forEach(s => {
    if (!warehouseIds.has(s.warehouseId)) return; // skip outlet stock
    if (!summary[s.itemId]) summary[s.itemId] = { item: itemMap[s.itemId], total: 0, byWarehouse: [] };
    summary[s.itemId].total += s.quantity;
    summary[s.itemId].byWarehouse.push({ warehouse: whMap[s.warehouseId], quantity: s.quantity });
  });
  res.json(Object.values(summary));
});

// ====== TICKETS ======
const tickets = new Datastore({ filename: './data/tickets.db', autoload: true });

app.get('/api/tickets', async (req, res) => {
  const all = await new Promise((r, j) => tickets.find({}).sort({ createdAt: -1 }).exec((e, d) => e ? j(e) : r(d)));
  const items = await findAll(db.items);
  const warehouses = await findAll(db.warehouses);
  const vendors = await findAll(db.vendors);
  const outlets = await findAll(db.outlets);
  const itemMap = Object.fromEntries(items.map(i => [i._id, i]));
  const whMap = Object.fromEntries(warehouses.map(w => [w._id, w]));
  const vMap = Object.fromEntries(vendors.map(v => [v._id, v]));
  const oMap = Object.fromEntries(outlets.map(o => [o._id, o]));
  const entityName = (type, id) => {
    if (!id) return '—';
    if (type === 'warehouse') return whMap[id]?.name || id;
    if (type === 'vendor') return vMap[id]?.name || id;
    if (type === 'outlet') return oMap[id]?.name || id;
    return id;
  };
  res.json(all.map(t => ({
    ...t,
    itemName: itemMap[t.itemId]?.name || '—',
    itemUnit: itemMap[t.itemId]?.unit || '',
    fromName: entityName(t.fromType, t.fromId),
    toName: entityName(t.toType, t.toId),
  })));
});

app.post('/api/tickets', async (req, res) => {
  const { type, fromId, fromType, toId, toType, itemId, quantity, note } = req.body;
  if (!type || !itemId || !quantity) return res.status(400).json({ error: 'type, itemId, quantity required' });
  const ticket = await new Promise((r, j) => tickets.insert({
    type, fromId, fromType, toId, toType, itemId,
    quantity: parseFloat(quantity), note: note || '',
    status: 'pending', createdAt: new Date(), updatedAt: new Date()
  }, (e, d) => e ? j(e) : r(d)));
  res.json(ticket);
});

app.put('/api/tickets/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending','approved','rejected','fulfilled'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  const ticket = await new Promise((r, j) => tickets.findOne({ _id: req.params.id }, (e, d) => e ? j(e) : r(d)));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  // If fulfilling, move the stock
  if (status === 'fulfilled' && ticket.status === 'approved') {
    if (ticket.type === 'stock_request') {
      // Warehouse → Outlet: deduct from warehouse, log transfer
      const stocks = await new Promise((r2, j2) =>
        db.stock.find({ itemId: ticket.itemId }).sort({ quantity: -1 }).exec((e, d) => e ? j2(e) : r2(d))
      );
      let remaining = ticket.quantity;
      for (const s of stocks) {
        if (remaining <= 0) break;
        const take = Math.min(s.quantity, remaining);
        await update(db.stock, { _id: s._id }, { $inc: { quantity: -take } });
        remaining -= take;
      }
      await insert(db.transactions, {
        type: 'transfer', fromId: ticket.toId, fromType: 'warehouse',
        toId: ticket.fromId, toType: 'outlet',
        itemId: ticket.itemId, quantity: ticket.quantity,
        note: `Fulfilled ticket #${ticket._id.slice(-6)}`, createdAt: new Date()
      });
    } else if (ticket.type === 'stock_return') {
      // Outlet → Warehouse: add back to warehouse
      const existing = await findOne(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId });
      if (existing) {
        await update(db.stock, { _id: existing._id }, { $inc: { quantity: ticket.quantity } });
      } else {
        await insert(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId, quantity: ticket.quantity });
      }
      await insert(db.transactions, {
        type: 'return', fromId: ticket.fromId, fromType: 'outlet',
        toId: ticket.toId, toType: 'warehouse',
        itemId: ticket.itemId, quantity: ticket.quantity,
        note: `Return ticket #${ticket._id.slice(-6)}`, createdAt: new Date()
      });
    } else if (ticket.type === 'wh_transfer') {
      // Warehouse → Warehouse
      const fromStock = await findOne(db.stock, { warehouseId: ticket.fromId, itemId: ticket.itemId });
      if (!fromStock || fromStock.quantity < ticket.quantity)
        return res.status(400).json({ error: 'Not enough stock in source warehouse' });
      await update(db.stock, { _id: fromStock._id }, { $inc: { quantity: -ticket.quantity } });
      const toStock = await findOne(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId });
      if (toStock) {
        await update(db.stock, { _id: toStock._id }, { $inc: { quantity: ticket.quantity } });
      } else {
        await insert(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId, quantity: ticket.quantity });
      }
      await insert(db.transactions, {
        type: 'wh_transfer', fromId: ticket.fromId, fromType: 'warehouse',
        toId: ticket.toId, toType: 'warehouse',
        itemId: ticket.itemId, quantity: ticket.quantity,
        note: `WH transfer ticket #${ticket._id.slice(-6)}`, createdAt: new Date()
      });
    } else if (ticket.type === 'restock_request') {
      // Vendor → Warehouse: add stock
      const existing = await findOne(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId });
      if (existing) {
        await update(db.stock, { _id: existing._id }, { $inc: { quantity: ticket.quantity } });
      } else {
        await insert(db.stock, { warehouseId: ticket.toId, itemId: ticket.itemId, quantity: ticket.quantity });
      }
      await insert(db.transactions, {
        type: 'purchase', fromId: ticket.fromId, fromType: 'vendor',
        toId: ticket.toId, toType: 'warehouse',
        itemId: ticket.itemId, quantity: ticket.quantity,
        note: `Restock ticket #${ticket._id.slice(-6)}`, createdAt: new Date()
      });
    }
  }

  await new Promise((r, j) => tickets.update({ _id: req.params.id }, { $set: { status, updatedAt: new Date() } }, {}, (e) => e ? j(e) : r()));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
// ====== DISPATCHES ======
app.get('/api/dispatches', async (req, res) => {
  const dispatches = await findAll(db.dispatches);
  dispatches.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(dispatches);
});

app.post('/api/dispatches', async (req, res) => {
  const { fromWarehouseId, fromWarehouseName, toOutletId, toOutletName, items, note } = req.body;
  const refNo = 'DSP-' + Date.now().toString().slice(-6);
  const dispatch = await insert(db.dispatches, {
    refNo, fromWarehouseId, fromWarehouseName, toOutletId, toOutletName,
    items, note: note || '', status: 'dispatched',
    createdAt: new Date(), dispatchedAt: new Date(), receivedAt: null, photoUrl: null
  });
  // Deduct stock from warehouse immediately on dispatch
  for (const item of items) {
    const s = await findOne(db.stock, { warehouseId: fromWarehouseId, itemId: item.itemId });
    if (s) {
      const newQty = Math.max(0, s.quantity - item.quantity);
      await update(db.stock, { _id: s._id }, { $set: { quantity: newQty } });
    }
    await insert(db.transactions, {
      type: 'transfer', itemId: item.itemId, itemName: item.itemName, itemUnit: item.itemUnit,
      fromId: fromWarehouseId, fromName: fromWarehouseName,
      toId: toOutletId, toName: toOutletName,
      quantity: item.quantity, note: 'Dispatch ' + refNo, createdAt: new Date()
    });
  }
  res.json(dispatch);
});

app.put('/api/dispatches/:id/receive', async (req, res) => {
  const { photoUrl } = req.body;
  await update(db.dispatches, { _id: req.params.id }, { $set: { status: 'received', receivedAt: new Date(), photoUrl: photoUrl || null } });
  res.json({ ok: true });
});

// ====== GATE PASSES ======
app.delete('/api/gatepasses/all', async (req, res) => {
  try {
    await db.gatepasses.remove({}, { multi: true });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gatepasses', async (req, res) => {
  const passes = await findAll(db.gatepasses);
  passes.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(passes);
});

app.post('/api/gatepasses', async (req, res) => {
  try {
    const { fromWarehouseId, fromWarehouseName, toOutletId, toOutletName, items, driverName, vehicleNo, note } = req.body;
    if (!fromWarehouseId || !toOutletId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: fromWarehouseId, toOutletId, items' });
    }
    const refNo = 'GP-' + Date.now().toString().slice(-6);
    const pass = await insert(db.gatepasses, {
      refNo, fromWarehouseId, fromWarehouseName, toOutletId, toOutletName,
      items, driverName: driverName || '', vehicleNo: vehicleNo || '', note: note || '',
      status: 'pending', createdAt: new Date(),
      dispatchedAt: null, receivedAt: null, photoUrl: null
    });
    res.json(pass);
  } catch(e) {
    console.error('Gatepass create error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Warehouse manager approves dispatch — deducts from warehouse stock
app.put('/api/gatepasses/:id/dispatch', async (req, res) => {
  const pass = await findOne(db.gatepasses, { _id: req.params.id });
  if (!pass) return res.status(404).json({ error: 'Not found' });
  if (pass.status !== 'pending') return res.status(400).json({ error: 'Already dispatched' });
  for (const item of pass.items) {
    const s = await findOne(db.stock, { warehouseId: pass.fromWarehouseId, itemId: item.itemId });
    if (s) {
      const newQty = Math.max(0, s.quantity - item.quantity);
      await update(db.stock, { _id: s._id }, { $set: { quantity: newQty } });
    }
    await insert(db.transactions, {
      type: 'transfer', itemId: item.itemId, itemName: item.itemName, itemUnit: item.itemUnit,
      fromId: pass.fromWarehouseId, fromName: pass.fromWarehouseName,
      toId: pass.toOutletId, toName: pass.toOutletName,
      quantity: item.quantity, note: 'Dispatched - Gate Pass ' + pass.refNo, createdAt: new Date()
    });
  }
  await update(db.gatepasses, { _id: req.params.id }, { $set: { status: 'dispatched', dispatchedAt: new Date() } });
  res.json({ ok: true });
});

// Outlet manager approves receipt — records transaction only (outlets tracked separately)
app.put('/api/gatepasses/:id/receive', async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const pass = await findOne(db.gatepasses, { _id: req.params.id });
    if (!pass) return res.status(404).json({ error: 'Not found' });
    if (pass.status !== 'dispatched') return res.status(400).json({ error: 'Not dispatched yet' });
    for (const item of pass.items) {
      // Record transfer transaction (stock already deducted on dispatch)
      await insert(db.transactions, {
        type: 'received', itemId: item.itemId, itemName: item.itemName, itemUnit: item.itemUnit,
        fromId: pass.fromWarehouseId, fromName: pass.fromWarehouseName,
        toId: pass.toOutletId, toName: pass.toOutletName,
        quantity: item.quantity, note: 'Received at outlet - Gate Pass ' + pass.refNo, createdAt: new Date()
      });
    }
    await update(db.gatepasses, { _id: req.params.id }, { $set: { status: 'received', receivedAt: new Date(), photoUrl: photoUrl || null } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/gatepasses/:id/close', async (req, res) => {
  const { photoUrl } = req.body;
  await update(db.gatepasses, { _id: req.params.id }, { $set: { status: 'received', receivedAt: new Date(), photoUrl: photoUrl || null } });
  res.json({ ok: true });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.use(express.static(path.join(__dirname, 'frontend', 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
})
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
