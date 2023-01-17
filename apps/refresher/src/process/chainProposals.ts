import { log_ref } from '@senate/axiom'
import { RefreshQueue, RefreshStatus, prisma } from '@senate/database'
import superagent from 'superagent'
import { DAOS_PROPOSALS_CHAIN_INTERVAL_FORCE } from '../config'

export const processChainProposals = async (item: RefreshQueue) => {
    const daoHandler = await prisma.dAOHandler.findFirst({
        where: { id: item.clientId }
    })

    log_ref.log({
        level: 'info',
        message: `Process dao chain proposals item`,
        data: {
            daoHandler: daoHandler
        }
    })

    const proposalDetectiveReq = `${
        process.env.DETECTIVE_URL
    }/updateChainProposals?daoHandlerId=${
        item.clientId
    }&minBlockNumber=${daoHandler?.lastChainProposalCreatedBlock?.valueOf()}`

    log_ref.log({
        level: 'info',
        message: `Chain dao proposals detective request`,
        data: {
            url: proposalDetectiveReq
        }
    })

    let tries = 0
    await superagent
        .post(proposalDetectiveReq)
        .type('application/json')
        .timeout({
            response: DAOS_PROPOSALS_CHAIN_INTERVAL_FORCE * 60 * 1000 - 5000,
            deadline: DAOS_PROPOSALS_CHAIN_INTERVAL_FORCE * 60 * 1000 - 5000
        })
        .retry(3, (err, res) => {
            if (res.status == 201) return false
            tries++
            if (tries > 1)
                log_ref.log({
                    level: 'warn',
                    message: `Retry Chain dao proposals detective request`,
                    data: {
                        url: proposalDetectiveReq,
                        error: JSON.stringify(err),
                        res: JSON.stringify(res)
                    }
                })
            if (err) return true
        })
        .then(async (response) => response.body)
        .then(async (data) => {
            log_ref.log({
                level: 'info',
                message: `Chain dao proposals detective response`,
                data: {
                    data: data
                }
            })

            if (!data) return
            if (!Array.isArray(data)) return

            await prisma.dAOHandler
                .updateMany({
                    where: {
                        id: {
                            in: data
                                .filter((result) => result.response == 'ok')
                                .map((result) => result.daoHandlerId)
                        }
                    },
                    data: {
                        refreshStatus: RefreshStatus.DONE,
                        lastRefreshTimestamp: new Date()
                    }
                })
                .then((r) => {
                    log_ref.log({
                        level: 'info',
                        message: `Succesfully updated refresh status for ok responses`,
                        data: {
                            voters: data
                                .filter((result) => result.response == 'ok')
                                .map((result) => result.daoHandlerId),
                            result: r
                        }
                    })
                    return
                })
                .catch((e) => {
                    log_ref.log({
                        level: 'error',
                        message: `Could not update refresh status for ok responses`,
                        data: {
                            voters: data
                                .filter((result) => result.response == 'ok')
                                .map((result) => result.daoHandlerId),
                            error: e
                        }
                    })
                })

            await prisma.dAOHandler
                .updateMany({
                    where: {
                        id: {
                            in: data
                                .filter((result) => result.response == 'nok')
                                .map((result) => result.daoHandlerId)
                        }
                    },
                    data: {
                        refreshStatus: RefreshStatus.NEW,
                        lastRefreshTimestamp: new Date(0),
                        lastChainProposalCreatedBlock: 0,
                        lastSnapshotProposalCreatedTimestamp: new Date(0)
                    }
                })
                .then((r) => {
                    log_ref.log({
                        level: 'info',
                        message: `Succesfully updated refresh status for nok responses`,
                        data: {
                            voters: data
                                .filter((result) => result.response == 'nok')
                                .map((result) => result.daoHandlerId),
                            result: r
                        }
                    })
                    return
                })
                .catch((e) => {
                    log_ref.log({
                        level: 'error',
                        message: `Could not update refresh status for nok responses`,
                        data: {
                            voters: data
                                .filter((result) => result.response == 'nok')
                                .map((result) => result.daoHandlerId),
                            error: e
                        }
                    })
                })

            return
        })
        .catch(async (e) => {
            log_ref.log({
                level: 'error',
                message: `Chain dao proposals detective request failed`,
                data: {
                    url: proposalDetectiveReq,
                    error: e
                }
            })

            await prisma.dAOHandler
                .update({
                    where: {
                        id: item.clientId
                    },
                    data: {
                        refreshStatus: RefreshStatus.NEW,
                        lastRefreshTimestamp: new Date(0),
                        lastChainProposalCreatedBlock: 0,
                        lastSnapshotProposalCreatedTimestamp: new Date(0)
                    }
                }) // eslint-disable-next-line promise/no-nesting
                .then((r) => {
                    log_ref.log({
                        level: 'info',
                        message: `Succesfully forced refresh for all failed daos`,
                        data: {
                            daoHandlerId: item.clientId,
                            result: r
                        }
                    })
                    return
                })
                // eslint-disable-next-line promise/no-nesting
                .catch((e) => {
                    log_ref.log({
                        level: 'error',
                        message: `Failed to force refresh for all failed daos`,
                        data: {
                            daoHandlerId: item.clientId,
                            error: e
                        }
                    })
                })
        })
}
