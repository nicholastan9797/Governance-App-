import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { NotConnected } from './components/csr/NotConnected'

const tabs: { id: number; name: string; color: string; link: string }[] = [
    {
        id: 0,
        name: 'Account',
        color: 'text-white text-[36px] font-bold cursor-pointer',
        link: '/settings/account'
    },
    {
        id: 1,
        name: 'Proxy Addresses',
        color: 'text-[#808080] text-[36px] font-light cursor-pointer',
        link: '/settings/proxy'
    },
    {
        id: 2,
        name: 'Notifications',
        color: 'text-[#808080] text-[36px] font-light cursor-pointer',
        link: '/settings/notifications'
    }
]

export default async function RootLayout({
    children
}: {
    children: React.ReactNode
}) {
    const session = await getServerSession()
    return (
        <>
            {session?.user ? (
                <div className='flex grow flex-col bg-[#1E1B20] p-5 px-12'>
                    <div className='flex w-full flex-row gap-10'>
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
                    <div className='pt-10 pl-2'>{children}</div>
                </div>
            ) : (
                <div className='flex grow flex-col bg-[#1E1B20] p-5 px-12'>
                    <div className='flex w-full flex-row gap-10'>
                        <Link
                            key={tabs[0].id}
                            className={tabs[0].color}
                            href={tabs[0].link}
                        >
                            {tabs[0].name}
                        </Link>
                    </div>
                    <div className='pt-10 pl-2'>
                        <NotConnected />
                    </div>
                </div>
            )}
        </>
    )
}
