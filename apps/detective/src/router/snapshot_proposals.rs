use std::{env, time::UNIX_EPOCH};

use anyhow::{Context, Result};
use chrono::{Datelike, Duration, TimeZone, Utc};
use prisma_client_rust::chrono::{DateTime, FixedOffset, NaiveDateTime};
use reqwest_middleware::ClientBuilder;
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use rocket::serde::json::Json;
use serde::Deserialize;
use tracing::{
    debug_span,
    event,
    info_span,
    instrument,
    span,
    trace_span,
    Instrument,
    Level,
    Span,
};

use crate::{
    prisma::{dao, daohandler, proposal, ProposalState},
    Ctx,
    ProposalsRequest,
    ProposalsResponse,
};

#[derive(Debug, Deserialize)]
struct GraphQLResponse {
    data: GraphQLResponseInner,
}

#[derive(Deserialize, Debug)]
struct GraphQLResponseInner {
    proposals: Vec<GraphQLProposal>,
}

#[derive(Debug, Clone, Deserialize)]
struct GraphQLProposal {
    id: String,
    title: String,

    choices: Vec<String>,
    scores: Vec<f64>,
    scores_total: f64,
    scores_state: String,
    created: i64,
    start: i64,
    end: i64,
    quorum: f64,
    link: String,
    state: String,
    flagged: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct Decoder {
    space: String,
}

#[instrument(skip(ctx), ret, level = "info")]
#[post("/snapshot_proposals", data = "<data>")]
pub async fn update_snapshot_proposals<'a>(
    ctx: &Ctx,
    data: Json<ProposalsRequest<'a>>,
) -> Json<ProposalsResponse<'a>> {
    event!(Level::DEBUG, "{:?}", data);
    let dao_handler = ctx
        .db
        .daohandler()
        .find_first(vec![daohandler::id::equals(data.daoHandlerId.to_string())])
        .exec()
        .instrument(debug_span!("get_dao_handler"))
        .await
        .expect("bad prisma result")
        .expect("daoHandlerId not found");

    let decoder: Decoder = match serde_json::from_value(dao_handler.clone().decoder) {
        Ok(data) => data,
        Err(_) => panic!("{:?} decoder not found", data.daoHandlerId),
    };

    let old_index = match dao_handler.snapshotindex {
        Some(data) => data.timestamp(),
        None => 0,
    };

    let graphql_query = format!(
        r#"
                {{
                    proposals (
                        first: {:?},
                        where: {{
                            space: {:?},
                            created_gte: {}
                        }},
                        orderBy: "created",
                        orderDirection: asc
                    )
                    {{
                        id
                        title
                        choices
                        scores
                        scores_total
                        scores_state
                        created
                        start
                        end
                        quorum
                        link
                        state
                        flagged
                    }}
                }}
            "#,
        data.refreshspeed, decoder.space, old_index
    );

    event!(
        Level::DEBUG,
        "{:?} {:?} {:?} {:?}",
        dao_handler,
        decoder,
        old_index,
        graphql_query
    );

    match update_proposals(graphql_query, ctx, dao_handler.clone(), old_index).await {
        Ok(_) => Json(ProposalsResponse {
            daoHandlerId: data.daoHandlerId,
            success: true,
        }),
        Err(e) => {
            warn!("{:?}", e);
            Json(ProposalsResponse {
                daoHandlerId: data.daoHandlerId,
                success: false,
            })
        }
    }
}

