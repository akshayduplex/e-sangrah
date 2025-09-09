import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const menuSchema = new Schema({
    type: {
        type: String,
        enum: ['Master', 'Menu'], // Only 2 levels
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    icon: {
        type: String,
        trim: true,
        default: ''
    },
    icon_code: {
        type: String,
        trim: true,
        default: ''
    },
    url: {
        type: String,
        trim: true,
        default: '#'
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
                // Menus must have a master_id
                if (this.type === 'Menu') return !!value;
                // Masters must NOT have a master_id
                if (this.type === 'Master') return !value;
                return true;
            },
            message: 'Menu must belong to a Master, Master cannot have a parent'
        }
    },
    add_date: {
        type: Date,
        default: Date.now
    },
    modified_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'add_date', updatedAt: 'modified_date' }
});

// Indexes
menuSchema.index({ type: 1 });
menuSchema.index({ priority: 1 });
menuSchema.index({ master_id: 1 });
menuSchema.index({ is_show: 1 });

// Pre-save rules
menuSchema.pre('save', function (next) {
    if (this.type === 'Master' && this.master_id) {
        return next(new Error('Master cannot have a parent master_id'));
    }

    if (this.type === 'Menu' && !this.master_id) {
        return next(new Error('Menu must have a parent master_id'));
    }

    next();
});

export default model('Menu', menuSchema);
