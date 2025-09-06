const mongoose = require('mongoose');

const employeeList = new mongoose.Schema({
    emp_id: {
        type: mongoose.Types.ObjectId
    },
    emp_code: {
        type: String
    },
    emp_name: {
        type: String
    },
    emp_email: {
        type: String
    }
});

const ProjectSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Types.ObjectId
    },
    title: {
        type: String,
        trim: true,
        index: true
    },
    logo: {
        type: String,
        trim: true
    },
    in_charge_list: [employeeList],
    manager_list: [employeeList],
    start_date: {
        type: Date,
        default: Date.now
    },
    end_date: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Closed'],
        default: 'Active'
    },
    add_date: {
        type: Date,
        default: Date.now
    },
    updated_on: {
        type: Date,
        default: Date.now
    }
});

// Create index for title field
ProjectSchema.index({ title: 1 });

const ProjectCl = mongoose.model('dt_projects', ProjectSchema);
module.exports = ProjectCl;