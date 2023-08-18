import React, { useEffect, useState } from 'react'
import { AdaptableCard } from 'components/shared'
import CustomersTable from './components/CustomersTable'
import CustomersTableTools from './components/CustomersTableTools'
import CustomerStatistic from './components/CustomerStatistic'
import { injectReducer } from 'store/index'
import reducer from './store'
import axios from 'axios'

injectReducer('crmCustomers', reducer)

const Customers = () => {
    const [Users,setUsers] = useState([])
    const [loading,setLoading] = useState(true)
    useEffect(() => {
        axios.get('http://localhost:5000/api/admin/allUsers').then(res=>{
            setUsers(res.data.data)
            setLoading(false)
            console.log(res.data.data)
        })
    }, [])
    return (
        <>
            <CustomerStatistic users={Users} loading={loading}/>
            <AdaptableCard className="h-full" bodyClass="h-full">
                <CustomersTableTools />
                <CustomersTable users={Users} loading={loading} />
            </AdaptableCard>
        </>
    )
}

export default Customers
