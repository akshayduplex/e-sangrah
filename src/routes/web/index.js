const express = require("express");
const { authenticate } = require("../../middlewares/authMiddleware");
const projectController = require("../../controllers/Projects/projectController");
const departmentController = require("../../controllers/Department/departmentController");
const permissionController = require("../../controllers/permissions/permisssions");
const ProjectCl = require("../../models/Projects");
const router = express.Router();
router.get("/", (req, res) => {
    res.render("pages/home", { title: "E-Sangrah - Home" });
});

router.get('/', (req, res) => {
    res.render('pages/home', { title: 'Home' });
});

router.get("/permissions", (req, res) => {
    res.render("pages/permissions", { title: "E-Sangrah - About" });
});
router.get('/settings', authenticate, permissionController.getSettings);
// router.get('/designations', authenticate, permissionController.listDesignations);
// router.get('/menus', authenticate, permissionController.listMenus);
// router.get('/designations/assign-menu/:id', authenticate, permissionController.menuAssignmentPage);

router.get("/projects", authenticate, async (req, res) => {
    try {
        // Example: fetch projects from a database
        const projects = await ProjectCl.find(); // or however you get your projects

        res.render("pages/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(), // flash messages if needed
            projects: projects      // pass projects to EJS
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Unable to load projects");
        res.render("pages/projects", {
            user: req.user,
            title: "E-Sangrah - ProjectList",
            messages: req.flash(),
            projects: [] // fallback empty array
        });
    }
});

router.get("/login", (req, res) => {
    res.render("pages/login", { title: "E-Sangrah - Login" });
});

router.get("/register", (req, res) => {
    res.render("pages/register", { title: "E-Sangrah - Register" });
});
// Update your dashboard route to use the actual API data
router.get("/dashboard", authenticate, async (req, res) => {
    try {
        // Fetch common data
        const [projects, departments] = await Promise.all([
            projectController.getAllProjects,
            departmentController.getAllDepartments
        ]);

        // Role-based rendering
        if (req.user.role === "admin") {
            return res.render("pages/adminDashboard", {
                user: req.user,
                projects,
                departments
            });
        } else if (req.user.role === "employee" || req.user.role === "manager" || req.user.role === "user") {
            return res.render("pages/userDashboard", {
                user: req.user,
                projects,
                departments
            });
        } else {
            // fallback for other roles
            return res.status(403).render("pages/403", {
                message: "Not authorized to view this dashboard",
                user: req.user
            });
        }
    } catch (error) {
        console.error("Dashboard render error:", error);
        res.status(500).render("pages/error", {
            user: req.user,
            message: "Something went wrong while loading the dashboard"
        });
    }
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


router.get("/assign-menu", permissionController.getAssignMenuPage);
// Render menu list page
router.get('/list', permissionController.getMenuList);

// Render add menu page
router.get('/add', permissionController.getAddMenu);

// Render edit menu page
router.get('/edit/:id', permissionController.getEditMenu);
module.exports = router;
