import { log_ref } from '@senate/axiom'
import { bin } from 'd3-array'
import { config } from '../config'
import {
    DAOHandlerType,
    RefreshStatus,
    prisma,
    type VoterHandler
} from '@senate/database'
import { RefreshType, refreshQueue } from '..'

export const addChainDaoVotes = async () => {
    const normalRefresh = new Date(
        Date.now() - config.DAOS_VOTES_CHAIN_INTERVAL * 60 * 1000
    )
    const forceRefresh = new Date(
        Date.now() - config.DAOS_VOTES_CHAIN_INTERVAL_FORCE * 60 * 1000
    )
    const newRefresh = new Date(Date.now() - 5 * 1000)

    await prisma.$transaction(
        async (tx) => {
            let daoHandlers = await tx.dAOHandler.findMany({
                where: {
                    type: {
                        in: [
                            DAOHandlerType.AAVE_CHAIN,
                            DAOHandlerType.COMPOUND_CHAIN,
                            DAOHandlerType.MAKER_EXECUTIVE,
                            DAOHandlerType.MAKER_POLL,
                            DAOHandlerType.MAKER_POLL_ARBITRUM,
                            DAOHandlerType.UNISWAP_CHAIN,
                            DAOHandlerType.ENS_CHAIN,
                            DAOHandlerType.GITCOIN_CHAIN,
                            DAOHandlerType.HOP_CHAIN,
                            DAOHandlerType.DYDX_CHAIN
                        ]
                    },
                    voterHandlers: {
                        some: {
                            OR: [
                                {
                                    refreshStatus: RefreshStatus.DONE,
                                    lastRefresh: {
                                        lt: normalRefresh
                                    }
                                },
                                {
                                    refreshStatus: RefreshStatus.PENDING,
                                    lastRefresh: {
                                        lt: forceRefresh
                                    }
                                },
                                {
                                    refreshStatus: RefreshStatus.NEW,
                                    lastRefresh: {
                                        lt: newRefresh
                                    }
                                }
                            ]
                        }
                    }
                },
                include: {
                    voterHandlers: {
                        where: {
                            OR: [
                                {
                                    refreshStatus: RefreshStatus.DONE,
                                    lastRefresh: {
                                        lt: normalRefresh
                                    }
                                },
                                {
                                    refreshStatus: RefreshStatus.PENDING,
                                    lastRefresh: {
                                        lt: forceRefresh
                                    }
                                },
                                {
                                    refreshStatus: RefreshStatus.NEW,
                                    lastRefresh: {
                                        lt: newRefresh
                                    }
                                }
                            ]
                        },
                        include: { voter: true }
                    },
                    dao: true,
                    proposals: true
                }
            })

            daoHandlers = daoHandlers.filter(
                (daoHandler) =>
                    daoHandler.proposals.length &&
                    daoHandler.type != DAOHandlerType.MAKER_POLL_ARBITRUM
            )

            if (!daoHandlers.length) {
                return
            }

            const previousPrio = Math.max(
                ...refreshQueue
                    .filter((o) => o.refreshType == RefreshType.DAOCHAINVOTES)
                    .map((o) => o.priority),
                0
            )

            let voterHandlerToRefresh: VoterHandler[] = []

            const refreshEntries = daoHandlers
                .map((daoHandler) => {
                    const voterHandlers = daoHandler.voterHandlers

                    const voteTimestamps = voterHandlers.map((voterHandler) =>
                        Number(voterHandler.chainIndex)
                    )

                    const domainLimit =
                        daoHandler.type === DAOHandlerType.MAKER_POLL_ARBITRUM
                            ? 100000000
                            : 17000000

                    const voteTimestampBuckets = bin()
                        .domain([0, domainLimit])
                        .thresholds(10)(voteTimestamps)

                    const refreshItemsDao = voteTimestampBuckets
                        .map((bucket) => {
                            const bucketMax = Number(bucket['x1'])
                            const bucketMin = Number(bucket['x0'])

                            const bucketVh = voterHandlers
                                .filter(
                                    (voterHandler) =>
                                        bucketMin <=
                                            Number(voterHandler.chainIndex) &&
                                        Number(voterHandler.chainIndex) <
                                            bucketMax
                                )
                                .slice(0, 100)

                            voterHandlerToRefresh = [
                                ...voterHandlerToRefresh,
                                ...bucketVh
                            ]

                            return {
                                handlerId: daoHandler.id,
                                refreshType: RefreshType.DAOCHAINVOTES,
                                args: {
                                    voters: bucketVh.map(
                                        (vhandler) => vhandler.voter.address
                                    )
                                },
                                priority: Number(previousPrio) + 1
                            }
                        })
                        .filter((el) => el.args.voters.length)

                    log_ref.log({
                        level: 'info',
                        message: `Added refresh items to queue`,
                        dao: daoHandler.dao.name,
                        daoHandler: daoHandler.id,
                        type: RefreshType.DAOCHAINVOTES,
                        noOfBuckets: refreshItemsDao.length,
                        items: refreshItemsDao
                    })

                    return refreshItemsDao
                })
                .flat(2)

            refreshQueue.push(...refreshEntries)

            await tx.voterHandler.updateMany({
                where: { id: { in: voterHandlerToRefresh.map((v) => v.id) } },
                data: {
                    refreshStatus: RefreshStatus.PENDING,
                    lastRefresh: new Date()
                }
            })
        },
        {
            maxWait: 50000,
            timeout: 10000
        }
    )
}
