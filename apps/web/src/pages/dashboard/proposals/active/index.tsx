import relativeTime from 'dayjs/plugin/relativeTime'

import { extend as dayJsExtend } from 'dayjs'
import Link from 'next/link'
import NavBar from '../../../../components/navbar/NavBar'
import { ActiveProposals } from '../../../../components/proposals/ActiveProposals'
import DashboardHeader from '../../../../components/Dashboard'

dayJsExtend(relativeTime)

const tabs: { id: number; name: string; color: string; link: string }[] = [
    {
        id: 0,
        name: 'Active Proposals',
        color: 'text-gray-100 text-5xl cursor-pointer',
        link: '/dashboard/proposals/active',
    },
    {
        id: 1,
        name: 'Past Proposals',
        color: 'text-gray-400 text-5xl cursor-pointer',
        link: '/dashboard/proposals/past',
    },
]

export const ProposalsView = () => {
    return (
        <div className="flex w-full flex-col p-5">
            <div className="flex w-full flex-row gap-10">
                {tabs.map((tab) => {
                    return (
                        <Link
                            key={tab.id}
                            className={tab.color}
                            href={tab.link}
                        >
                            {tab.name}
                        </Link>
                    )
                })}
            </div>
            <div className="mt-2">
                <ActiveProposals />
            </div>
        </div>
    )
}

export const Proposals = () => {
    return (
        <div className="flex w-full flex-row" data-cy="proposals-active">
            <NavBar />
            <DashboardHeader title="Proposals" component={<ProposalsView />} />
        </div>
    )
}

export default Proposals
