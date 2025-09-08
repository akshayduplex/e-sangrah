// import mongoose from "mongoose";


// const menuSchema = new mongoose.Schema(
//     {
//         master_id: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'Menu',
//             default: null,
//         },
//         menu_id: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'Menu',
//             default: null,
//         },
//         type: {
//             type: String,
//             enum: ['Master', 'Menu', 'Submenu'],
//             required: true,
//         },
//         name: {
//             type: String,
//             required: true,
//             trim: true,
//         },
//         icon: {
//             type: String,
//             trim: true,
//         },
//         url: {
//             type: String,
//             trim: true,
//         },
//         priority: {
//             type: Number,
//             required: true,
//             default: 1,
//         },
//         is_show: {
//             type: Boolean,
//             default: true,
//         },
//         icon_code: {
//             type: String,
//             trim: true,
//         },
//     },
//     {
//         timestamps: {
//             createdAt: 'add_date',
//             updatedAt: 'update_date',
//         },
//     }
// );

// // Indexes for performance
// menuSchema.index({ master_id: 1, type: 1 });
// menuSchema.index({ priority: 1 });

// const Menu = mongoose.model('Menu', menuSchema);

// export default Menu;

import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

const menuSchema = new Schema({
    type: {
        type: String,
        enum: ['Master', 'Menu', 'Submenu'],
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
        min: 1
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
                if (this.type === 'Submenu') return !!value;
                return true;
            },
            message: 'Master ID is required for Submenu type'
        }
    },
    menu_id: {
        type: Types.ObjectId,
        ref: 'Menu',
        default: null
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

// Pre-save validation
menuSchema.pre('save', function (next) {
    if (this.type === 'Master' && (this.master_id || this.menu_id)) {
        return next(new Error('Master menus cannot have parent references'));
    }

    if (this.type === 'Menu' && this.master_id && !this.menu_id) {
        return next(new Error('Menu should have either master_id or menu_id, not both'));
    }

    next();
});

export default model('Menu', menuSchema);
