import React from 'react'
import classNames from 'classnames'
import GridItem from './GridItem'
import ListItem from './ListItem'
import { Spinner } from 'components/ui'
import {useSelector } from 'react-redux'

const ProjectListContent = ({companies}) => {
console.log(companies)
    const loading = false

    const view = useSelector((state) => state.projectList.state.view)


    return (
        <div
            className={classNames(
                'mt-6 h-full flex flex-col',
                loading && 'justify-center'
            )}
        >
            {loading && (
                <div className="flex justify-center">
                    <Spinner size={40} />
                </div>
            )}
            {view === 'grid' && companies?.length > 0 && !loading && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {companies?.map((project) => (
                        <GridItem key={project.id} data={project} />
                    ))}
                </div>
            )}
            {view === 'list' &&
                companies?.length > 0 &&
                !loading &&
                companies?.map((project) => (
                    <ListItem key={project.id} data={project} />
                ))}
        </div>
    )
}

export default ProjectListContent
