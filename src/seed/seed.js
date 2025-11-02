require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');

const run = async () => {
  await connectDB();
  try {
    // clear
    await User.deleteMany({});
    await Product.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const admin = await User.create({ name: 'Admin User', email: 'admin@example.com', password: adminPass, role: 'admin' });

    const p1 = await Product.create({ name: 'Headphone', shortDescription: 'Lorem ipsum dolor sit', description: 'Full desc', price: 120, images: ['https://vetra.laborasyon.com/assets/images/products/1.jpg'], stock: 10 });
    const p2 = await Product.create({ name: 'Shoe', shortDescription: 'Lorem ipsum', description: 'Full desc', price: 320, images: ['https://vetra.laborasyon.com/assets/images/products/2.jpg'], stock: 54 });
    const p3 = await Product.create({ name: 'Digital Clock', shortDescription: 'Lorem ipsum', description: 'Full desc', price: 230, images: ['https://vetra.laborasyon.com/assets/images/products/3.jpg'], stock: 0 });

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
