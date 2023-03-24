/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 */

import type { Context } from './context'
import {
    inferRouterInputs,
    inferRouterOutputs,
    initTRPC,
    TRPCError
} from '@trpc/server'
import superjson from 'superjson'
import { AppRouter } from './routers/_app'

const t = initTRPC.context<Context>().create({
    /**
     * @see https://trpc.io/docs/v10/data-transformers
     */
    transformer: superjson,
    errorFormatter: ({ shape }) => {
        return {
            ...shape,
            data: {
                ...shape.data
            }
        }
    }

    /**
     * @see https://trpc.io/docs/v10/error-formatting
     */
})

/**
 * Create a router
 * @see https://trpc.io/docs/v10/router
 */
export const router = t.router

/**
 * Create an unprotected procedure
 * @see https://trpc.io/docs/v10/procedures
 **/
export const publicProcedure = t.procedure

/**
 * @see https://trpc.io/docs/v10/middlewares
 */
export const middleware = t.middleware

/**
 * @see https://trpc.io/docs/v10/merging-routers
 */
export const mergeRouters = t.mergeRouters

/**
 * Create an private procedure
 * @see https://trpc.io/docs/v10/procedures
 **/
export const privateProcedure = t.procedure.use((opts) => {
    if (!opts.ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You have to be logged in to do this'
        })
    }
    return opts.next({
        ctx: {
            user: opts.ctx.user
        }
    })
})
/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>
