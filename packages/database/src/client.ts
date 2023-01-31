import { Prisma, PrismaClient } from '@prisma/client'
import { IBackOffOptions, backOff } from 'exponential-backoff'
import { log_prisma } from '@senate/axiom'

function RetryTransactions(options?: Partial<IBackOffOptions>) {
    return Prisma.defineExtension((prisma) =>
        prisma.$extends({
            client: {
                $transaction(...args: any) {
                    return backOff(
                        // eslint-disable-next-line prefer-spread
                        () => prisma.$transaction.apply(prisma, args),
                        {
                            retry: (e) => {
                                // Retry the transaction only if the error was due to a write conflict or deadlock
                                // See: https://www.prisma.io/docs/reference/api-reference/error-reference#p2034
                                log_prisma.log({
                                    level: 'warn',
                                    message: `Retrying prisma transaction`,
                                    error: e
                                })
                                return e.code === 'P2034' || e.code === 'P1001'
                            },
                            ...options
                        }
                    )
                }
            } as { $transaction: (typeof prisma)['$transaction'] }
        })
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = global as unknown as { prisma: any }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient().$extends(
        RetryTransactions({
            jitter: 'full',
            numOfAttempts: 3
        })
    )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
