import File from "../models/File.js";
import Folder from "../models/Folder.js";
import { s3Client } from "../config/S3Client.js";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import Document from '../models/Document.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { API_CONFIG } from "../config/ApiEndpoints.js";
import { getSessionFilters } from "../helper/sessionHelpers.js";
import mongoose from "mongoose";
function sanitize(str) {
    return String(str)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30);
}

function buildApproverString(doc) {
    if (!doc.wantApprovers || !doc.documentApprovalAuthority?.length) {
        return "N/A";
    }

    return doc.documentApprovalAuthority
        .sort((a, b) => (a.priority || 0) - (b.priority || 0))
        .map(a => {
            const name = a.userId?.name || "Unknown";
            const status = a.status || "Pending";
            return `${name} [${status}]`;
        })
        .join(" | ");
}
export const servePDF = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).send("File not found");
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: file.file,
        });

        const response = await s3Client.send(command);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
        res.setHeader("Content-Length", response.ContentLength);

        // Stream the PDF to the browser
        response.Body.pipe(res);

        // --- Log file open activity (non-blocking) ---
        const userId = req.user?._id || null;
        file.activityLog.push({
            action: "opened",
            performedBy: userId,
            details: `PDF "${file.originalName}" viewed in browser by ${userId || "unknown user"}`
        });

        // Save the log without delaying the response
        file.save().catch(err => console.error("Failed to log PDF view:", err));

    } catch (error) {
        console.error("Error serving PDF:", error);
        res.status(500).send("Error loading PDF");
    }
};

