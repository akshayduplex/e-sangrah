import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema(
    {
        master_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu',
            default: null,
        },
        menu_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu',
            default: null,
        },
        type: {
            type: String,
            enum: ['Master', 'Menu', 'Submenu'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        icon: {
            type: String,
            trim: true,
        },
        url: {
            type: String,
            trim: true,
        },
        priority: {
            type: Number,
            required: true,
            default: 1,
        },
        is_show: {
            type: Boolean,
            default: true,
        },
        icon_code: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: {
            createdAt: 'add_date',
            updatedAt: 'update_date',
        },
    }
);

// Indexes for performance
menuSchema.index({ master_id: 1, type: 1 });
menuSchema.index({ priority: 1 });

const Menu = mongoose.model('Menu', menuSchema);

export default Menu;
