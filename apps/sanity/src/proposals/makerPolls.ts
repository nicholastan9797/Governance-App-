import {
    prisma,
    type DAOHandler,
    DAOHandlerType,
    type Decoder,
    type Proposal
} from '@senate/database'

import { schedule } from 'node-cron'
import { log_sanity } from '@senate/axiom'
import {getAbi, getClosestBlock} from '.././utils'
import {ethers} from 'ethers'

export const makerPollsSanity = schedule('49 * * * *', async () => {
    log_sanity.log({
        level: 'info',
        message: '[PROPOSALS] Starting sanity check for Maker polls',
        date: new Date(Date.now())
    })

    const SEARCH_FROM: number = Date.now() - 1250 * 60 * 60 * 1000 // hours * minutes * seconds * milliseconds
    const SEARCH_TO: number = Date.now() - 15 * 60 * 1000 //  minutes * seconds * milliseconds

    try {
        const daoHandler: DAOHandler = await prisma.daohandler.findFirst({
            where: {
                type: DAOHandlerType.MAKER_POLL
            }
        })

        const proposalsFromDatabase = await fetchProposalsFromDatabase(
            daoHandler.id,
            new Date(SEARCH_FROM),
            new Date(SEARCH_TO)
        )

        const provider = new ethers.JsonRpcProvider(
            String(process.env.ALCHEMY_NODE_URL)
        )

        const fromBlock = await getClosestBlock(SEARCH_FROM, provider)
        const toBlock = await getClosestBlock(SEARCH_TO, provider)
 
        const pollCreatedEvents = await fetchPollEvents(
            'PollCreated',
            fromBlock,
            toBlock,
            daoHandler,
            provider
        )

        const pollWithdrawnEvents = await fetchPollEvents(
            'PollWithdrawn',
            fromBlock,
            toBlock,
            daoHandler,
            provider
        )

        const validPollIds : string[] = pollCreatedEvents
            .filter(event => !pollWithdrawnEvents.includes(event.pollId)) 
            .map(event => event.pollId.toString())

        const pollsNotInDatabase: string[] =
        validPollIds.filter((pollId: string) => {
            return !proposalsFromDatabase
                .map((proposal: Proposal) => proposal.externalid)
                .includes(pollId)
        })

        const withdrawnPollsStillInDatabase : Proposal[] = await prisma.proposal.findMany({
            where: {
                daohandlerid: daoHandler.id,
                externalid: {
                    in: pollWithdrawnEvents.map(event => event.pollId.toString())
                }
            }
        })
        
        if (pollsNotInDatabase.length > 0) {
            log_sanity.log({
                level: 'warn',
                message: `Missing proposals: ${pollsNotInDatabase.length} proposals`,
                proposals: pollsNotInDatabase
            })
        }

        if (withdrawnPollsStillInDatabase.length > 0) {
            log_sanity.log({
                level: 'warn',
                message: `Found ${withdrawnPollsStillInDatabase.length} proposals to remove`,
                proposals: withdrawnPollsStillInDatabase
            })

            const deletedVotes = prisma.vote.deleteMany({
                where: {
                    proposalid: {
                        in: withdrawnPollsStillInDatabase.map(proposal => proposal.id)
                    }
                }
            })

            const deletedProposals = prisma.proposal.deleteMany({
                where: {
                    id: {
                        in: withdrawnPollsStillInDatabase.map(proposal => proposal.id)
                    }
                }
            })

            const deletedRows = await prisma.$transaction([deletedVotes, deletedProposals])

            log_sanity.log({
                level: 'info',
                message: `Deleted ${deletedRows.length} rows`,
                deletedRows: deletedRows
            })
        }

        log_sanity.log({
            level: 'info',
            message: '[PROPOSALS] FINISHED sanity check for Maker polls'
        })


    } catch (e) {
        log_sanity.log({
            level: 'error',
            message: `[PROPOSALS] Failed sanity check for Maker polls`,
            errorName: (e as Error).name,
            errorMessage: (e as Error).message,
            errorStack: (e as Error).stack,
        })
    }
})

const fetchPollEvents = async (
    eventName: string,
    fromBlock: number,
    toBlock: number,
    daoHandler: DAOHandler,
    provider: ethers.JsonRpcProvider
) : Promise<ethers.Result[]> => {
    const abi = await getAbi(
        (daoHandler.decoder as Decoder).address_create,
        'ethereum'
    )
    const govIface = new ethers.Interface(abi)

    const logs = await provider.getLogs({
        fromBlock: fromBlock,
        toBlock: toBlock,
        address: (daoHandler.decoder as Decoder).address_create,
        topics: [govIface.getEvent(`${eventName}`).topicHash]
    })

    const eventsData = logs.map((log) => (
        govIface.parseLog({
            topics: log.topics as string[],
            data: log.data
        }).args
    ))

    return eventsData
}

const fetchProposalsFromDatabase = async (
    daoHandlerId: string,
    searchFrom: Date,
    searchTo: Date
): Promise<Proposal[]> => {
    return await prisma.proposal.findMany({
        where: {
            daohandlerid: daoHandlerId,
            timecreated: {
                gte: searchFrom,
                lte: searchTo
            }
        }
    })
}