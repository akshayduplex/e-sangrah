import File from "../models/File.js";
import Folder from "../models/Folder.js";
import { s3Client } from "../config/S3Client.js";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import Document from '../models/Document.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { createObjectCsvStringifier } from 'csv-writer';
import { Parser } from 'json2csv';
import { getObjectUrl } from "../utils/s3Helpers.js";
import { API_CONFIG } from "../config/ApiEndpoints.js";

export const servePDF = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).send('File not found');
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: file.file,
        });

        const response = await s3Client.send(command);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
        res.setHeader('Content-Length', response.ContentLength);

        // Stream the file
        response.Body.pipe(res);

    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).send('Error loading PDF');
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

        res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
        res.setHeader("Content-Type", file.fileType || "application/octet-stream");

        s3Object.Body.pipe(res);

    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ message: "Failed to download file", error: error.message });
    }
};

export const exportDocuments = async (req, res) => {
    try {
        const { format, filters, columns, exportAll = false } = req.body;


        const validFormats = ['xlsx', 'csv', 'pdf', 'ods'];
        if (!validFormats.includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid export format'
            });
        }

        const query = buildQuery(filters);

        let documents;
        if (exportAll) {
            documents = await Document.find(query)
                .populate('owner', 'name designation')
                .populate('department', 'name')
                .populate('sharedWithUsers', 'name')
                .populate('signature')
                .sort({ updatedAt: -1 });
        } else {
            documents = await Document.find(query)
                .populate('owner', 'name designation')
                .populate('department', 'name')
                .populate('sharedWithUsers', 'name')
                .populate('signature')
                .sort({ updatedAt: -1 })
                .limit(1000);
        }


        const exportData = formatExportData(documents, columns);

        switch (format) {
            case 'xlsx':
                await generateExcel(exportData, res);
                break;
            case 'csv':
                generateCSV(exportData, res);
                break;
            case 'pdf':
                await generatePDF(exportData, res);
                break;
            case 'ods':
                await generateODS(exportData, res);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported format'
                });
        }

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed',
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
function formatExportData(documents, selectedColumns) {
    return documents.map(doc => {
        const row = {
            fileName: doc.metadata?.fileName || '',
            owner: doc.owner?.name || '',
            designation: doc.owner?.designation || '',
            department: doc.department?.name || '',
            role: doc.role || 'Admin',
            approver: doc.projectManager || '',
            lastModified: doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '',
            tags: doc.tags?.join(', ') || '',
            metadata: doc.metadata?.fileDescription || '',
            sharedWith: doc.sharedWithUsers?.map(u => u.name).join(', ') || '',
            createdOn: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '',
            description: doc.description?.replace(/<\/?[^>]+(>|$)/g, "") || '',
            signature: doc.signature?.fileUrl ? 'Yes' : 'No',
            status: doc.status || '',
            fileSize: doc.files[0]?.fileSize ? `${(doc.files[0].fileSize / 1024).toFixed(2)} KB` : '',
            fileType: doc.files[0]?.fileType || ''
        };

        if (selectedColumns && selectedColumns.length > 0) {
            const filteredRow = {};
            selectedColumns.forEach(col => {
                const key = mapColumnNameToKey(col);
                if (row[key] !== undefined) {
                    filteredRow[col] = row[key];
                }
            });
            return filteredRow;
        }

        return row;
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
async function generateExcel(data, res) {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Documents Report');

        // Add title
        worksheet.mergeCells('A1:N1');
        worksheet.getCell('A1').value = 'Documents Report';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add export date
        worksheet.mergeCells('A2:N2');
        worksheet.getCell('A2').value = `Exported on: ${new Date().toLocaleString()}`;
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        worksheet.getCell('A2').font = { italic: true };

        // Add headers
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);

            // Style headers
            const headerRow = worksheet.getRow(3);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Add data
            data.forEach(row => {
                worksheet.addRow(Object.values(row));
            });

            // Auto-fit columns
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = Math.min(maxLength + 2, 50);
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=documents-${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        throw new Error(`Excel generation failed: ${error.message}`);
    }
}

// Generate CSV file
function generateCSV(data, res) {
    try {
        if (data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data to export'
            });
        }

        const fields = Object.keys(data[0]);
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=documents-${Date.now()}.csv`);
        res.send(csv);

    } catch (error) {
        throw new Error(`CSV generation failed: ${error.message}`);
    }
}

// Generate PDF file
async function generatePDF(data, res) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=documents-${Date.now()}.pdf`);

            doc.pipe(res);

            // Add title
            doc.fontSize(20).font('Helvetica-Bold')
                .text('Documents Report', 50, 50, { align: 'center' });

            // Add export date
            doc.fontSize(10).font('Helvetica')
                .text(`Exported on: ${new Date().toLocaleString()}`, 50, 80, { align: 'center' });

            let yPosition = 120;

            // Add data
            data.forEach((item, index) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                doc.fontSize(12).font('Helvetica-Bold')
                    .text(`Document ${index + 1}:`, 50, yPosition);
                yPosition += 20;

                Object.entries(item).forEach(([key, value]) => {
                    if (yPosition > 700) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    doc.fontSize(10).font('Helvetica-Bold')
                        .text(`${key}:`, 70, yPosition);
                    doc.font('Helvetica')
                        .text(String(value || ''), 200, yPosition);
                    yPosition += 15;
                });

                yPosition += 10;
            });

            doc.end();
            resolve();

        } catch (error) {
            reject(new Error(`PDF generation failed: ${error.message}`));
        }
    });
}

// Generate ODS file
async function generateODS(data, res) {
    try {

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Documents Report');

        // Add headers
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);

            // Add data
            data.forEach(row => {
                worksheet.addRow(Object.values(row));
            });
        }

        res.setHeader('Content-Type', 'application/vnd.oasis.opendocument.spreadsheet');
        res.setHeader('Content-Disposition', `attachment; filename=documents-${Date.now()}.ods`);

        await workbook.ods.write(res);
        res.end();

    } catch (error) {
        throw new Error(`ODS generation failed: ${error.message}`);
    }
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