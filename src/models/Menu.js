import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const menuSchema = new Schema({
    type: {
        type: String,
        enum: ['Menu', 'SubMenu'],
        default: 'Menu'
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    icon_code: {
        type: String,
        trim: true,
        default: ''
    },
    url: {
        type: String,
        trim: true,
        default: '#',
        validate: {
            validator: function (v) {
                // Prevent null, empty, or whitespace-only URLs
                return v != null && v.trim() !== '';
            },
            message: 'URL cannot be null, empty, or only spaces'
        }
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    is_show: {
        type: Boolean,
        default: true
    },
    master_id: {
        type: Types.ObjectId,
        ref: 'Menu',
        default: null,
        validate: {
            validator: function (value) {
                if (this.type === 'Menu') return !!value;
                if (this.type === 'SubMenu') return !value;
                return true;
            },
            message: 'SubMenu must belong to a Menu, Menu cannot have a parent'
        }
    },
    added_by: {
        user_id: { type: Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, required: true }
    },
    updated_by: {
        user_id: { type: Types.ObjectId, ref: 'User' },
        name: { type: String },
        email: { type: String }
    }
}, {
    timestamps: { createdAt: 'add_date', updatedAt: 'updated_date' }
});

// Regular indexes
menuSchema.index({ type: 1 });
menuSchema.index({ priority: 1 });
menuSchema.index({ master_id: 1 });
menuSchema.index({ is_show: 1 });

// Partial unique indexes for non-Masters
menuSchema.index(
    { url: 1 },
    { unique: true, partialFilterExpression: { type: 'Menu' }, name: 'url_menu_unique' }
);
menuSchema.index(
    { url: 1 },
    { unique: true, partialFilterExpression: { type: 'SubMenu' }, name: 'url_sub_menu_unique' }
);

// Pre-save validation
menuSchema.pre('save', function (next) {
    if (this.type === 'Menu' && this.master_id) {
        return next(new Error('Master cannot have a parent master_id'));
    }
    if (this.type === 'SubMenu' && !this.master_id) {
        return next(new Error('Menu must have a parent master_id'));
    }
    next();
});

export default model('Menu', menuSchema);
