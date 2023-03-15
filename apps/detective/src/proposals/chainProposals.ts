import { JsonValue, prisma } from '@senate/database'
import { ethers } from 'ethers'
import { aaveProposals } from './chain/aave'
import { compoundProposals } from './chain/compound'
import { makerExecutiveProposals } from './chain/makerExecutive'
import { makerPolls } from './chain/makerPoll'
import { uniswapProposals } from './chain/uniswap'
import { ensProposals } from './chain/ens'
import { gitcoinProposals } from './chain/gitcoin'
import { hopProposals } from './chain/hop'
import { dydxProposals } from './chain/dydx'
import { log_pd } from '@senate/axiom'
import { DAOHandlerType } from '@senate/database'

interface Result {
    externalId: string
    name: string
    daoId: string
    daoHandlerId: string
    timeEnd: Date
    timeStart: Date
    timeCreated: Date
    blockCreated: number
    choices: JsonValue
    scores: JsonValue
    scoresTotal: number
    url: string
}

const infuraProvider = new ethers.JsonRpcProvider(
    String(process.env.INFURA_NODE_URL)
)

const senateProvider = new ethers.JsonRpcProvider(
    String(process.env.SENATE_NODE_URL)
)

export const updateChainProposals = async (daoHandlerId: string) => {
    let response = 'nok'
    const daoHandler = await prisma.dAOHandler.findFirstOrThrow({
        where: { id: daoHandlerId },
        include: { dao: true }
    })

    if (!daoHandler.decoder) {
        return [{ daoHandlerId: daoHandlerId, response: 'nok' }]
    }

    let proposals: Result[], currentBlock: number

    try {
        currentBlock = await senateProvider.getBlockNumber()
    } catch (e) {
        currentBlock = await infuraProvider.getBlockNumber()
    }

    const minBlockNumber = Number(daoHandler.chainIndex)

    // const blockBatchSize =
    //     daoHandler.type == DAOHandlerType.MAKER_EXECUTIVE ? 100000 : 1000000

    const blockBatchSize = 1000000

    const fromBlock = Math.max(minBlockNumber, 1920000)
    const toBlock =
        currentBlock - fromBlock > blockBatchSize
            ? fromBlock + blockBatchSize
            : currentBlock

    const provider: ethers.JsonRpcProvider =
        currentBlock - 50 > fromBlock ? infuraProvider : senateProvider

    try {
        switch (daoHandler.type) {
            case 'AAVE_CHAIN':
                proposals = await aaveProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'COMPOUND_CHAIN':
                proposals = await compoundProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'MAKER_EXECUTIVE':
                proposals = await makerExecutiveProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'MAKER_POLL':
                proposals = await makerPolls(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'UNISWAP_CHAIN':
                proposals = await uniswapProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'ENS_CHAIN':
                proposals = await ensProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'GITCOIN_CHAIN':
                proposals = await gitcoinProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'HOP_CHAIN':
                proposals = await hopProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            case 'DYDX_CHAIN':
                proposals = await dydxProposals(
                    provider,
                    daoHandler,
                    fromBlock,
                    toBlock
                )
                break
            default:
                proposals = []
        }

        await prisma.$transaction(
            proposals.map((proposal) => {
                return prisma.proposal.upsert({
                    where: {
                        externalId_daoId: {
                            externalId: proposal.externalId,
                            daoId: proposal.daoId
                        }
                    },
                    update: {
                        choices: proposal.choices,
                        scores: proposal.scores,
                        scoresTotal: proposal.scoresTotal
                    },
                    create: {
                        name: proposal.name,
                        externalId: proposal.externalId,
                        choices: proposal.choices,
                        scores: proposal.scores,
                        scoresTotal: proposal.scoresTotal,
                        blockCreated: proposal.blockCreated,
                        timeCreated: proposal.timeCreated,
                        timeStart: proposal.timeStart,
                        timeEnd: proposal.timeEnd,
                        url: proposal.url,

                        daoId: daoHandler.daoId,
                        daoHandlerId: daoHandler.id
                    }
                })
            })
        )

        const openProposals = proposals.filter(
            (proposal) => proposal.timeEnd.getTime() > new Date().getTime()
        )

        let newIndex

        if (openProposals.length) {
            newIndex = Math.min(...openProposals.map((p) => p.blockCreated))
        } else {
            newIndex = toBlock
        }

        log_pd.log({
            level: 'info',
            message: `${daoHandler.type} open proposals`,
            openProposals: openProposals,
            newIndex: newIndex
        })

        await prisma.dAOHandler.update({
            where: {
                id: daoHandler.id
            },
            data: {
                chainIndex: newIndex,
                snapshotIndex: new Date('2009-01-09T04:54:25.00Z')
            }
        })

        response = 'ok'
    } catch (e) {
        log_pd.log({
            level: 'error',
            message: `Search for proposals ${daoHandler.dao.name} - ${daoHandler.type}`,
            searchType: 'PROPOSALS',
            sourceType: 'CHAIN',
            currentBlock: currentBlock,
            fromBlock: fromBlock,
            toBlock: toBlock,
            proposals: proposals,
            provider: provider._getConnection().url,
            errorName: (e as Error).name,
            errorMessage: (e as Error).message,
            errorStack: (e as Error).stack
        })
    }

    const res = [{ daoHandlerId: daoHandlerId, response: response }]
    log_pd.log({
        level: 'info',
        message: `FINISHED updating proposals ${daoHandler.dao.name} - ${daoHandler.type}`,
        searchType: 'PROPOSALS',
        sourceType: 'CHAIN',
        currentBlock: currentBlock,
        fromBlock: fromBlock,
        toBlock: toBlock,
        proposals: proposals,
        provider: provider._getConnection().url,
        response: res
    })

    return res
}
