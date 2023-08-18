import React, { useEffect, useState } from 'react'
import ActionBar from './components/ActionBar'
import ProjectListContent from './components/ProjectListContent'
import NewProjectDialog from './components/NewProjectDialog'
import { Container } from 'components/shared'
import reducer from './store'
import { injectReducer } from 'store/index'
import axios from 'axios'

injectReducer('projectList', reducer)

const ProjectList = () => {
    const [listCompanies, setCompanies] = useState(null)
    const fetchCompany = async () => {
        const result = await axios.get(
            'http://localhost:5000/api/admin/getCompanies'
        )
        setCompanies(result.data.data)
    }
    useEffect(() => {
        fetchCompany()
    }, [])
useEffect(() => {
    console.log(listCompanies)

}, [listCompanies])

    return (
        <Container className="h-full">
            <ActionBar />
            <ProjectListContent companies={listCompanies} />
            <NewProjectDialog />
        </Container>
    )
}

export default ProjectList
