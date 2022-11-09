import axios from 'axios'
import { prisma } from '@senate/database'
import { DAOHandler } from '@senate/common-types'
import { Logger, InternalServerErrorException } from '@nestjs/common'

const logger = new Logger('SnapshotVotes')

export const updateSnapshotVotes = async (
    daoHandler: DAOHandler,
    voterAddress: string,
    daoName: string
) => {
    logger.log(`Updating Snapshot votes for ${voterAddress}`)
    let votes

    try {
        votes = await axios
            .get('https://hub.snapshot.org/graphql', {
                method: 'POST',
                data: JSON.stringify({
                    query: `{
            votes(first: 1000, where: {voter: "${voterAddress}", space:"${daoHandler.decoder['space']}"}) {
              id
              voter
              choice
              proposal {
                id
                choices
                title
                body
                created
                start
                end
                link
              }
            }
          }
          `,
                }),
                headers: {
                    'content-type': 'application/json',
                },
            })
            .then((response) => {
                return response.data
            })
            .then((data) => {
                return data.data.votes
            })
            .catch((e) => {
                console.log(e)
                return
            })

        //TODO support multiple choice vote
        if (votes.length)
            for (const vote of votes) {
                const proposal = await prisma.proposal.findFirst({
                    where: {
                        externalId: vote.proposal.id,
                        daoId: daoHandler.daoId,
                        daoHandlerId: daoHandler.id,
                    },
                })

                if (!proposal) {
                    console.log(
                        `Snapshot proposal with externalId ${vote.proposal.id} does not exist in DB`
                    )
                    continue
                }

                const votedOptions = getVotedOptions(
                    vote.choice,
                    vote.proposal.choices,
                    voterAddress,
                    daoHandler.daoId,
                    proposal.id
                )

                for (const votedOption of votedOptions) {
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
                                upsert: {
                                    where: {
                                        voteProposalId_option: {
                                            voteProposalId: proposal.id,
                                            option: String(votedOption.option),
                                        },
                                    },
                                    update: {},
                                    create: votedOption,
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
                                    option:
                                        vote.choice.length > 0
                                            ? String(vote.choice[0])
                                            : String(vote.choice),
                                    optionName:
                                        vote.proposal.choices[
                                            vote.choice - 1
                                        ] ?? 'No name',
                                },
                            },
                        },
                    })
                }
            }
    } catch (err) {
        logger.error('Error while updating snapshot proposals', err)
        throw new InternalServerErrorException()
    }

    console.log(
        `updated ${votes.length} snapshot votes for ${voterAddress} in ${daoName}`
    )
}

const getVotedOptions = (
    choices: any,
    proposalChoices: any,
    userId: string,
    daoId: string,
    proposalId: string
) => {
    const options = []

    if (choices.length > 0) {
        for (let i = 0; i < choices.length; i++) {
            options.push({
                option: String(choices[i]),
                optionName: proposalChoices[choices[i] - 1] ?? 'No name',
                voteUserId: userId,
                voteDaoId: daoId,
                voteProposalId: proposalId,
            })
        }
    } else {
        options.push({
            option: String(choices),
            optionName: proposalChoices[choices - 1] ?? 'No name',
        })
    }

    return options
}
