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
    res.render("pages/temp", { title: "E-Sangrah - Home" });
});

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
router.get("/reset-password", authenticate, (req, res) => {
    console.log("User:", req.user.email); // Check if user exists
    res.render("pages/reset-password", {
        otpSent: false,
        user: req.user,
        otpVerified: false,
        email: req.user ? req.user.email : "",
        message: null,
        error: null
    });
});
router.get("/users-list", async (req, res) => {
    res.render("pages/register/user-listing", { title: "E-Sangrah - Users-List" });
});
router.get("/user-register", async (req, res) => {
    const departments = await Department.find({ status: "Active" }, "name").lean();
    const designations = await Designation.find({ status: "Active" })
        .sort({ name: 1 })
        .lean();
    res.render("pages/register/user-registration", { title: "E-Sangrah - Register", departments, designations });
});

router.get("/user-edit/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        if (!user) return res.status(404).send("User not found");

        res.render("pages/register/user-edit", {
            title: "E-Sangrah - Edit User",
            user,
            departments,
            designations
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

/**
 * Donor and Vendor Registration Pages
 */
router.get("/donor-register", async (req, res) => {
    try {
        const id = req.query.id;
        let donor = null;
        if (id) {
            donor = await User.findById(id).lean();
        }
        res.render("pages/donor-registration", {
            title: donor ? "E-Sangrah - Edit Donor" : "E-Sangrah - Register",
            donor,
            isEdit: Boolean(donor)
        });
    } catch (err) {
        console.error("Error loading donor register page:", err);
        res.render("pages/donor-registration", { title: "E-Sangrah - Register", donor: null, isEdit: false });
    }
});

router.get("/donor-list", async (req, res) => {
    try {
        const donors = await User.find({ profile_type: "donor" }).lean();
        res.render("pages/donor-listing", { title: "E-Sangrah - Donor List", donors });
    } catch (err) {
        console.error("Error fetching donor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load donor list" });
    }
});

router.get("/vendor-register", async (req, res) => {
    try {
        const id = req.query.id;
        let vendor = null;
        if (id) {
            vendor = await User.findById(id).lean();
        }
        res.render("pages/vendor-registration", {
            title: vendor ? "E-Sangrah - Edit Vendor" : "E-Sangrah - Register",
            vendor,
            isEdit: Boolean(vendor)
        });
    } catch (err) {
        console.error("Error loading vendor register page:", err);
        res.render("pages/vendor-registration", { title: "E-Sangrah - Register", vendor: null, isEdit: false });
    }
});

router.get("/vendor-list", async (req, res) => {
    try {
        const vendors = await User.find({ profile_type: "vendor" }).lean();
        res.render("pages/vendor-registration-list", { title: "E-Sangrah - Vendor List", vendors });
    } catch (err) {
        console.error("Error fetching vendor list:", err);
        res.status(500).render("pages/error", { title: "Error", message: "Unable to load vendor list" });
    }
});



router.get("/upload-folder", (req, res) => {
    res.render("pages/upload-folder", { title: "E-Sangrah - Upload-Folder" });
});

router.get("/notifications", (req, res) => {
    res.render("pages/notifications", { title: "E-Sangrah - Notifications" });
});

router.get("/my-profile", authenticate, async (req, res) => {
    try {
        const userId = req.session.user._id;  // session user ID
        const user = await User.findById(userId)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) return res.status(404).send("User not found");

        res.render("pages/myprofile", { user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get("/add-document", async (req, res) => {
    const departments = await Department.find({ status: "Active" }, "name").lean();
    const users = await User.find({ profile_type: "user" }, "name").sort({ name: 1 }).lean();
    const projectNames = await Project.find({ isActive: true, projectStatus: "Active" }, "projectName").lean();
    res.render("pages/add-document", { title: "E-Sangrah - Add-Document", departments, users, projectNames });
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

// Helper function to render project-details page
async function renderProjectDetails(res, projectId = null) {
    try {
        let project = null;
        if (projectId) {
            project = await Project.findById(projectId)
                // .populate("department", "name")
                .populate("projectManager", "name")
                .populate("projectCollaborationTeam", "name")
                .populate("donor", "name profile_type")
                .populate("vendor", "name profile_type")
                .lean();
        }

        const users = await User.find({}, "name").lean();
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const donors = await User.find({ profile_type: "donor" }, "name").lean();
        const vendors = await User.find({ profile_type: "vendor" }, "name").lean();

        res.render("pages/projects/project-details", {
            title: project ? "Project Details" : "Add Project",
            project,
            users,
            departments,
            donors,
            vendors,
            user: res.locals.user,
            formatDateDDMMYYYY: (date) => {
                if (!date) return "N/A";
                const d = new Date(date);
                return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
            }
        });
    } catch (err) {
        console.error("Error loading project:", err);
        res.status(500).render("pages/projects/project-details", {
            title: "Project Details",
            project: null,
            users: [],
            departments: [],
            donors: [],
            vendors: [],
            error: "Unable to load project details."
        });
    }
}

// Add Project Page
router.get("/projects/project-details", authenticate, async (req, res) => {
    await renderProjectDetails(res); // projectId is null → add mode
});

// View / Edit Project Page
router.get("/projects/:id/project-details", authenticate, async (req, res) => {
    const projectId = req.params.id;
    await renderProjectDetails(res, projectId);
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
