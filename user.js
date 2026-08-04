import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 24
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    avatarConfig: {
        character: { type: String, default: null },
        outfit: { type: String, default: null },
        glasses: { type: String, default: null }
    },
    status: {
        type: String,
        enum: ['online', 'offline'],
        default: 'online'
    },
    selfieVerified: {
        type: Boolean,
        default: false
    },
    // Updated by the /ping heartbeat while the user has the app open —
    // this is what powers the real "members active right now" count.
    lastActiveAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export default mongoose.model('User', userSchema);