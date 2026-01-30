require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const billRoutes = require('./routes/bills');
const shareRoutes = require('./routes/share');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Public routes (no auth)
app.use('/share', shareRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protected routes (require auth)
app.use('/', authMiddleware);
app.use('/', billRoutes);
app.use('/api', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Split app running on port ${PORT}`);
});
