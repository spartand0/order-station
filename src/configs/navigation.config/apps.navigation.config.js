import { APP_PREFIX_PATH } from 'constants/route.constant'
import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from 'constants/navigation.constant'
import { ADMIN, USER } from 'constants/roles.constant'

const appsNavigationConfig = [
    {
        key: 'apps',
        path: '',
        title: 'Menu',
        translateKey: 'nav.apps',
        icon: 'apps',
        type: NAV_ITEM_TYPE_TITLE,
        authority: [ADMIN, USER],
        subMenu: [
            {
                key: 'appsSales.dashboard',
                path: `${APP_PREFIX_PATH}/sales/dashboard`,
                title: 'Accueil',
                translateKey: 'nav.appsSales.dashboard',
                icon: '',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'appsProject.projectList',
                path: `${APP_PREFIX_PATH}/project/project-list`,
                title: 'Companies',
                translateKey: 'nav.appsProject.projectList',
                icon: 'project',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'appsCrm.customers',
                path: `${APP_PREFIX_PATH}/crm/customers`,
                title: 'Users',
                translateKey: 'nav.appsCrm.customers',
                icon: 'crm',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'appsSales.orderList',
                path: `${APP_PREFIX_PATH}/sales/order-list`,
                title: 'Order List',
                translateKey: 'nav.appsSales.orderList',
                icon: 'forms',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
            {
                key: 'appsSales.productList',
                path: `${APP_PREFIX_PATH}/sales/product-list`,
                title: 'Product List',
                translateKey: 'nav.appsSales.productList',
                icon: 'knowledgeBase',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [ADMIN, USER],
                subMenu: [],
            },
        ],
    },
]

export default appsNavigationConfig
