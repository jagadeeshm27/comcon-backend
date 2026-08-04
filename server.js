import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import communityRoutes from './src/routes/communityRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// Slows down brute-force login/signup attempts specifically.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/communities', communityRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ⚠️ Defaults to 5001 to match API_BASE_URL in login.html/app.js.
// If you set PORT in .env, update those two files to match.
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 ComCon API running on http://localhost:${PORT}`));
});