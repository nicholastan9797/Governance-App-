use std::{cmp, collections::HashMap, env, sync::Arc};

use anyhow::Result;
use log::warn;
use opentelemetry::{propagation::TextMapPropagator, sdk::propagation::TraceContextPropagator};
use prisma_client_rust::chrono::Utc;
use reqwest::{
    header::{HeaderName, HeaderValue},
    Client,
};
use serde::Deserialize;
use tokio::task;
use tracing::{debug, debug_span, event, info_span, instrument, Instrument, Level};
use tracing_opentelemetry::OpenTelemetrySpanExt;

use crate::{
    prisma::{self, daohandler, PrismaClient},
    refresh_status::{DAOS_REFRESH_STATUS, VOTERS_REFRESH_STATUS},
    RefreshEntry,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
struct ApiResponse {
    voter_address: String,
    success: bool,
}

#[instrument(skip_all, level = "info")]
pub(crate) async fn consume_chain_votes(entry: RefreshEntry) -> Result<()> {
    let detective_url = env::var("DETECTIVE_URL").expect("$DETECTIVE_URL is not set");

    let post_url = format!("{}/votes/chain_votes", detective_url);

    let http_client = Client::builder().build().unwrap();

    task::spawn(
        async move {
            let span = tracing::Span::current();
            let context = span.context();
            let propagator = TraceContextPropagator::new();
            let mut trace = HashMap::new();
            propagator.inject_context(&context, &mut trace);

            let mut daos_refresh_status = DAOS_REFRESH_STATUS.lock().await;
            let mut voter_refresh_status = VOTERS_REFRESH_STATUS.lock().await;
            let dao_handler_position = daos_refresh_status
                .iter()
                .position(|r| r.dao_handler_id == entry.handler_id)
                .expect("DaoHandler not found in refresh status array");
            let dao_handler_r = daos_refresh_status.get_mut(dao_handler_position).unwrap();
            let response = http_client
                .post(&post_url)
                .json(&serde_json::json!({ "daoHandlerId": entry.handler_id, "voters": entry.voters, "refreshspeed": dao_handler_r.votersrefreshspeed,  "trace": trace }))
                .send()
                .await;

            event!(Level::DEBUG, "{:?} {:?}", entry.refresh_type, dao_handler_r);

            match response {
                Ok(res) => {
                    let data = res.json::<Vec<ApiResponse>>().await;

                    match data {
                        Ok(data) => {
                            let ok_voters_response: Vec<String> = data
                                .iter()
                                .filter(|result| result.success)
                                .map(|result| result.voter_address.clone())
                                .collect();

                            let nok_voters_response: Vec<String> = data
                                .iter()
                                .filter(|result| !result.success)
                                .map(|result| result.voter_address.clone())
                                .collect();

                            if !ok_voters_response.is_empty() {
                                dao_handler_r.votersrefreshspeed = cmp::min(
                                    dao_handler_r.votersrefreshspeed
                                        + (dao_handler_r.votersrefreshspeed * 10 / 100),
                                    1000000000,
                                );
                            }

                            if !nok_voters_response.is_empty() {
                                dao_handler_r.votersrefreshspeed = cmp::max(
                                    dao_handler_r.votersrefreshspeed - (dao_handler_r.votersrefreshspeed * 25 / 100),
                                    100,
                                );
                            }


                            for vh in voter_refresh_status.iter_mut() {
                                if ok_voters_response.contains(&vh.voter_address)
                                {
                                    vh.refresh_status = prisma::RefreshStatus::Done;
                                    vh.last_refresh = Utc::now();
                                }

                                if nok_voters_response.contains(&vh.voter_address)
                                {
                                    vh.refresh_status = prisma::RefreshStatus::New;
                                    vh.last_refresh = Utc::now();
                                    event!(Level::WARN, "nok: {:?}", vh.voter_address);
                                }
                            }
                        }
                        Err(e) => {
                            for vh in voter_refresh_status.iter_mut() {
                                vh.refresh_status = prisma::RefreshStatus::New;
                                vh.last_refresh = Utc::now();
                            }
                            dao_handler_r.votersrefreshspeed = cmp::max(
                                dao_handler_r.votersrefreshspeed - (dao_handler_r.votersrefreshspeed * 25 / 100),
                                100,
                            );
                            event!(Level::WARN, "{:?}", e);
                        }
                    }
                }
                Err(e) => {
                    for vh in voter_refresh_status.iter_mut() {
                        vh.refresh_status = prisma::RefreshStatus::New;
                        vh.last_refresh = Utc::now();
                    }
                    dao_handler_r.votersrefreshspeed = cmp::max(
                        dao_handler_r.votersrefreshspeed - (dao_handler_r.votersrefreshspeed * 25 / 100),
                        100,
                    );
                    event!(Level::WARN, "{:?}", e);
                }
            }
        }.instrument(info_span!("consume_chain_votes_async"))
    );

    Ok(())
}
