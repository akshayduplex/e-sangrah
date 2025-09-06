// routes/projectRoutes.js
const express = require("express");
const router = express.Router();
const projectController = require("../../controllers/Projects/projectController");
const { authenticate } = require("../../middlewares/authMiddleware");
const syncService = require("../../services/syncService");

// Project CRUD
router.post("/", authenticate, projectController.createProject);
router.get("/all-projects", authenticate, projectController.getAllProjects);
router.get("/all-managers/:id", authenticate, projectController.getAllManagers);
router.get("/", authenticate, projectController.getProjects);
router.get("/:id", authenticate, projectController.getProjectById);
router.put("/:id", authenticate, projectController.updateProject);
router.delete("/:id", authenticate, projectController.deleteProject);
// Team management
router.post("/:id/team", authenticate, projectController.addTeamMember);
router.delete("/:id/team/:memberId", authenticate, projectController.removeTeamMember);


// Sync route
router.post('/sync', async (req, res) => {
    try {
        const result = await syncService.syncData();

        if (result.success) {
            req.flash('success', result.message);
        } else {
            req.flash('error', result.message);
        }

        res.redirect('/projects');
    } catch (error) {
        console.error('Error in sync route:', error);
        req.flash('error', 'An error occurred during sync');
        res.redirect('/projects');
    }
});

// Display projects route
// router.get('/', async (req, res) => {
//     try {
//         const projects = await syncService.getAllProjects();

//         res.render('projects', {
//             title: 'Projects Management',
//             projects,
//             messages: {
//                 success: req.flash('success'),
//                 error: req.flash('error')
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching projects:', error);
//         req.flash('error', 'Failed to load projects');
//         res.render('projects', {
//             projects: [],
//             messages: {
//                 error: ['Failed to load projects']
//             }
//         });
//     }
// });
module.exports = router;