export const downloadFolderAsZip = async (req, res) => {
    try {
        const { folderId } = req.params;

        const folder = await Folder.findById(folderId);
        if (!folder) return res.status(404).json({ message: "Folder not found" });

        const folderName = folder.slug;


        const listParams = {
            Bucket: process.env.AWS_BUCKET,
            Prefix: `folders/${folderName}/`,
        };

        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(404).json({ message: "No files in folder" });
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=${folderName}.zip`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", (err) => {
            console.error("Archive error:", err);
            res.status(500).send({ message: "Error creating ZIP" });
        });
        archive.pipe(res);

        const concurrency = 5; y
        const queue = new PQueue({ concurrency });

        listedObjects.Contents.forEach((file) => {
            queue.add(async () => {
                const command = new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Key: file.Key,
                });
                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
                const response = await axios({
                    method: "GET",
                    url: signedUrl,
                    responseType: "stream",
                });

                archive.append(response.data, {
                    name: file.Key.replace(`folders/${folderName}/`, ""),
                });
            });
        });

        await queue.onIdle();
        await archive.finalize();

    } catch (error) {
        console.error("Download ZIP error:", error);
        return res.status(500).json({ message: "Failed to download folder" });
    }
};

// Download file
export const downloadFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.fileId);
        if (!file) return res.status(404).json({ message: "File not found" });

        const command = new GetObjectCommand({
            Bucket: API_CONFIG.Bucket,
            Key: file.file
        });

        const s3Object = await s3Client.send(command);

        // Set headers before streaming the file
        res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");

        // Pipe file stream to response
        s3Object.Body.pipe(res);

        // --- Add activity log entry asynchronously ---
        const userId = req.user?._id; // assuming auth middleware sets req.user
        file.activityLog.push({
            action: "downloaded",
            performedBy: userId || null,
            details: `File "${file.originalName}" downloaded by user ${userId || "unknown"}`
        });

        await file.save();

    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Failed to download file", error: error.message });
    }
};

export const exportDocuments = async (req, res) => {
    try {
        const { format, filters = {}, exportAll = false } = req.body;

        if (!["xlsx", "csv", "pdf", "ods"].includes(format)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid export format" });
        }

        const { selectedYear, selectedProjectId } = getSessionFilters(req);
        const query = buildQuery(filters);
        if (selectedProjectId) {
            query.project = new mongoose.Types.ObjectId(selectedProjectId);
        }

        if (selectedYear) {
            const start = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
            const end = new Date(`${Number(selectedYear) + 1}-01-01T00:00:00.000Z`);
            query.createdAt = { $gte: start, $lt: end };
        }

        const docsQuery = Document.find(query)
            .populate({
                path: "owner",
                select: "name",
                populate: {
                    path: "userDetails.designation",
                    model: "Designation",
                    select: "name"
                }
            })
            .populate("department", "name")
            .populate("sharedWithUsers", "name")
            .populate("files", "originalName fileSize")
            .populate({
                path: "documentApprovalAuthority.userId",
                select: "name"
            })
            .populate({
                path: "documentApprovalAuthority.designation",
                model: "Designation",
                select: "name"
            })
            .sort({ updatedAt: -1 });
        console.log("Report", docsQuery)
        const documents = exportAll ? await docsQuery : await docsQuery.limit(1000);
        const exportData = formatExportData(documents);

        // ----- file name -------------------------------------------------
        const parts = [];
        if (filters.role) parts.push(`Role_${sanitize(filters.role)}`);
        if (filters.department) parts.push(`Dept_${sanitize(filters.department)}`);
        if (filters.docType) parts.push(`Type_${sanitize(filters.docType)}`);
        if (filters.designation) parts.push(`Desig_${sanitize(filters.designation)}`);
        if (filters.date) parts.push(`Date_${filters.date}`);
        const suffix = parts.length ? parts.join("-") + "-" : "";
        const fileName = `documents-${suffix}${new Date()
            .toISOString()
            .split("T")[0]}.${format}`;

        // ----- generate --------------------------------------------------
        switch (format) {
            case "xlsx":
                await generateExcel(exportData, res, fileName);
                break;
            case "csv":
                generateCSV(exportData, res, fileName);
                break;
            case "pdf":
                await generatePDF(exportData, res, fileName);
                break;
            case "ods":
                await generateODS(exportData, res, fileName);
                break;
        }
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({
            success: false,
            message: "Export failed",
            error: error.message
        });
    }
};


function buildQuery(filters) {
    const query = {};

    if (filters.role) {
        query.role = filters.role;
    }

    if (filters.department) {
        query.department = filters.department;
    }

    if (filters.docType) {
        query['metadata.docType'] = filters.docType;
    }

    if (filters.designation) {
        query['owner.designation'] = filters.designation;
    }

    if (filters.search) {
        query.$or = [
            { 'metadata.fileName': { $regex: filters.search, $options: 'i' } },
            { 'metadata.fileDescription': { $regex: filters.search, $options: 'i' } },
            { 'owner.name': { $regex: filters.search, $options: 'i' } },
            { tags: { $regex: filters.search, $options: 'i' } }
        ];
    }

    if (filters.date) {
        const startDate = new Date(filters.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt = {
            $gte: startDate,
            $lt: endDate
        };
    }

    return query;
}

// Format data for export
function formatExportData(documents) {
    return documents.map(doc => {
        const file = doc.files?.[0] || {};

        return {
            fileName: doc.metadata?.fileName || "",
            owner: doc.owner?.name || "",
            designation: doc.owner?.userDetails?.designation?.name || "",
            department: doc.department?.name || "",
            role: "Admin",                                 // keep your default
            approver: buildApproverString(doc),            // <-- NEW
            lastModified: doc.updatedAt
                ? new Date(doc.updatedAt).toLocaleString()
                : "",
            tags: doc.tags?.join(", ") || "",
            metadata: doc.metadata?.fileDescription || "",
            sharedWith: doc.sharedWithUsers
                ?.map(u => u.name)
                .join(", ") || "",
            createdOn: doc.createdAt
                ? new Date(doc.createdAt).toLocaleString()
                : "",
            description: doc.description
                ? doc.description.replace(/<\/?[^>]+(>|$)/g, "").trim()
                : "",
            signature: doc.signature?.fileUrl ? "Yes" : "No",
            status: doc.status || "",
            fileSize: file.fileSize
                ? `${(file.fileSize / 1024).toFixed(2)} KB`
                : "",
            fileType: file.originalName?.split(".").pop()?.toUpperCase() || ""
        };
    });
}

function mapColumnNameToKey(columnName) {
    const columnMap = {
        'File Name': 'fileName',
        'Owner': 'owner',
        'Designation': 'designation',
        'Department': 'department',
        'Role': 'role',
        'Approver': 'approver',
        'Last Modified On': 'lastModified',
        'Tags': 'tags',
        'Meta data': 'metadata',
        'Shared with': 'sharedWith',
        'Created on': 'createdOn',
        'Description': 'description',
        'Signature': 'signature',
        'Status': 'status'
    };

    return columnMap[columnName] || columnName.toLowerCase().replace(/\s+/g, '');
}

// Generate Excel file
async function generateExcel(data, res, fileName) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Documents Report");

    // Title
    ws.mergeCells("A1:O1");
    ws.getCell("A1").value = "Documents Report";
    ws.getCell("A1").font = { size: 16, bold: true };
    ws.getCell("A1").alignment = { horizontal: "center" };

    ws.mergeCells("A2:O2");
    ws.getCell("A2").value = `Exported on: ${new Date().toLocaleString()}`;
    ws.getCell("A2").alignment = { horizontal: "center" };
    ws.getCell("A2").font = { italic: true };

    if (data.length) {
        const headers = Object.keys(data[0]);
        ws.addRow([]);                     // empty row after title
        const headerRow = ws.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6E6FA" }
        };

        data.forEach(r => ws.addRow(Object.values(r)));

        ws.columns.forEach(col => {
            let max = 0;
            col.eachCell({ includeEmpty: true }, c => {
                const len = c.value ? c.value.toString().length : 10;
                if (len > max) max = len;
            });
            col.width = Math.min(max + 2, 50);
        });
    }

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
}

function generateCSV(data, res, fileName) {
    if (!data.length) {
        return res
            .status(400)
            .json({ success: false, message: "No data to export" });
    }
    const parser = new Parser({ fields: Object.keys(data[0]) });
    const csv = parser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csv);
}

async function generatePDF(data, res, fileName) {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    doc.pipe(res);

    doc.fontSize(20).font("Helvetica-Bold").text("Documents Report", { align: "center" });
    doc.fontSize(10)
        .font("Helvetica")
        .text(`Exported on: ${new Date().toLocaleString()}`, { align: "center" });

    let y = 120;
    data.forEach((row, i) => {
        if (y > 700) { doc.addPage(); y = 50; }
        doc.fontSize(12).font("Helvetica-Bold").text(`Document ${i + 1}:`, 50, y);
        y += 20;

        Object.entries(row).forEach(([k, v]) => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.fontSize(10)
                .font("Helvetica-Bold")
                .text(`${k}:`, 70, y);
            doc.font("Helvetica").text(String(v || ""), 200, y);
            y += 15;
        });
        y += 10;
    });

    doc.end();
}

async function generateODS(data, res, fileName) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Documents Report");

    if (data.length) {
        ws.addRow(Object.keys(data[0]));
        data.forEach(r => ws.addRow(Object.values(r)));
    }

    res.setHeader("Content-Type", "application/vnd.oasis.opendocument.spreadsheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    await workbook.ods.write(res);
    res.end();
}


// Get available export formats
export const getExportFormats = async (req, res) => {
    try {
        const formats = [
            {
                type: 'xlsx',
                label: 'Excel (XLSX)',
                description: 'Microsoft Excel format',
                icon: 'ti ti-file-spreadsheet'
            },
            {
                type: 'csv',
                label: 'CSV',
                description: 'Comma Separated Values',
                icon: 'ti ti-file-type-csv'
            },
            {
                type: 'pdf',
                label: 'PDF',
                description: 'Portable Document Format',
                icon: 'ti ti-file-type-pdf'
            },
            {
                type: 'ods',
                label: 'ODS',
                description: 'OpenDocument Spreadsheet',
                icon: 'ti ti-file-spreadsheet'
            }
        ];

        res.json({
            success: true,
            data: formats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get export formats',
            error: error.message
        });
    }
};