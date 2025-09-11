import express from "express";
import * as permissionController from "../../controllers/permissions/permisssions.js";

import {
    getAddMenu,
    getEditMenu,
    getMenuList
} from "../../controllers/menuController.js";

import {
    assignMenusToDesignation,
    getAssignedMenus,
    getAssignMenuPage
} from "../../controllers/assignMenuController.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import Designation from "../../models/Designation.js";
import Project from "../../models/Project.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";

const router = express.Router();

// --- Home / General Pages ---
router.get("/", (req, res) => {
    res.render("pages/home", { title: "E-Sangrah - Home" });
});

// router.get("/permissions", authenticate, (req, res) => {
//     res.render("pages/permissions", { title: "E-Sangrah - About" });
// });

router.get("/login", (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
});

router.get("/register", (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
});

router.get("/forgot-password", (req, res) => {
    res.render("pages/forgot-password", {
        otpSent: false,
        otpVerified: false,
        email: "",
        message: null,
        error: null
    });
});

// --- Settings & Permissions ---
router.get("/settings", authenticate, permissionController.getSettings);
router.get("/projects/project-list", async (req, res) => {
    const designations = await Designation.find({ status: "Active" }).sort({ name: 1 });
    res.render("pages/projects/projectList", { title: "E-Sangrah - Projects-List", designations: designations });
});
router.get("/projects/:id/project-details", async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch project with populated references
        const project = await Project.findById(id)
            .populate("department", "name")       // only bring department name
            .populate("projectManager", "name");  // only bring manager name

        if (!project) {
            return res.render("pages/projects/project-details", {
                title: "E-Sangrah - Project-Details",
                project: null,
                error: "Project not found."
            });
        }

        res.render("pages/projects/project-details", {
            title: "E-Sangrah - Project-Details",
            project: project.toObject(),
            user: req.user
        });

    } catch (error) {
        console.error("Error fetching project details:", error);
        res.render("pages/projects/project-details", {
            title: "E-Sangrah - Project-Details",
            project: null,
            error: "Unable to load project details."
        });
    }
});
// GET edit page
router.get('/projects/edit/:id', async (req, res) => {
    const projectId = req.params.id;
    try {
        const project = await Project.findById(projectId).populate('department projectManager donor vendor');
        if (!project) {
            return res.status(404).send("Project not found");
        }

        const users = await User.find({}, 'name');           // get all users
        const departments = await Department.find({ status: "Active" }, 'name'); // get all departments

        res.render('pages/projects/editProject', { project, users, departments });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// --- Projects ---
router.get("/projects", authenticate, async (req, res) => {
    try {
        // const projects = await ProjectCl.find({}).lean();
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(),
            // projects
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Unable to load projects");
        res.render("pages/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(),
            projects: []
        });
    }
});

// --- Dashboard ---
router.get("/dashboard", authenticate, async (req, res) => {
    try {
        res.render("pages/adminDashboard", { user: req.user });
    } catch (error) {
        console.error("Dashboard render error:", error);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard"
        });
    }
});

// --- Menu Assignment Pages ---
router.get("/assign-menu", authenticate, getAssignMenuPage);
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusToDesignation);

// --- Menu Pages ---
router.get("/menu/list", authenticate, getMenuList);
router.get("/menu/add", authenticate, getAddMenu);
router.get("/menu/edit/:id", authenticate, getEditMenu);

// Export router as default
export default router;
