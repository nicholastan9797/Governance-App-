import { prisma } from '@senate/database'
import { BigNumber, ethers } from 'ethers'
import { hexZeroPad } from 'ethers/lib/utils'
import { Logger, InternalServerErrorException } from '@nestjs/common'
import { Proposal, DAOHandler } from '@senate/common-types'

const provider = new ethers.providers.JsonRpcProvider({
    url: String(process.env.PROVIDER_URL),
})

const logger = new Logger('MakerPollVotes')

export const updateMakerPollVotes = async (
    daoHandler: DAOHandler,
    voterAddress: string
) => {
    logger.log('Updating Maker Poll votes')
    let votes

    try {
        const voterLatestVoteBlock =
            await prisma.voterLatestVoteBlock.findFirst({
                where: {
                    voterAddress: voterAddress,
                    daoHandlerId: daoHandler.id,
                },
            })

        const latestVoteBlock = voterLatestVoteBlock
            ? Number(voterLatestVoteBlock.latestVoteBlock)
            : 0
        const currentBlock = await provider.getBlockNumber()

        votes = await getVotes(daoHandler, voterAddress, latestVoteBlock)
        if (!votes) return

        for (const vote of votes) {
            const proposal = await prisma.proposal.findFirst({
                where: {
                    externalId: vote.proposalOnChainId,
                    daoId: daoHandler.daoId,
                    daoHandlerId: daoHandler.id,
                },
            })

            if (!proposal) {
                logger.error(
                    `Poll with externalId ${vote.proposalOnChainId} does not exist in DB for daoId: ${daoHandler.daoId} & daoHandlerId: ${daoHandler.id}`
                )
                continue
            }

            await prisma.vote.upsert({
                where: {
                    voterAddress_daoId_proposalId: {
                        voterAddress: voterAddress,
                        daoId: daoHandler.daoId,
                        proposalId: proposal.id,
                    },
                },
                update: {
                    options: {
                        update: {
                            where: {
                                voteProposalId_option: {
                                    voteProposalId: proposal.id,
                                    option: vote.support,
                                },
                            },
                            data: {
                                option: vote.support,
                                optionName: vote.support ? 'Yes' : 'No',
                            },
                        },
                    },
                },
                create: {
                    voterAddress: voterAddress,
                    daoId: daoHandler.daoId,
                    proposalId: proposal.id,
                    daoHandlerId: daoHandler.id,
                    options: {
                        create: {
                            option: vote.support,
                            optionName: vote.support ? 'Yes' : 'No',
                        },
                    },
                },
            })

            await prisma.voterLatestVoteBlock.upsert({
                where: {
                    voterAddress_daoHandlerId: {
                        voterAddress: voterAddress,
                        daoHandlerId: daoHandler.id,
                    },
                },
                update: {
                    latestVoteBlock: currentBlock,
                },
                create: {
                    voterAddress: voterAddress,
                    daoHandlerId: daoHandler.id,
                    latestVoteBlock: currentBlock,
                },
            })
        }
    } catch (err) {
        logger.error('Error while updating maker executive proposals', err)
        throw new InternalServerErrorException()
    }

    console.log(`updated ${votes.length} maker poll votes`)
}

const getVotes = async (
    daoHandler: DAOHandler,
    voterAddress: string,
    latestVoteBlock: number
): Promise<any> => {
    if (!daoHandler.decoder) return
    if (!Array.isArray(daoHandler.decoder)) return

    const iface = new ethers.utils.Interface(
        JSON.parse(daoHandler.decoder['abi'])
    )

    const logs = await provider.getLogs({
        fromBlock: latestVoteBlock,
        address: daoHandler.decoder['address'],
        topics: [iface.getEventTopic('Voted'), hexZeroPad(voterAddress, 32)],
    })

    const votes = logs.map((log) => {
        const eventData = iface.parseLog({
            topics: log.topics,
            data: log.data,
        }).args

        return {
            proposalOnChainId: BigNumber.from(eventData.pollId).toString(),
            support: BigNumber.from(eventData.optionId).toString(),
        }
    })

    return votes
}
