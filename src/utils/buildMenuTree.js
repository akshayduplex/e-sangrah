export function buildMenuTree(data) {
    console.log("Building menu tree from data:", data);

    const masters = data.filter(item => item.type === "Master");
    const dashboards = data.filter(item => item.type === "Dashboard");
    const menus = data.filter(item => item.type === "Menu");

    // --- Helper: get children recursively ---
    function getMenuChildren(parentId) {
        return menus
            .filter(m => {
                const masterId = m.master_id?._id || m.master_id;
                return masterId && masterId.toString() === parentId.toString();
            })
            .map(menu => ({
                ...menu,
                children: getMenuChildren(menu._id) // recursion for submenus
            }));
    }

    // --- Build Master roots ---
    const roots = masters.map(master => ({
        ...master,
        children: getMenuChildren(master._id)
    }));

    // --- Special Dashboard root ---
    if (dashboards.length > 0) {
        roots.unshift({
            _id: "dashboard_root",
            name: "Dashboard",
            type: "DashboardRoot",
            children: dashboards.map(d => ({
                ...d,
                children: [] // dashboards never have submenus
            }))
        });
    }

    // --- Recursive filter: remove hidden items ---
    function filterTree(nodes) {
        return nodes
            .filter(node => node.is_show !== false)
            .map(node => ({
                ...node,
                children: filterTree(node.children || [])
            }));
    }

    return filterTree(roots);
}
