import { Prisma, PrismaClient } from '@prisma/client'

export type { JsonArray, JsonValue } from 'type-fest'

export {
    type PrismaClient,
    type Proposal,
    type Voter,
    type VoterHandler,
    type Vote,
    type Subscription,
    type RefreshQueue,
    type DAO,
    type Notification,
    type User,
    RefreshStatus,
    RefreshType,
    DAOHandlerType,
    RoundupNotificationType,
    type DAOHandler
} from '@prisma/client'

export type Decoder = {
    address?: string
    proposalUrl?: string
    space?: string

    proxyAddress?: string

    //makerpools
    address_vote?: string
    address_create?: string
}

export type RefreshArgs = {
    voters: string[]
}

export type ProposalType = Prisma.ProposalGetPayload<{
    include: { votes: true; dao: true }
}>

export type SubscriptionType = Prisma.SubscriptionGetPayload<{
    include: { dao: true }
}>

export type DAOHandlerWithDAO = Prisma.DAOHandlerGetPayload<{
    include: { dao: true }
}>

export type DAOType = Prisma.DAOGetPayload<{
    include: {
        handlers: true
        subscriptions: true
    }
}>

export type UserWithVotingAddresses = Prisma.UserGetPayload<{
    include: {
        voters: true
    }
}>

// function RetryTransactions(options?: Partial<IBackOffOptions>) {
//     return Prisma.defineExtension((prisma) =>
//         prisma.$extends({
//             client: {
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                 $transaction(...args: any) {
//                     return backOff(
//                         // eslint-disable-next-line prefer-spread
//                         () => prisma.$transaction.apply(prisma, args),
//                         {
//                             retry: (e) => {
//                                 // Retry the transaction only if the error was due to a write conflict or deadlock
//                                 // See: https://www.prisma.io/docs/reference/api-reference/error-reference#p2034
//                                 return e.code === 'P2034' || e.code === 'P1001'
//                             },
//                             ...options
//                         }
//                     )
//                 }
//             } as { $transaction: (typeof prisma)['$transaction'] }
//         })
//     )
// }

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const p = globalForPrisma.prisma || new PrismaClient()

export const prisma = p
//     .$extends(
//     RetryTransactions({
//         jitter: 'full',
//         numOfAttempts: 3
//     })
// )
