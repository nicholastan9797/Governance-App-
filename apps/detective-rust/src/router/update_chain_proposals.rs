use ethers::providers::Middleware;
use ethers::types::U64;
use prisma_client_rust::chrono::{DateTime, FixedOffset, Utc};
use rocket::serde::json::Json;
use serde_json::Value;

use crate::handlers::proposals::compound::compound_proposals;
use crate::handlers::proposals::ens::ens_proposals;
use crate::handlers::proposals::uniswap::uniswap_proposals;
use crate::prisma::{dao, proposal, DaoHandlerType};
use crate::{prisma::daohandler, Ctx, ProposalsRequest, ProposalsResponse};

use crate::handlers::proposals::aave::aave_proposals;

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct ChainProposal {
    pub(crate) external_id: String,
    pub(crate) name: String,
    pub(crate) dao_id: String,
    pub(crate) dao_handler_id: String,
    pub(crate) time_start: DateTime<Utc>,
    pub(crate) time_end: DateTime<Utc>,
    pub(crate) time_created: DateTime<Utc>,
    pub(crate) block_created: i64,
    pub(crate) choices: Value,
    pub(crate) scores: Value,
    pub(crate) scores_total: Value,
    pub(crate) quorum: Value,
    pub(crate) url: String,
}

#[post("/chain_proposals", data = "<data>")]
pub async fn update_chain_proposals<'a>(
    ctx: &Ctx,
    data: Json<ProposalsRequest<'a>>,
) -> Json<ProposalsResponse<'a>> {
    let dao_handler = ctx
        .db
        .daohandler()
        .find_first(vec![daohandler::id::equals(data.daoHandlerId.to_string())])
        .exec()
        .await
        .expect("bad prisma result")
        .expect("daoHandlerId not found");

    let min_block = dao_handler.chainindex;
    let batch_size = dao_handler.refreshspeed;

    let mut from_block = min_block.unwrap_or(0);

    let current_block = ctx
        .client
        .get_block_number()
        .await
        .unwrap_or(U64::from(from_block))
        .as_u64() as i64;

    let mut to_block = if current_block - from_block > batch_size {
        from_block + batch_size
    } else {
        current_block
    };

    if from_block > current_block - 10 {
        from_block = current_block - 10;
    }

    if to_block > current_block - 10 {
        to_block = current_block - 10;
    }

    match dao_handler.r#type {
        DaoHandlerType::AaveChain => {
            match aave_proposals(ctx, &dao_handler, &from_block, &to_block).await {
                Ok(p) => {
                    insert_proposals(p, to_block, ctx.clone(), dao_handler.clone()).await;
                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "ok",
                    })
                }
                Err(e) => {
                    println!("{:#?}", e);

                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "nok",
                    })
                }
            }
        }
        DaoHandlerType::CompoundChain => {
            match compound_proposals(ctx, &dao_handler, &from_block, &to_block).await {
                Ok(p) => {
                    insert_proposals(p, to_block, ctx.clone(), dao_handler.clone()).await;
                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "ok",
                    })
                }
                Err(e) => {
                    println!("{:#?}", e);

                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "nok",
                    })
                }
            }
        }
        DaoHandlerType::UniswapChain => {
            match uniswap_proposals(ctx, &dao_handler, &from_block, &to_block).await {
                Ok(p) => {
                    insert_proposals(p, to_block, ctx.clone(), dao_handler.clone()).await;
                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "ok",
                    })
                }
                Err(e) => {
                    println!("{:#?}", e);

                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "nok",
                    })
                }
            }
        }
        DaoHandlerType::EnsChain => {
            match ens_proposals(ctx, &dao_handler, &from_block, &to_block).await {
                Ok(p) => {
                    insert_proposals(p, to_block, ctx.clone(), dao_handler.clone()).await;
                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "ok",
                    })
                }
                Err(e) => {
                    println!("{:#?}", e);

                    Json(ProposalsResponse {
                        daoHandlerId: data.daoHandlerId,
                        response: "nok",
                    })
                }
            }
        }
        DaoHandlerType::GitcoinChain => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::HopChain => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::DydxChain => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::MakerExecutive => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::MakerPoll => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::MakerPollArbitrum => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
        DaoHandlerType::Snapshot => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            response: "nok",
        }),
    }
}

async fn insert_proposals(
    proposals: Vec<ChainProposal>,
    to_block: i64,
    ctx: &Ctx,
    dao_handler: daohandler::Data,
) {
    let upserts = proposals.clone().into_iter().map(|p| {
        ctx.db.proposal().upsert(
            proposal::externalid_daoid(p.external_id.to_string(), dao_handler.daoid.to_string()),
            proposal::create(
                p.name.clone(),
                p.external_id.clone(),
                p.choices.clone(),
                p.scores.clone(),
                p.scores_total.clone(),
                p.quorum.clone(),
                p.time_created
                    .with_timezone(&FixedOffset::east_opt(0).unwrap()),
                p.time_start
                    .with_timezone(&FixedOffset::east_opt(0).unwrap()),
                p.time_end.with_timezone(&FixedOffset::east_opt(0).unwrap()),
                p.clone().url,
                daohandler::id::equals(dao_handler.id.to_string()),
                dao::id::equals(dao_handler.daoid.to_string()),
                vec![proposal::blockcreated::set(p.block_created.into())],
            ),
            vec![
                proposal::choices::set(p.choices.clone()),
                proposal::scores::set(p.scores.clone()),
                proposal::scorestotal::set(p.clone().scores_total),
                proposal::quorum::set(p.quorum),
            ],
        )
    });

    let _ = ctx
        .db
        ._batch(upserts)
        .await
        .expect("failed to insert proposals");

    let open_proposals: Vec<ChainProposal> = proposals
        .iter()
        .filter(|p| p.time_end > Utc::now())
        .cloned()
        .collect();

    let new_index;

    if !open_proposals.is_empty() {
        new_index = open_proposals
            .iter()
            .map(|p| p.block_created)
            .min()
            .unwrap_or_default();
    } else {
        new_index = to_block;
    }

    let _ = ctx
        .db
        .daohandler()
        .update(
            daohandler::id::equals(dao_handler.id.to_string()),
            vec![daohandler::chainindex::set(new_index.into())],
        )
        .exec()
        .await
        .expect("failed to update daohandlers");
}
