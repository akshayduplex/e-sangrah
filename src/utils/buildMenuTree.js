// export function buildMenuTree(data) {
//     console.log("Building menu tree from data:", data);
//     const masters = data.filter(item => item.type === 'Master' || item.type === 'Dashboard');
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
    const menus = data.filter(m => m.type === "Menu");
    const subMenus = data.filter(m => m.type === "SubMenu");

    function getChildren(parentId) {
        return subMenus
            .filter(s => s.master_id?.toString() === parentId.toString())
            .sort((a, b) => a.priority - b.priority);
    }

    return menus
        .filter(m => m.is_show)
        .sort((a, b) => a.priority - b.priority)
        .map(menu => ({
            ...menu,
            children: getChildren(menu._id)
        }));
}
