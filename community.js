import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
    id: String,
    title: String,
    time: String,
    capacity: Number,
    participants: [String]
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
    sender: String,   // 'them' | 'you'
    name: String,
    tag: String,
    avatar: String,
    text: String,
    type: { type: String, enum: ['text', 'comoji'], default: 'text' },
    comojiId: String   // set when type === 'comoji', matches an id in COMOJIS on the frontend
}, { timestamps: true });

const friendSchema = new mongoose.Schema({
    name: String,
    avatar: String,
    closeFriend: { type: Boolean, default: false }
}, { _id: false });

const communitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    img: String,
    joinType: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    supremeLeader: { type: String, required: true }, // username
    commandors: [String],                            // usernames
    members: [String],                                // usernames
    slots: [slotSchema],
    chatMessages: [chatMessageSchema],
    friends: [friendSchema],
    // There is exactly one isDefault:true community — the shared
    // "ComCon" starter community every user auto-joins on first load.
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Community', communitySchema);