const express = require('express');
require('dotenv').config();
require('express-async-errors');
const connectDB = require('./db/connectDB');
const notFoundMiddleware = require('./middleware/notFound');
const errorMiddleware = require('./middleware/error');
const adminRoutes = require('./routes/admin');
const refundRoutes = require('./routes/refund');
const userRoutes = require('./routes/user');
const payoutRoutes=require('./routes/payout')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const axios = require('axios');

const SELF_URL = process.env.SELF;

const app = express();
const port = process.env.PORT || 5000;

// ✅ Tell Express we’re behind a proxy (Render/NGINX) so secure cookies work
app.set('trust proxy', 1);

// ✅ Core middleware first
// app.use(bodyParser.json());             // ❌ remove: redundant
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ✅ CORS: allow your exact frontend origin and credentials
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500','https://www.auravestfinedge.com','https://auravestfinedge.com'], // allow both to avoid IP/host mismatch pain
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// (Optional) Let cors handle OPTIONS; your explicit app.options is OK to remove
// app.options('*', cors({ ...same config... }));

// Static files if you serve any
app.use(express.static('public'));

// ✅ Routes
app.use('/api/admin', adminRoutes);
app.use('/api/refund', refundRoutes);
app.use('/api/user', userRoutes);
app.use(payoutRoutes)
// 404 + error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// (Optional) health endpoint used by self-ping
app.get('/healthz', (req, res) => res.json({ ok: true }));

// 🔁 Self-ping — NOTE: comment says every 5 min; this is every 1 min
cron.schedule('*/1 * * * *', async () => {
  try {
    await axios.get(SELF_URL || 'http://localhost:' + port + '/healthz');
    console.log(`🟢 Self-ping @ ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`🔴 Self-ping failed @ ${new Date().toISOString()}`, err.message);
  }
});

// ✅ Connect DB then start server (after all middleware/routes are defined)
async function start() {
  try {
    await connectDB(process.env.MONGOOSE_URI);
    app.listen(port, () => console.log(`DB connected. App running on :${port}`));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}
start();
