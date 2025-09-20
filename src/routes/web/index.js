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
import { authenticate, authorize } from "../../middlewares/authMiddleware.js";

// --- Models ---
import Designation from "../../models/Designation.js";
import Project, { ProjectType } from "../../models/Project.js";
import User from "../../models/User.js";
import Department from "../../models/Departments.js";
import { profile_type } from "../../constant/constant.js";
import Menu from "../../models/Menu.js";
import UserPermission from "../../models/UserPermission.js";
import { buildMenuTree } from "../../utils/buildMenuTree.js";
import checkUserPermission from "../../middlewares/checkPermission.js";

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

// Render "Add Designation" page
router.get('/designation', authenticate, authorize('admin'), async (req, res) => {
    res.render('pages/designation/designation', { designation: null });
});

// Render "Edit Designation" page
router.get('/designation/edit/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const designation = await Designation.findById(req.params.id);
        if (!designation) {
            req.flash('error', 'Designation not found');
            return res.redirect('/designations-list');
        }
        res.render('pages/designation/designation', { designation });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Something went wrong');
        res.redirect('/designations-list');
    }
});

// Render "Designation List" page
router.get('/designations-list', authenticate, authorize('admin'), (req, res) => {
    res.render('pages/designation/designations-list', { title: 'Designation List' });
});
// Add Department Form
router.get("/department", authenticate, (req, res) => {
    res.render("pages/department/department", {
        title: "E-Sangrah - Department",
        department: null  // For Add form, no existing data
    });
});

// Department List Page
router.get("/departments-list", authenticate, (req, res) => {
    res.render("pages/department/departments-list", {
        title: "E-Sangrah - Departments-List"
    });
});

// Edit Department Form
router.get("/department/edit/:id", authenticate, async (req, res) => {
    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.redirect("/departments-list");

    res.render("pages/department/department", {
        title: "E-Sangrah - Edit Department",
        department
    });
});
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
   Documents
=========================== */
router.get("/document/documents-list", authenticate, async (req, res) => {
    try {
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();

        res.render("pages/document/document-list", {
            title: "E-Sangrah - Documents-List",
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

router.get("/projects/project-details", authenticate, checkUserPermission, (req, res) =>
    renderProjectDetails(res)
);

router.get("/projects/:id/project-details", authenticate, checkUserPermission, (req, res) =>
    renderProjectDetails(res, req.params.id)
);

router.get("/projects", authenticate, checkUserPermission, (req, res) => {
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
   Role and Permmissions Assignment
=========================== */
// Render assign-permissions page
router.get("/assign-permissions", authenticate, async (req, res) => {
    try {
        const departments = await Department.find({ status: "Active" }, "name").lean();
        const designations = await Designation.find({ status: "Active" })
            .sort({ name: 1 })
            .lean();
        res.render("pages/permissions/assign-permissions", {
            user: req.user,
            Roles: profile_type,
            designations,
            departments,
            profile_type
        });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});

// Get user permissions page
router.get("/user-permissions/:id", authenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId)
            .populate("userDetails.designation")
            .populate("userDetails.department")
            .lean();

        if (!user) {
            return res.status(404).render("pages/error", {
                user: req.user,
                message: "User not found",
            });
        }

        // Get all menus
        const menus = await Menu.find({ is_show: true })
            .sort({ priority: 1, add_date: -1 })
            .lean();

        // Build menu tree
        const masterMenus = buildMenuTree(menus);

        // Get user's existing permissions
        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id")
            .lean();

        // Create a map of menu permissions for easy access
        const permissionMap = {};
        userPermissions.forEach(perm => {
            if (perm.menu_id) {
                permissionMap[perm.menu_id._id.toString()] = perm.permissions;
            } else {
                console.warn(`Missing menu for permission ID: ${perm._id}`);
            }
        });

        res.render("pages/permissions/assign-user-permissions", {
            user: req.user,
            targetUser: user,
            masterMenus,
            permissionMap
        });
    } catch (err) {
        console.error("Error loading user permissions page:", err);
        res.status(500).render("error", {
            user: req.user,
            message: "Something went wrong while loading user permissions",
        });
    }
});

// Get user permissions API
router.get("/user/:id/permissions", authenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const userPermissions = await UserPermission.find({ user_id: userId })
            .populate("menu_id", "name type master_id")
            .lean();

        res.json({ success: true, data: userPermissions });
    } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ success: false, message: "Error fetching user permissions" });
    }
});

// Save user permissions
router.post("/user/permissions", authenticate, async (req, res) => {
    try {
        const { user_id, permissions } = req.body; // permissions now only contains checked menus/submenus
        const assigned_by = req.user;

        if (!user_id || !permissions || Object.keys(permissions).length === 0) {
            return res.status(400).json({
                success: false,
                message: "User ID and permissions are required"
            });
        }

        // Delete existing permissions for the user
        await UserPermission.deleteMany({ user_id });

        // Prepare new permission documents
        const permissionDocs = [];

        for (const [menuId, permData] of Object.entries(permissions)) {
            permissionDocs.push({
                user_id,
                menu_id: menuId,
                permissions: {
                    read: !!permData.read,
                    write: !!permData.write,
                    delete: !!permData.delete
                },
                assigned_by: {
                    user_id: assigned_by._id,
                    name: assigned_by.name,
                    email: assigned_by.email
                }
            });
        }

        // Insert all new permissions at once
        if (permissionDocs.length > 0) {
            await UserPermission.insertMany(permissionDocs);
        }

        res.json({
            success: true,
            message: "User permissions saved successfully"
        });
    } catch (error) {
        console.error("Error saving user permissions:", error);
        res.status(500).json({ success: false, message: "Error saving user permissions" });
    }
});


router.get("/role-permissions", authenticate, (req, res) => {
    try {
        res.render("pages/permissions/roles-permissions", { user: req.user });
    } catch (err) {
        console.error("Dashboard render error:", err);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard",
        });
    }
});


router.get("/assign-menu", authenticate, checkUserPermission, getAssignMenuPage);
router.get(
    "/assign-menu/designation/:designation_id/menus",
    authenticate,
    getAssignedMenusValidator,
    getAssignedMenus
);
router.post(
    "/assign-menu/assign",
    authenticate,
    checkUserPermission,
    assignMenusValidator,
    assignMenusToDesignation
);

/* ===========================
   Menu Management
=========================== */
router.get("/menu/list", authenticate, checkUserPermission, getMenuListValidator, getMenuList);
router.get("/menu/add", authenticate, getAddMenu);
router.get("/menu/add/:id", authenticate, checkUserPermission, menuIdParamValidator, getEditMenu);

export default router;
