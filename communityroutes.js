import express from 'express';
import community from './community.js';
import user from './user.js';
import { requireauth } from './auth.js';

const router = express.Router();

async function getUsername(userId) {
    const user = await User.findById(userId).select('username');
    return user ? user.username : null;
}

// GET /api/communities/mine
// Ensures the shared default "ComCon" community exists, joins the caller
// to it if they're not already a member, then returns every community
// the caller belongs to. This is what fixes communities disappearing
// after logging back in — they were never saved anywhere before.
router.get('/mine', requireAuth, async (req, res) => {
    try {
        const username = await getUsername(req.userId);
        if (!username) return res.status(404).json({ error: 'User not found.' });

        let defaultCommunity = await Community.findOne({ isDefault: true });
        if (!defaultCommunity) {
            defaultCommunity = await Community.create({
                name: 'ComCon',
                img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop',
                joinType: 'auto',
                supremeLeader: username,
                commandors: [],
                members: [username],
                slots: [
                    { id: 'slot-demo-1', title: 'Squad Match 1', time: '9:00 PM', capacity: 4, participants: ['random1', 'random2'] }
                ],
                chatMessages: [
                    { sender: 'them', name: 'dude', tag: 'your first friend on ComCon', avatar: '🤙', text: "Hey hey! Hope you find your community or friends you're looking for 🙌" }
                ],
                // "dude" only ever lives in this one default community —
                // never copied into communities users create themselves.
                friends: [{ name: 'dude', avatar: '🤙', closeFriend: false }],
                isDefault: true
            });
        } else if (!defaultCommunity.members.includes(username)) {
            defaultCommunity.members.push(username);
            await defaultCommunity.save();
        }

        const communities = await Community.find({ members: username }).sort({ createdAt: 1 });
        res.json({ communities });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not load communities.' });
    }
});

// POST /api/communities — create a new community owned by the caller.
// Deliberately starts with empty friends/slots/chat — no default-friend
// leakage into communities the user creates themselves.
router.post('/', requireAuth, async (req, res) => {
    try {
        const username = await getUsername(req.userId);
        if (!username) return res.status(404).json({ error: 'User not found.' });

        const { name, img, joinType } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Community name is required.' });
        }

        const community = await Community.create({
            name: name.trim(),
            img: img || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=100&h=100&fit=crop',
            joinType: joinType === 'manual' ? 'manual' : 'auto',
            supremeLeader: username,
            commandors: [],
            members: [username],
            slots: [],
            chatMessages: [],
            friends: [],
            isDefault: false
        });

        res.status(201).json({ community });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not create community.' });
    }
});

// DELETE /api/communities/:id — only the Supreme Leader can delete.
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const username = await getUsername(req.userId);
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: 'Community not found.' });
        if (community.supremeLeader !== username) {
            return res.status(403).json({ error: 'Only the Supreme Leader can delete this community.' });
        }
        await community.deleteOne();
        res.json({ deleted: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not delete community.' });
    }
});

// PATCH /api/communities/:id
// Simplified sync endpoint: the frontend keeps mutating its local copy
// optimistically (claiming a slot, sending a message, starring a friend)
// and calls this afterward with whichever sub-arrays changed, so state
// actually survives a refresh/relogin instead of living only in memory.
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ error: 'Community not found.' });

        const { slots, chatMessages, friends, commandors } = req.body;
        if (slots) community.slots = slots;
        if (chatMessages) community.chatMessages = chatMessages;
        if (friends) community.friends = friends;
        if (commandors) community.commandors = commandors;

        await community.save();
        res.json({ community });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Could not update community.' });
    }
});

export default router;
