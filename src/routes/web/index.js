// routes/index.js
import express from "express";

// --- Controllers ---
import {
    getAddMenu,
    getEditMenu,
    getMenuList,
    getAssignedMenus,
    getAssignMenuPage,
    assignMenusToDesignation
} from "../../controllers/permissions/permisssions.js";

// --- Validators ---
import {
    assignMenusValidator,
    unAssignMenusValidator,

    getAssignedMenusValidator,
    getMenuListValidator,
    menuIdParamValidator
} from "../../middlewares/validation/permissionValidator.js";

// --- Middlewares ---
import { authenticate } from "../../middlewares/authMiddleware.js";
import checkPermissions from "../../middlewares/checkPermission.js";

// --- Models ---
import Designation from "../../models/Designation.js";
import Project from "../../models/Project.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";

const router = express.Router();

/* ===========================
   Home & Authentication
=========================== */
router.get("/", authenticate, (req, res) => {
    res.render("pages/home", { title: "E-Sangrah - Home" });
});

router.get("/login", (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
});

router.get("/register", (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
});
router.get("/user-register", async (req, res) => {
    const departments = await Department.find({ status: "Active" }, "name").lean();
    const designations = await Designation.find({ status: "Active" })
        .sort({ name: 1 })
        .lean();
    res.render("pages/user-registration", { title: "E-Sangrah - Register", departments, designations });
});
router.get("/donor-register", (req, res) => {
    res.render("pages/donor-registration", { title: "E-Sangrah - Register" });
});
router.get("/vendor-register", (req, res) => {
    res.render("pages/vendor-registration", { title: "E-Sangrah - Register" });
});
router.get("/forgot-password", authenticate, (req, res) => {
    res.render("pages/forgot-password", {
        otpSent: false,
        otpVerified: false,
        email: "",
        message: null,
        error: null
    });
});

/* ===========================
   Projects
=========================== */

// List projects page (with designations for filtering)
router.get("/projects/project-list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/projects/projectList", {
            title: "E-Sangrah - Projects-List",
            designations
        });
    } catch (err) {
        console.error("Error loading project list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load project list"
        });
    }
});

// Single project details (view + edit mode in one page)
router.get("/projects/:id/project-details", authenticate, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate("department", "name")
            .populate("projectManager", "name")
            .populate("donor", "name")
            .populate("vendor", "name")
            .lean();

        if (!project) {
            return res.render("pages/projects/project-details", {
                title: "E-Sangrah - Project-Details",
                project: null,
                error: "Project not found."
            });
        }

        const users = await User.find({}, "name").lean();
        const departments = await Department.find({ status: "Active" }, "name").lean();

        res.render("pages/projects/project-details", {
            title: "E-Sangrah - Project-Details",
            project,
            users,
            departments,
            user: req.user,
            formatDateDDMMYYYY: (date) => {
                if (!date) return "N/A";
                const d = new Date(date);
                return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")
                    }/${d.getFullYear()}`;
            }
        });
    } catch (err) {
        console.error("Error fetching project details:", err);
        res.status(500).render("pages/projects/project-details", {
            title: "E-Sangrah - Project-Details",
            project: null,
            error: "Unable to load project details."
        });
    }
});

// Projects main landing page
router.get("/projects", authenticate, async (req, res) => {
    try {
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash()
        });
    } catch (err) {
        console.error("Error loading projects page:", err);
        req.flash("error", "Unable to load projects");
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(),
            projects: []
        });
    }
});
router.get("/projects/add", authenticate, async (req, res) => {
    try {
        const users = await User.find({}, "name").lean();
        const departments = await Department.find({ status: "Active" }, "name").lean();

        res.render("pages/projects/addProject", {
            title: "E-Sangrah - Add-Project",
            users,
            departments,
            user: req.user,
            formatDateDDMMYYYY: (date) => {
                if (!date) return "N/A";
                const d = new Date(date);
                return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")
                    }/${d.getFullYear()}`;
            }
        });
    } catch (err) {
        console.error("Error fetching project details:", err);
        res.status(500).render("pages/projects/addProject", {
            title: "E-Sangrah - Add-Project",
            project: null,
            error: "Unable to load project details."
        });
    }
});
/* ===========================
   Dashboard
=========================== */
router.get("/dashboard", authenticate, async (req, res) => {
    try {
        res.render("pages/dashboard", { user: req.user });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard"
        });
    }
});

/* ===========================
   Menu Assignment
=========================== */
router.get("/assign-menu", authenticate, getAssignMenuPage);
router.get("/assign-menu/designation/:designation_id/menus", authenticate, getAssignedMenusValidator, getAssignedMenus);
router.post("/assign-menu/assign", authenticate, assignMenusValidator, assignMenusToDesignation);

/* ===========================
   Menu Management
=========================== */
router.get("/menu/list", authenticate, getMenuListValidator, getMenuList);
router.get("/menu/add", authenticate, getAddMenu);
router.get("/menu/add/:id", authenticate, menuIdParamValidator, getEditMenu);

export default router;
