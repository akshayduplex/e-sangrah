// models/MenuAssignment.js
const mongoose = require('mongoose');

const menuAssignmentSchema = new mongoose.Schema(
    {
        designation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Designation',
            required: true,
        },
        menu_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu',
            required: true,
        },
        assigned_date: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique assignment
menuAssignmentSchema.index({ designation_id: 1, menu_id: 1 }, { unique: true });


module.exports = mongoose.model('MenuAssignment', menuAssignmentSchema);