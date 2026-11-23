const path = require('path');
const express = require('express');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// Limite maior para suportar imagens em base64 no cadastro/edição de produtos
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use(userRoutes);
app.use(categoryRoutes);
app.use(productRoutes);

module.exports = app;