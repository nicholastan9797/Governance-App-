#![deny(unused_crate_dependencies)]
#![allow(unused_imports)]
#![allow(unused_parens)]

#[macro_use]
extern crate rocket;

use std::{env, process, sync::Arc};

use metrics::{self as _, counter, register_counter};

use dotenv::dotenv;
use ethers::providers::{Http, Provider};
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{debug_span, event, instrument, Instrument, Level};

use prisma::{daohandler, proposal, voterhandler, PrismaClient};
use utils::{maker_polls_sanity::maker_polls_sanity_check, snapshot_sanity::snapshot_sanity_check};

use crate::router::{
    chain_proposals::update_chain_proposals, chain_votes::update_chain_votes,
    snapshot_proposals::update_snapshot_proposals, snapshot_votes::update_snapshot_votes,
};

pub mod contracts;
pub mod handlers;
pub mod prisma;
mod router;
mod telemetry;

pub mod utils {
    pub mod etherscan;
    pub mod maker_polls_sanity;
    pub mod snapshot_sanity;
}

#[derive(Clone, Debug)]
pub struct Context {
    pub db: Arc<PrismaClient>,
    pub rpc: Arc<Provider<Http>>,
}

pub type Ctx = rocket::State<Context>;

#[allow(non_snake_case)]
#[derive(Deserialize, Clone, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ProposalsRequest<'r> {
    daoHandlerId: &'r str,
    refreshspeed: i64,
}

#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct ProposalsResponse<'r> {
    daoHandlerId: &'r str,
    success: bool,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
#[serde(crate = "rocket::serde")]
pub struct VotesRequest<'r> {
    daoHandlerId: &'r str,
    voters: Vec<String>,
    refreshspeed: i64,
}

#[derive(Serialize, Debug, Clone)]
#[serde(crate = "rocket::serde")]
pub struct VotesResponse {
    voter_address: String,
    success: bool,
}

daohandler::include!(daohandler_with_dao { dao });
voterhandler::include!(voterhandler_with_voter { voter });
proposal::include!(proposal_with_dao { dao daohandler });

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[get("/")]
fn health() -> &'static str {
    counter!("some_metric_name", 12);
    "ok"
}

#[launch]
async fn rocket() -> _ {
    dotenv().ok();
    telemetry::setup();

    let rpc_url = env::var("ALCHEMY_NODE_URL").expect("$ALCHEMY_NODE_URL is not set");

    let provider = Provider::<Http>::try_from(rpc_url).unwrap();
    let rpc = Arc::new(provider);
    let db = Arc::new(
        prisma::new_client()
            .await
            .expect("Failed to create Prisma client"),
    );

    let context = Context {
        db: db.clone(),
        rpc: rpc.clone(),
    };

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60 * 5));
        loop {
            interval.tick().await;

            let _ = maker_polls_sanity_check(&context).await;
            let _ = snapshot_sanity_check(&context).await;
        }
    });

    rocket::build()
        .manage(Context { db, rpc })
        .mount("/", routes![index])
        .mount("/health", routes![health])
        .mount(
            "/proposals",
            routes![update_snapshot_proposals, update_chain_proposals],
        )
        .mount("/votes", routes![update_chain_votes, update_snapshot_votes])
}
