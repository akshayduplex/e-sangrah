import express from "express";
import * as vendorDonorController from "../../controllers/userControllers/DonerVender.js";
import { registerVendor, registerVendorOrDonor } from "../../middlewares/validation/venderDonorValidation.js";
import upload from "../../middlewares/fileUploads.js";

const router = express.Router();

// All routes require authentication
// router.use(authenticate);

// CRUD endpoints
router.post("/add-vendor-donor",
    upload.single('profile_image'),
    registerVendorOrDonor,
    vendorDonorController.registerDonorVendor
);

router.post("/add-vendor",
    upload.single('profile_image'),
    registerVendor,
    vendorDonorController.registerVendor
);


// get all donor base on the DataTable api (use POST for DataTables server-side)
router.post("/donors-list", vendorDonorController.getAllDonors);
// get all vendors based on the DataTable api
router.post("/vendors-list", vendorDonorController.getAllVendor);
// delete donor by id
router.delete("/donor-delete/:id", vendorDonorController.deleteDonorVendor);

// Export router as default
export default router;
