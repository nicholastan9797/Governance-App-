'use client'

import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'

const SetupDailyBulletin = () => {
    const router = useRouter()
    const account = useAccount()

    return (
        account.isConnected && (
            <div className='flex w-full flex-col items-center justify-between gap-2 bg-[#FFF1BF] p-6 lg:flex-row'>
                <div className='text-[24px] font-light text-black'>
                    You can setup a daily email to notify you of the latest
                    proposals for the DAOs that you’re subscribed to on Senate.
                </div>

                <button
                    className='flex items-center justify-center bg-black p-2 text-white lg:h-[44px] lg:w-[208px] lg:p-0'
                    onClick={() => {
                        router.push('/bulletin')
                    }}
                >
                    Setup Daily Email
                </button>
            </div>
        )
    )
}
export default SetupDailyBulletin
