const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function currency(n) {
  return `$${(n || 0).toFixed(2)}`;
}

async function generateInvoice(order) {
  // Load settings for business info and tax
  let settings = {};
  try {
    const settingsRoute = require('../routes/settings');
    if (settingsRoute && settingsRoute.__getSettings) {
      settings = settingsRoute.__getSettings();
    }
  } catch (_) {}
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const invoicesDir = path.join(uploadsDir, 'invoices');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const filePath = path.join(invoicesDir, `${order._id}.pdf`);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc
      .fontSize(20)
      .text('Invoice', { align: 'right' })
      .moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Order #${order._id}` , { align: 'right' })
      .text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}`, { align: 'right' })
      .moveDown(1);

    // Seller info
    doc
      .fontSize(12)
      .text(settings.storeName || 'Store', 50, 80)
      .fontSize(10)
      .text(settings.storeEmail || '')
      .text(settings.storeAddress || '')
      .text(settings.storePhone || '')
      .text(`Tax No: ${settings.taxNumber || '-'}`)
      .moveDown(1);

    // Customer info
    const userName = order.user?.name || 'Customer';
    const userEmail = order.user?.email || '';
    const shipping = typeof order.shipping === 'string' ? order.shipping : (order.shipping?.address || '');
    doc
      .fontSize(12)
      .text('Bill To:')
      .fontSize(10)
      .text(userName)
      .text(userEmail)
      .text(shipping)
      .moveDown(1);

    // Items table
    const tableTop = doc.y + 10;
    const itemX = 50, qtyX = 320, priceX = 380, totalX = 460;

    doc.fontSize(10).text('Item', itemX, tableTop, { bold: true })
      .text('Qty', qtyX, tableTop)
      .text('Price', priceX, tableTop)
      .text('Total', totalX, tableTop);

    doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

    let y = tableTop + 20;
    (order.items || []).forEach((it) => {
      const title = it.title || it.product?.name || String(it.product || 'Item');
      const qty = it.quantity || 1;
      const price = it.price || 0;
      const lineTotal = qty * price;
      doc.text(title, itemX, y, { width: 250 })
        .text(qty, qtyX, y)
        .text(currency(price), priceX, y)
        .text(currency(lineTotal), totalX, y);
      y += 18;
    });

    doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
    y += 12;
    const subtotal = Number(order.subtotal || 0);
    const shippingCost = Number(order.shippingCost || 0);
    const taxAmount = Number(order.taxAmount || 0);
    const total = Number(order.amount || subtotal + shippingCost + taxAmount);
    doc.fontSize(10)
      .text('Subtotal:', priceX, y).text(currency(subtotal), totalX, y); y += 16;
    doc.text('Shipping:', priceX, y).text(currency(shippingCost), totalX, y); y += 16;
    doc.text(`Tax (${order.taxPercent || 0}%):`, priceX, y).text(currency(taxAmount), totalX, y); y += 16;
    doc.fontSize(12).text('Total:', priceX, y).text(currency(total), totalX, y);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Return relative URL served by express static
  const urlPath = `/uploads/invoices/${order._id}.pdf`;
  return { filePath, urlPath };
}

module.exports = { generateInvoice };
