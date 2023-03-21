import { Injectable } from '@nestjs/common'

import { updateSnapshotProposals } from './proposals/snapshotProposals'
import { updateSnapshotDaoVotes } from './votes/snapshotDaoVotes'
import { updateChainProposals } from './proposals/chainProposals'
import { updateChainDaoVotes } from './votes/chainDaoVotes'

@Injectable()
export class AppService {
    //SNAPSHOT PROPOSALS
    async updateSnapshotProposals(
        daoHandlerId: string
    ): Promise<Array<{ daoHandlerId: string; response: string }>> {
        return await updateSnapshotProposals(daoHandlerId)
    }

    //SNAPSHOT VOTES
    async updateSnapshotDaoVotes(
        daoHandlerId: string,
        voters: string[]
    ): Promise<Array<{ voterAddress: string; response: string }>> {
        return await updateSnapshotDaoVotes(daoHandlerId, voters)
    }

    //CHAIN PROPOSALS
    async updateChainProposals(
        daoHandlerId: string
    ): Promise<Array<{ daoHandlerId: string; response: string }>> {
        return await updateChainProposals(daoHandlerId)
    }

    //CHAIN VOTES
    async updateChainDaoVotes(
        daoHandlerId: string,
        voters: string[]
    ): Promise<Array<{ voterAddress: string; response: string }>> {
        return await updateChainDaoVotes(daoHandlerId, voters)
    }
}
