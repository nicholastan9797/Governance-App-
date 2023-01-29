import { log_pd } from '@senate/axiom'
import { DAOHandler } from '@senate/database'
import { ethers } from 'ethers'

export const ensProposals = async (
    provider: ethers.providers.JsonRpcProvider,
    daoHandler: DAOHandler,
    fromBlock: number,
    toBlock: number
) => {
    const ozGovernorInterface = new ethers.utils.Interface(
        daoHandler.decoder['abi']
    )

    const logs = await provider.getLogs({
        fromBlock: fromBlock,
        toBlock: toBlock,
        address: daoHandler.decoder['address'],
        topics: [ozGovernorInterface.getEventTopic('ProposalCreated')]
    })

    const args = logs.map((log) => ({
        txBlock: log.blockNumber,
        txHash: log.transactionHash,
        eventData: ozGovernorInterface.parseLog({
            topics: log.topics,
            data: log.data
        }).args
    }))

    const proposals =
        (
            await Promise.all(
                args.map(async (arg) => {
                    const proposalCreatedTimestamp = (
                        await provider.getBlock(arg.txBlock)
                    ).timestamp

                    const votingStartsTimestamp =
                        proposalCreatedTimestamp +
                        (arg.eventData.startBlock - arg.txBlock) * 12
                    const votingEndsTimestamp =
                        proposalCreatedTimestamp +
                        (arg.eventData.endBlock - arg.txBlock) * 12
                    const title = await formatTitle(arg.eventData.description)
                    const proposalOnChainId =
                        arg.eventData.proposalId.toString()
                    const proposalUrl =
                        daoHandler.decoder['proposalUrl'] + proposalOnChainId

                    return {
                        externalId: proposalOnChainId,
                        name: String(title).slice(0, 1024),
                        daoId: daoHandler.daoId,
                        daoHandlerId: daoHandler.id,
                        timeEnd: new Date(votingEndsTimestamp * 1000),
                        timeStart: new Date(votingStartsTimestamp * 1000),
                        timeCreated: new Date(proposalCreatedTimestamp * 1000),
                        url: proposalUrl
                    }
                })
            )
        ).filter((n) => n) ?? []

    return proposals
}

const formatTitle = async (text: string): Promise<string> => {
    const temp = text.split('\n')[0]

    if (!temp) {
        log_pd.log({
            level: 'warn',
            message: `Could not get proposal title`,
            text: text
        })
        return 'Title unavailable'
    }

    if (temp[0] === '#') {
        return temp.substring(2)
    }

    return temp
}
