import { WinstonTransport as AxiomTransport } from '@axiomhq/axiom-node'
import { format, transports, loggers } from 'winston'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(BigInt.prototype as any).toJSON = function () {
    return this.toString()
}

loggers.add('proposal-detective', {
    format: format.combine(
        format.json(),
        format.label({ label: 'proposal-detective' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

loggers.add('refresher', {
    format: format.combine(
        format.json(),
        format.label({ label: 'refresher' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

loggers.add('bulletin', {
    format: format.combine(
        format.json(),
        format.label({ label: 'bulletin' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

loggers.add('node', {
    format: format.combine(
        format.json(),
        format.label({ label: 'node' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

loggers.add('prisma', {
    format: format.combine(
        format.json(),
        format.label({ label: 'prisma' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

loggers.add('sanity', {
    format: format.combine(
        format.json(),
        format.label({ label: 'sanity' }),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.ms(),
        format.metadata(),
        format.errors({ stack: true })
    ),
    transports: [
        new AxiomTransport({
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
            orgId: process.env.AXIOM_ORG_ID
        }),
        new transports.Console()
    ]
})

export const log_pd = loggers.get('proposal-detective')
export const log_ref = loggers.get('refresher')
export const log_bul = loggers.get('bulletin')
export const log_node = loggers.get('node')
export const log_prisma = loggers.get('prisma')
export const log_sanity = loggers.get('sanity')
