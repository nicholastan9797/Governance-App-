use std::sync::Arc;

use crate::{
    prisma::{self, subscription, DaoHandlerType, PrismaClient, ProposalState},
    utils::vote::get_vote,
};
use anyhow::Result;
use log::info;
use prisma_client_rust::chrono::{self, Utc};
use serenity::{json::Value, model::prelude::Embed, utils::Colour};

prisma::proposal::include!(proposal_with_dao { dao daohandler });

pub async fn get_new_embeds(username: &String, client: &Arc<PrismaClient>) -> Result<Vec<Value>> {
    let mut proposals = get_new_proposals(&username, client).await?;
    proposals.sort_by_key(|p| p.timeend);
    let embeds = build_new_embeds(&username, proposals).await?;
    Ok(embeds)
}

pub async fn build_new_embeds(
    username: &String,
    proposals: Vec<proposal_with_dao::Data>,
) -> Result<Vec<Value>> {
    let mut embeds: Vec<Value> = vec![];

    for proposal in proposals {
        let voted = get_vote(username.clone(), proposal.id.to_string())
            .await
            .unwrap();

        info!("{:?}", voted);

        if voted {
            embeds.push(Embed::fake(|e| {
                e.title(proposal.name)
                    .description(format!(
                        "**{}** {} proposal ending <t:{}:R>",
                        proposal.dao.name,
                        if proposal.daohandler.r#type == DaoHandlerType::Snapshot {
                            "off-chain"
                        } else {
                            "on-chain"
                        },
                        proposal.timeend.timestamp()
                    ))
                    .url(proposal.url)
                    .colour(Colour::from_rgb(0, 128, 0))
                    .thumbnail("https://www.senatelabs.xyz/assets/Discord/Voted_large.png")
                    .image("https://placehold.co/2000x1/png")
            }));
        } else {
            embeds.push(Embed::fake(|e| {
                e.title(proposal.name)
                    .description(format!(
                        "**{}** {} proposal ending <t:{}:R>",
                        proposal.dao.name,
                        if proposal.daohandler.r#type == DaoHandlerType::Snapshot {
                            "off-chain"
                        } else {
                            "on-chain"
                        },
                        proposal.timeend.timestamp()
                    ))
                    .url(proposal.url)
                    .colour(Colour::from_rgb(255, 0, 0))
                    .thumbnail("https://www.senatelabs.xyz/assets/Discord/NotVotedYet_large.png")
                    .image("https://placehold.co/2000x1/png")
            }));
        }
    }
    Ok(embeds)
}

pub async fn get_new_proposals(
    username: &String,
    client: &Arc<PrismaClient>,
) -> Result<Vec<proposal_with_dao::Data>> {
    let user = client
        .user()
        .find_first(vec![prisma::user::address::equals(username.clone())])
        .exec()
        .await
        .unwrap()
        .unwrap();

    let subscribed_daos = client
        .subscription()
        .find_many(vec![subscription::userid::equals(user.id)])
        .exec()
        .await
        .unwrap();

    let proposals = client
        .proposal()
        .find_many(vec![
            prisma::proposal::daoid::in_vec(subscribed_daos.into_iter().map(|d| d.daoid).collect()),
            prisma::proposal::state::equals(ProposalState::Active),
            prisma::proposal::timecreated::gt((Utc::now() - chrono::Duration::hours(24)).into()),
        ])
        .include(proposal_with_dao::include())
        .exec()
        .await
        .unwrap();

    Ok(proposals)
}
