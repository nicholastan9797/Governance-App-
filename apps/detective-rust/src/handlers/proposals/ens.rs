use crate::contracts::ensgov::ensgov::ProposalCreatedFilter;
use crate::prisma::ProposalState;
use crate::{contracts::ensgov, Ctx};
use crate::{prisma::daohandler, router::chain_proposals::ChainProposal};
use anyhow::Result;
use ethers::providers::Middleware;
use ethers::types::U256;
use ethers::{prelude::LogMeta, types::Address};
use futures::stream::{FuturesUnordered, StreamExt};
use prisma_client_rust::{
    bigdecimal::ToPrimitive,
    chrono::{DateTime, NaiveDateTime, Utc},
};
use serde::Deserialize;
use std::str;

#[allow(non_snake_case)]
#[derive(Debug, Deserialize)]
struct Decoder {
    address: String,
    proposalUrl: String,
}

pub async fn ens_proposals(
    ctx: &Ctx,
    dao_handler: &daohandler::Data,
    from_block: &i64,
    to_block: &i64,
) -> Result<Vec<ChainProposal>> {
    let decoder: Decoder = serde_json::from_value(dao_handler.clone().decoder)?;

    let address = decoder.address.parse::<Address>().expect("bad address");

    let gov_contract = ensgov::ensgov::ensgov::new(address, ctx.client.clone());

    let events = gov_contract
        .proposal_created_filter()
        .from_block(*from_block)
        .to_block(*to_block);

    let proposals = events.query_with_meta().await?;

    let mut futures = FuturesUnordered::new();

    for p in proposals.iter() {
        futures.push(async {
            data_for_proposal(p.clone(), ctx, &decoder, dao_handler, gov_contract.clone()).await
        });
    }

    let mut result = Vec::new();
    while let Some(proposal) = futures.next().await {
        result.push(proposal?);
    }

    Ok(result)
}

async fn data_for_proposal(
    p: (ensgov::ensgov::ProposalCreatedFilter, LogMeta),
    ctx: &Ctx,
    decoder: &Decoder,
    dao_handler: &daohandler::Data,
    gov_contract: ensgov::ensgov::ensgov<ethers::providers::Provider<ethers::providers::Http>>,
) -> Result<ChainProposal> {
    let (log, meta): (ProposalCreatedFilter, LogMeta) = p.clone();

    let block_created = meta.block_number;

    let created_b = ctx.client.get_block(meta.clone().block_number).await?;
    let voting_start_b = log.clone().start_block.as_u64();
    let voting_end_b = log.clone().end_block.as_u64();

    let created_timestamp = created_b.expect("bad block").time()?;

    let voting_starts_block = ctx.client.get_block(voting_start_b).await?;
    let voting_ends_block = ctx.client.get_block(voting_end_b).await?;

    let voting_starts_timestamp = match voting_starts_block {
        Some(block) => block.time().expect("bad block timestamp"),
        None => DateTime::from_utc(
            NaiveDateTime::from_timestamp_millis(
                created_timestamp.timestamp() * 1000
                    + (log.start_block.as_u64().to_i64().expect("bad conversion")
                        - meta.block_number.as_u64().to_i64().expect("bad conversion"))
                        * 12
                        * 1000,
            )
            .expect("bad timestamp"),
            Utc,
        ),
    };
    let voting_ends_timestamp = match voting_ends_block {
        Some(block) => block.time().expect("bad block timestamp"),
        None => DateTime::from_utc(
            NaiveDateTime::from_timestamp_millis(
                created_timestamp.timestamp() * 1000
                    + (log.end_block.as_u64().to_i64().expect("bad conversion")
                        - meta.block_number.as_u64().to_i64().expect("bad conversion"))
                        * 12
                        * 1000,
            )
            .expect("bad timestamp"),
            Utc,
        ),
    };

    let mut title = format!(
        "{:.120}",
        log.description
            .to_string()
            .split('\n')
            .next()
            .unwrap_or("Unknown")
            .to_string()
    );

    if title.is_empty() {
        title = "Unknown".into()
    }

    let proposal_url = format!("{}{}", decoder.proposalUrl, log.proposal_id);

    let proposal_external_id = log.proposal_id.to_string();

    let onchain_proposal = gov_contract.proposal_votes(log.proposal_id).call().await?;

    let choices = vec!["For", "Abstain", "Against"];

    let scores = vec![
        onchain_proposal.0.as_u128(),
        onchain_proposal.1.as_u128(),
        onchain_proposal.2.as_u128(),
    ];

    let scores_total =
        onchain_proposal.0.as_u128() + onchain_proposal.1.as_u128() + onchain_proposal.2.as_u128();

    let quorum = gov_contract
        .quorum(U256::from(meta.block_number.as_u64()))
        .call()
        .await?;

    let proposal_state = gov_contract.state(log.proposal_id).call().await?;

    let state = match proposal_state {
        0 => ProposalState::Pending,
        1 => ProposalState::Active,
        2 => ProposalState::Canceled,
        3 => ProposalState::Defeated,
        4 => ProposalState::Succeeded,
        5 => ProposalState::Queued,
        6 => ProposalState::Expired,
        7 => ProposalState::Executed,
        _ => ProposalState::Unknown,
    };

    let proposal = ChainProposal {
        external_id: proposal_external_id,
        name: title,
        dao_id: dao_handler.clone().daoid,
        dao_handler_id: dao_handler.clone().id,
        time_start: voting_starts_timestamp,
        time_end: voting_ends_timestamp,
        time_created: created_timestamp,
        block_created: block_created.as_u64().to_i64().expect("bad conversion"),
        choices: choices.into(),
        scores: scores.into(),
        scores_total: scores_total.into(),
        quorum: quorum.as_u128().into(),
        url: proposal_url,
        state: state,
    };

    Ok(proposal)
}
