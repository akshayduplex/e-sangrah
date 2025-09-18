// routes/index.js
import express from "express";

// --- Controllers ---
import {
    getAddMenu,
    getEditMenu,
    getMenuList,
    getAssignedMenus,
    getAssignMenuPage,
    assignMenusToDesignation,
} from "../../controllers/permissions/permisssions.js";

// --- Validators ---
import {
    assignMenusValidator,
    unAssignMenusValidator,
    getAssignedMenusValidator,
    getMenuListValidator,
    menuIdParamValidator,
} from "../../middlewares/validation/permissionValidator.js";

// --- Middlewares ---
import { authenticate } from "../../middlewares/authMiddleware.js";
import checkPermissions from "../../middlewares/checkPermission.js";

// --- Models ---
import Designation from "../../models/Designation.js";
import Project, { ProjectType } from "../../models/Project.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import { name } from "ejs";

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
        error: null,
    });
});

router.get("/reset-password", authenticate, (req, res) => {
    res.render("pages/reset-password", {
        otpSent: false,
        otpVerified: false,
        // user: req.user,
        email: req.user.email,
        message: null,
        error: null,
    });
});

/* ===========================
   User Management
=========================== */
router.get("/users-list", authenticate, (req, res) => {
    res.render("pages/register/user-listing", { title: "E-Sangrah - Users-List" });
});

router.get("/user-register", authenticate, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/register/user-registration", {
            title: "E-Sangrah - Register",
            departments,
            designations,
        });
    } catch (err) {
        console.error("Error loading user registration:", err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/user-edit/:id", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("userDetails.department", "name")
            .populate("userDetails.designation", "name")
            .lean();

        if (!user) return res.status(404).send("User not found");

        const departments = await Department.find().lean();
        const designations = await Designation.find().lean();

        res.render("pages/register/user-edit", {
            title: "E-Sangrah - Edit User",
            user,
            departments,
            designations,
        });
    } catch (err) {
        console.error("Error editing user:", err);
        res.status(500).send("Internal Server Error");
    }
});

/* ===========================
   Donor & Vendor Management
=========================== */
router.get("/donor-register", authenticate, async (req, res) => {
    try {
        const donor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/donor-registration", {
            title: donor ? "E-Sangrah - Edit Donor" : "E-Sangrah - Register",
            donor,
            isEdit: Boolean(donor),
        });
    } catch (err) {
        console.error("Error loading donor register page:", err);
        res.render("pages/donor-registration", {
            title: "E-Sangrah - Register",
            donor: null,
            isEdit: false,
        });
    }
});

router.get("/donor-list", authenticate, async (req, res) => {
    try {
        const donors = await User.find({ profile_type: "donor" }).lean();
        res.render("pages/donor-listing", { title: "E-Sangrah - Donor List", donors });
    } catch (err) {
        console.error("Error fetching donor list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load donor list",
        });
    }
});

router.get("/vendor-register", authenticate, async (req, res) => {
    try {
        const vendor = req.query.id ? await User.findById(req.query.id).lean() : null;
        res.render("pages/vendor-registration", {
            title: vendor ? "E-Sangrah - Edit Vendor" : "E-Sangrah - Register",
            vendor,
            isEdit: Boolean(vendor),
        });
    } catch (err) {
        console.error("Error loading vendor register page:", err);
        res.render("pages/vendor-registration", {
            title: "E-Sangrah - Register",
            vendor: null,
            isEdit: false,
        });
    }
});

router.get("/vendor-list", authenticate, async (req, res) => {
    try {
        const vendors = await User.find({ profile_type: "vendor" }).lean();
        res.render("pages/vendor-registration-list", {
            title: "E-Sangrah - Vendor List",
            vendors,
        });
    } catch (err) {
        console.error("Error fetching vendor list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load vendor list",
        });
    }
});

