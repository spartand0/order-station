import React, { useEffect, useState } from 'react'
import reducer from './store'
import { injectReducer } from 'store/index'
import { AdaptableCard } from 'components/shared'
import ProductTable from './components/ProductTable'
import ProductTableTools from './components/ProductTableTools'
import axios from 'axios'

injectReducer('salesProductList', reducer)

const ProductList = () => {
    const [products,setProducts] = useState([])
    const [loading,setLoading] = useState(true)
    useEffect(() => {
        axios.get('http://localhost:5000/api/admin/getProducts').then(res=>{
            setProducts(res.data.data)
            setLoading(false)
            console.log(res.data.data)
        })
    }, [])
    
    return (
        <AdaptableCard className="h-full" bodyClass="h-full">
            <div className="lg:flex items-center justify-between mb-4">
                <h3 className="mb-4 lg:mb-0">Products List</h3>
                <ProductTableTools />
            </div>
            <ProductTable products={products} loading={loading}/>
        </AdaptableCard>
    )
}

export default ProductList
