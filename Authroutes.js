import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function signAccessToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are all required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const existing = await User.findOne({
            $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
        });
        if (existing) {
            return res.status(409).json({ error: 'That username or email is already taken.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ username, email, passwordHash });

        const token = signAccessToken(user._id);
        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = signAccessToken(user._id);
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// GET /api/auth/me — protected route, proves the token system works end to end
router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
});

// POST /api/auth/ping — heartbeat the frontend calls every ~30s while the
// app is open. This is what "active right now" is actually measured from.
router.post('/ping', requireAuth, async (req, res) => {
    await User.findByIdAndUpdate(req.userId, { lastActiveAt: new Date() });
    res.json({ ok: true });
});

// GET /api/auth/online-count — count of users whose last heartbeat was
// within the last 2 minutes. This is polling-based "near real-time," not
// a live push socket — good enough for now, upgradeable to Socket.io later
// if you want an instant push instead of a ~15s-delayed poll.
router.get('/online-count', async (req, res) => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const count = await User.countDocuments({ lastActiveAt: { $gte: twoMinutesAgo } });
    res.json({ count });
});

export default router;