#[instrument(skip(ctx), level = "debug")]
async fn update_proposals(
    graphql_query: String,
    ctx: &Ctx,
    dao_handler: daohandler::Data,
    old_index: i64,
) -> Result<()> {
    let _snapshot_key = env::var("SNAPSHOT_API_KEY").expect("$SNAPSHOT_API_KEY is not set");

    let retry_policy = ExponentialBackoff::builder().build_with_max_retries(5);
    let http_client = ClientBuilder::new(reqwest::Client::new())
        .with(RetryTransientMiddleware::new_with_policy(retry_policy))
        .build();

    let graphql_response = http_client
        .get("https://hub.snapshot.org/graphql".to_string())
        .json(&serde_json::json!({ "query": graphql_query }))
        .send()
        .instrument(debug_span!("get_graphql_response"))
        .await?;

    let response_data: GraphQLResponse = graphql_response
        .json()
        .await
        .with_context(|| format!("bad graphql response {}", graphql_query))?;

    let proposals: Vec<GraphQLProposal> = response_data.data.proposals.into_iter().collect();

    for proposal in proposals.clone() {
        let state = match proposal.state.as_str() {
            "active" => ProposalState::Active,
            "pending" => ProposalState::Pending,
            "closed" => {
                if proposal.scores_state == "final" {
                    ProposalState::Executed
                } else {
                    ProposalState::Hidden
                }
            }
            _ => ProposalState::Unknown,
        };

        let existing = ctx
            .db
            .proposal()
            .find_unique(proposal::externalid_daoid(
                proposal.id.to_string(),
                dao_handler.daoid.to_string(),
            ))
            .exec()
            .await
            .unwrap();

        match existing {
            Some(existing) => {
                if state != existing.state
                    || proposal.scores_total != existing.scorestotal
                    || existing.visible != !proposal.flagged.is_some_and(|f| f)
                {
                    ctx.db
                        .proposal()
                        .update(
                            proposal::externalid_daoid(
                                proposal.id.to_string(),
                                dao_handler.daoid.to_string(),
                            ),
                            vec![
                                proposal::choices::set(proposal.choices.clone().into()),
                                proposal::scores::set(proposal.scores.clone().into()),
                                proposal::scorestotal::set(proposal.scores_total.into()),
                                proposal::quorum::set(proposal.quorum.into()),
                                proposal::state::set(state),
                                proposal::visible::set(
                                    !proposal.flagged.is_some_and(|f| f),
                                ),
                            ],
                        )
                        .exec()
                        .instrument(debug_span!("update_proposal"))
                        .await
                        .unwrap();
                }
            }
            None => {
                ctx.db
                    .proposal()
                    .create_unchecked(
                        proposal.title.clone(),
                        proposal.id.clone(),
                        proposal.choices.clone().into(),
                        proposal.scores.clone().into(),
                        proposal.scores_total.into(),
                        proposal.quorum.into(),
                        state,
                        DateTime::from_utc(
                            NaiveDateTime::from_timestamp_millis(proposal.created * 1000)
                                .expect("can not create timecreated"),
                            FixedOffset::east_opt(0).unwrap(),
                        ),
                        DateTime::from_utc(
                            NaiveDateTime::from_timestamp_millis(proposal.start * 1000)
                                .expect("can not create timestart"),
                            FixedOffset::east_opt(0).unwrap(),
                        ),
                        DateTime::from_utc(
                            NaiveDateTime::from_timestamp_millis(proposal.end * 1000)
                                .expect("can not create timeend"),
                            FixedOffset::east_opt(0).unwrap(),
                        ),
                        proposal.link.clone(),
                        dao_handler.id.to_string(),
                        dao_handler.daoid.to_string(),
                        vec![proposal::visible::set(
                            !proposal.flagged.is_some_and(|f| f),
                        )],
                    )
                    .exec()
                    .instrument(debug_span!("create_proposal"))
                    .await
                    .unwrap();
            }
        }
    }

    let open_proposals: Vec<&GraphQLProposal> = proposals
        .iter()
        .filter(|proposal| {
            (proposal.state != "closed" || proposal.scores_state != "final")
                && Utc.timestamp_opt(proposal.end, 0).unwrap().year() == Utc::now().year()
        })
        .collect();

    let closed_proposals: Vec<&GraphQLProposal> = proposals
        .iter()
        .filter(|proposal| proposal.state == "closed" && proposal.scores_state == "final")
        .collect();

    let new_index;

    if !open_proposals.is_empty() {
        new_index = open_proposals
            .iter()
            .map(|proposal| proposal.created)
            .min()
            .unwrap_or(old_index);
    } else if !closed_proposals.is_empty() {
        new_index = closed_proposals
            .iter()
            .map(|proposal| proposal.created)
            .max()
            .unwrap_or(old_index);
    } else {
        new_index = old_index;
    }

    event!(
        Level::DEBUG,
        "{:?} {:?} {:?}",
        open_proposals.len(),
        closed_proposals.len(),
        new_index
    );

    let uptodate = old_index - new_index < 60 * 60;

    let new_index_date: DateTime<FixedOffset> = DateTime::from_utc(
        NaiveDateTime::from_timestamp_millis(new_index * 1000).expect("bad new_index timestamp"),
        FixedOffset::east_opt(0).unwrap(),
    );

    if (new_index_date > dao_handler.snapshotindex.unwrap()
        && new_index_date - dao_handler.snapshotindex.unwrap() > Duration::hours(1))
        || uptodate != dao_handler.uptodate
    {
        ctx.db
            .daohandler()
            .update(
                daohandler::id::equals(dao_handler.id),
                vec![
                    daohandler::snapshotindex::set(Some(DateTime::from_utc(
                        NaiveDateTime::from_timestamp_millis(new_index * 1000)
                            .expect("can not create snapshotindex"),
                        FixedOffset::east_opt(0).unwrap(),
                    ))),
                    daohandler::uptodate::set(uptodate),
                ],
            )
            .exec()
            .instrument(debug_span!("update_snapshotindex"))
            .await
            .context("failed to update daohandler")?;
    }

    Ok(())
}
