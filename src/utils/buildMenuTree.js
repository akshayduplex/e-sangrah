function buildMenuTree(data) {
    const masters = data.filter(item => item.type === 'Master');
    const menus = data.filter(item => item.type === 'Menu');
    const submenus = data.filter(item => item.type === 'Submenu');

    return masters.map(master => {
        const masterMenus = menus.filter(m => m.master_id && m.master_id._id === master._id);
        return {
            ...master,
            children: masterMenus.map(menu => {
                const menuSubmenus = submenus.filter(s => s.master_id && s.master_id._id === master._id && s.menu_id === menu._id);
                return { ...menu, children: menuSubmenus };
            })
        };
    });
}
