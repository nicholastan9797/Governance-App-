'use client'

import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit'
import { signOut, useSession } from 'next-auth/react'
import { redirect, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { disconnect } from '@wagmi/core'
import { trpc } from '../../../server/trpcClient'

const WalletConnect = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const account = useAccount()
    const session = useSession()
    const acceptedTerms = trpc.accountSettings.getAcceptedTerms.useQuery()
    const acceptedTermsTimestamp =
        trpc.accountSettings.getAcceptedTermsTimestamp.useQuery()
    const { connector: activeConnector } = useAccount()
    const { openConnectModal } = useConnectModal()

    useEffect(() => {
        const handleConnectorUpdate = ({ account }) => {
            if (account) {
                signOut()
            }
        }

        if (activeConnector) {
            activeConnector.on('change', handleConnectorUpdate)
        }
    }, [activeConnector])

    useEffect(() => {
        router.refresh()
    }, [account.isConnected, account.isDisconnected, session.status])

    useEffect(() => {
        const disconnectForTerms = async () => {
            await disconnect()
        }

        if (
            session.status == 'authenticated' &&
            acceptedTerms.isSuccess &&
            acceptedTermsTimestamp.isSuccess
        ) {
            if (!(acceptedTerms.data && acceptedTermsTimestamp.data)) {
                disconnectForTerms()
            }
        }
    }, [acceptedTerms.isFetched, acceptedTermsTimestamp.isFetched])

    if (process.env.OUTOFSERVICE === 'true') redirect('/outofservice')
    // const [cookie] = useCookies(['hasSeenLanding'])
    // useEffect(() => {
    //     if (!cookie.hasSeenLanding && router) router.push('/landing')
    // }, [cookie])

    const [modalOpened, setModalOpened] = useState(false)

    useEffect(() => {
        if (
            searchParams?.has('connect') &&
            openConnectModal &&
            account.isDisconnected &&
            !modalOpened
        ) {
            setModalOpened(true)
            openConnectModal()
        }
    }, [openConnectModal, searchParams, account])

    return (
        <div>
            <ConnectButton showBalance={false} />
        </div>
    )
}

export default WalletConnect