/* ===========================
   Misc Pages
=========================== */
router.get("/upload-folder", authenticate, (req, res) => {
    res.render("pages/upload-folder", { title: "E-Sangrah - Upload-Folder" });
});

router.get("/notifications", authenticate, (req, res) => {
    res.render("pages/notifications", { title: "E-Sangrah - Notifications" });
});

router.get("/my-profile", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) return res.status(404).send("User not found");

        res.render("pages/myprofile", { user });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Server Error");
    }
});


router.get("/add-document", authenticate, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const users = await User.find({ profile_type: "user" }, "name")
            .sort({ name: 1 })
            .lean();
        const projectNames = await Project.find(
            { isActive: true, projectStatus: "Active" },
            "projectName"
        ).lean();

        res.render("pages/add-document", {
            title: "E-Sangrah - Add-Document",
            departments,
            users,
            projectNames,
        });
    } catch (err) {
        console.error("Error loading add-document page:", err);
        res.status(500).send("Server Error");
    }
});

/* ===========================
   Projects
=========================== */
router.get("/projects/project-list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/projects/projectList", {
            title: "E-Sangrah - Projects-List",
            designations,
        });
    } catch (err) {
        console.error("Error loading project list:", err);
        res.status(500).render("pages/error", {
            title: "Error",
            message: "Unable to load project list",
        });
    }
});

// Helper for Project Details Page
async function renderProjectDetails(res, projectId = null) {
    try {
        const project = projectId
            ? await Project.findById(projectId)
                .populate("projectManager", "name")
                .populate("projectCollaborationTeam", "name")
                .populate("donor", "name profile_type")
                .populate("vendor", "name profile_type")
                .populate("projectType", "name")
                .lean()
            : null;

        const [users, departments, donors, vendors, projectTypes] = await Promise.all([
            User.find({ profile_type: "user", status: "Active" }, "name").lean(),
            Department.find({ status: "Active" }, "name").lean(),
            User.find({ profile_type: "donor" }, "name").lean(),
            User.find({ profile_type: "vendor" }, "name").lean(),
            ProjectType.find({ status: "Active", isActive: true }, "name")
        ]);

        res.render("pages/projects/project-details", {
            title: project ? "Project Details" : "Add Project",
            project,
            users,
            departments,
            donors,
            vendors,
            projectTypes,
            user: res.locals.user,
            formatDateDDMMYYYY: (date) => {
                if (!date) return "N/A";
                const d = new Date(date);
                return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")
                    }/${d.getFullYear()}`;
            },
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
            projectTypes: [],
            error: "Unable to load project details.",
        });
    }
}

router.get("/projects/project-details", authenticate, (req, res) =>
    renderProjectDetails(res)
);

router.get("/projects/:id/project-details", authenticate, (req, res) =>
    renderProjectDetails(res, req.params.id)
);

router.get("/projects", authenticate, (req, res) => {
    try {
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(),
        });
    } catch (err) {
        console.error("Error loading projects page:", err);
        res.render("pages/projects/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: { error: "Unable to load projects" },
            projects: [],
        });
    }
});

/* ===========================
   Dashboard
=========================== */
router.get("/dashboard", authenticate, (req, res) => {
    try {
        res.render("pages/dashboard", { user: req.user });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});

/* ===========================
   Menu Assignment
=========================== */
router.get("/assign-menu", authenticate, getAssignMenuPage);
router.get(
    "/assign-menu/designation/:designation_id/menus",
    authenticate,
    getAssignedMenusValidator,
    getAssignedMenus
);
router.post(
    "/assign-menu/assign",
    authenticate,
    assignMenusValidator,
    assignMenusToDesignation
);

/* ===========================
   Menu Management
=========================== */
router.get("/menu/list", authenticate, getMenuListValidator, getMenuList);
router.get("/menu/add", authenticate, getAddMenu);
router.get("/menu/add/:id", authenticate, menuIdParamValidator, getEditMenu);

export default router;
