import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../pages/api/auth/[...nextauth]'
import { SubscribedDAO } from './components/csr'
import { getAverageColor } from 'fast-average-color-node'
import { prisma } from '@senate/database'

const getSubscribedDAOs = async () => {
    const session = await getServerSession(authOptions())
    const userAddress = session?.user?.name ?? ''

    const user = await prisma.user
        .findFirstOrThrow({
            where: {
                name: { equals: userAddress }
            },
            select: {
                id: true
            }
        })
        .catch(() => {
            return { id: '0' }
        })

    const subscriptionsList = await prisma.subscription.findMany({
        where: {
            userId: user.id
        },
        include: {
            dao: {
                include: {
                    handlers: true,
                    proposals: { where: { timeEnd: { gt: new Date() } } }
                }
            }
        },
        orderBy: {
            dao: {
                name: 'asc'
            }
        }
    })

    return subscriptionsList
}

export default async function SubscribedDAOs() {
    const subscriptions = await getSubscribedDAOs()

    const backgroundColors = await Promise.all(
        subscriptions.map(async (sub) => {
            const color = await getAverageColor(
                'https://senatelabs.xyz/' + sub.dao.picture + '.svg',
                { mode: 'precision', algorithm: 'sqrt' }
            ).then((color) => color)
            return {
                daoId: sub.id,
                color: `${color.hex}`
            }
        })
    )

    return (
        <main>
            <div className='grid grid-cols-1 place-items-start gap-10 min-[650px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1150px]:grid-cols-4 min-[1500px]:grid-cols-5 min-[1650px]:grid-cols-6'>
                {subscriptions.map((sub, index) => {
                    return (
                        <SubscribedDAO
                            key={index}
                            daoId={sub.dao.id}
                            daoName={sub.dao.name}
                            daoPicture={sub.dao.picture}
                            bgColor={
                                backgroundColors.find(
                                    (dao) => dao?.daoId == sub.id
                                )?.color
                            }
                            daoHandlers={sub.dao.handlers.map(
                                (handler) => handler.type
                            )}
                            activeProposals={sub.dao.proposals.length}
                            notificationsEnabled={sub.notificationsEnabled}
                        />
                    )
                })}
            </div>
        </main>
    )
}
