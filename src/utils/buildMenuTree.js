// export function buildMenuTree(data) {
//     console.log("Building menu tree from data:", data);
//     const masters = data.filter(item => item.type === 'Master' || item.type === 'Dashboard' || item.type === "Menu");
//     const menus = data.filter(item => item.type === 'Menu');
//     const submenus = data.filter(item => item.type === 'Submenu');

//     // Build initial tree
//     const roots = masters.map(master => {
//         const masterMenus = menus.filter(
//             m => m.master_id && (m.master_id._id ? m.master_id._id : m.master_id) === master._id
//         );

//         return {
//             ...master,
//             children: masterMenus.map(menu => {
//                 const menuSubmenus = submenus.filter(
//                     s => s.master_id && (s.master_id._id ? s.master_id._id : s.master_id) === menu._id
//                 );
//                 return { ...menu, children: menuSubmenus };
//             })
//         };
//     });

//     // Recursive filter: only remove hidden items
//     function filterTree(nodes) {
//         return nodes
//             .filter(node => node.is_show !== false) // ✅ only filter hidden
//             .map(node => ({
//                 ...node,
//                 children: filterTree(node.children)
//             }));
//     }

//     return filterTree(roots);
// }

export function buildMenuTree(data) {
    console.log("Building menu tree from data:", data);

    const masters = data.filter(item => item.type === "Master" || item.type === "Menu");
    const dashboards = data.filter(item => item.type === "Dashboard");
    const menus = data.filter(item => item.type === "Menu");
    const submenus = data.filter(item => item.type === "Submenu");

    // --- Build normal master → menu → submenu tree ---
    const roots = masters.map(master => {
        const masterMenus = menus.filter(
            m => m.master_id && (m.master_id._id ? m.master_id._id : m.master_id) === master._id
        );

        return {
            ...master,
            children: masterMenus.map(menu => {
                const menuSubmenus = submenus.filter(
                    s => s.master_id && (s.master_id._id ? s.master_id._id : s.master_id) === menu._id
                );
                return { ...menu, children: menuSubmenus };
            })
        };
    });

    // --- Special root for Dashboard ---
    if (dashboards.length > 0) {
        roots.unshift({
            _id: "dashboard_root",
            name: "Dashboard",
            type: "DashboardRoot",
            children: dashboards.map(d => ({
                ...d,
                children: [] // Dashboard has no submenus
            }))
        });
    }

    // --- Recursive filter: only remove hidden items ---
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
