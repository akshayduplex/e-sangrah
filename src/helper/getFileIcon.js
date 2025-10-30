// Helper to pick an icon for each file type (optional)
export const getFileIcon = (fileType = "") => {
    const lower = fileType.toLowerCase();
    if (lower.includes("pdf")) return "/img/icons/fn1.png";
    if (lower.includes("word") || lower.includes("doc")) return "/img/icons/fn2.png";
    if (lower.includes("excel") || lower.includes("spreadsheet")) return "/img/icons/fn3.png";
    if (lower.includes("ppt")) return "/img/icons/fn4.png";
    if (lower.includes("image")) return "/img/icons/fn5.png";
    return "/img/icons/file.png";
};