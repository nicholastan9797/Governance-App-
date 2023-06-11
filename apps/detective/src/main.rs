#![deny(unused_crate_dependencies)]
#![allow(unused_imports)]
#![allow(unused_parens)]

pub mod contracts;
pub mod handlers;
pub mod prisma;
mod router;
pub mod utils {
    pub mod etherscan;
    pub mod maker_polls_sanity;
    pub mod snapshot_sanity;
}
use crate::router::{
    chain_proposals::update_chain_proposals, chain_votes::update_chain_votes,
    snapshot_proposals::update_snapshot_proposals, snapshot_votes::update_snapshot_votes,
};
use std::{env, sync::Arc};

use dotenv::dotenv;
use ethers::providers::{Http, Provider};

use prisma::PrismaClient;

use pyroscope::PyroscopeAgent;
use pyroscope_pprofrs::{pprof_backend, Pprof, PprofConfig};
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use serde::{Deserialize, Serialize};
use utils::{maker_polls_sanity::maker_polls_sanity_check, snapshot_sanity::snapshot_sanity_check};

#[macro_use]
extern crate rocket;

#[derive(Clone)]
pub struct Context {
    pub db: Arc<PrismaClient>,
    pub rpc: Arc<Provider<Http>>,
    pub http_client: Arc<ClientWithMiddleware>,
}
pub type Ctx = rocket::State<Context>;

#[allow(non_snake_case)]
#[derive(Deserialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct ProposalsRequest<'r> {
    daoHandlerId: &'r str,
}

#[allow(non_snake_case)]
#[derive(Serialize)]
#[serde(crate = "rocket::serde")]
pub struct ProposalsResponse<'r> {
    daoHandlerId: &'r str,
    response: &'static str,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct VotesRequest<'r> {
    daoHandlerId: &'r str,
    voters: Vec<String>,
}

#[derive(Serialize, Debug, Clone)]
#[serde(crate = "rocket::serde")]
pub struct VotesResponse {
    voter_address: String,
    success: bool,
}

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[launch]
async fn rocket() -> _ {
    dotenv().ok();

    let telemetry_agent;

    if env::consts::OS != "macos" {
        let telemetry_key = match env::var_os("TELEMETRY_KEY") {
            Some(v) => v.into_string().unwrap(),
            None => panic!("$TELEMETRY_KEY is not set"),
        };

        let exec_env = match env::var_os("EXEC_ENV") {
            Some(v) => v.into_string().unwrap(),
            None => panic!("$EXEC_ENV is not set"),
        };

        telemetry_agent =
            PyroscopeAgent::builder("https://profiles-prod-004.grafana.net", "detective")
                .backend(pprof_backend(PprofConfig::new().sample_rate(100)))
                .basic_auth("491298", telemetry_key)
                .tags([("detective", exec_env.as_str())].to_vec())
                .build()
                .unwrap();

        let _ = telemetry_agent.start().unwrap();
    }

    let rpc_url = match env::var_os("ALCHEMY_NODE_URL") {
        Some(v) => v.into_string().unwrap(),
        None => panic!("$ALCHEMY_NODE_URL is not set"),
    };

    let provider = Provider::<Http>::try_from(rpc_url).unwrap();
    let rpc = Arc::new(provider);
    let db = Arc::new(
        prisma::new_client()
            .await
            .expect("Failed to create Prisma client"),
    );

    let retry_policy = ExponentialBackoff::builder().build_with_max_retries(5);

    let http_client = Arc::new(
        ClientBuilder::new(reqwest::Client::new())
            .with(RetryTransientMiddleware::new_with_policy(retry_policy))
            .build(),
    );

    let context = Context {
        db: db.clone(),
        rpc: rpc.clone(),
        http_client: http_client.clone(),
    };

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5 * 60));
        loop {
            interval.tick().await;
            maker_polls_sanity_check(Arc::clone(&context.db), Arc::clone(&context.rpc)).await;
            snapshot_sanity_check(Arc::clone(&context.db), Arc::clone(&context.http_client)).await;
        }
    });

    rocket::build()
        .manage(Context {
            db,
            rpc,
            http_client,
        })
        .mount("/", routes![index])
        .mount(
            "/proposals",
            routes![update_snapshot_proposals, update_chain_proposals],
        )
        .mount("/votes", routes![update_chain_votes, update_snapshot_votes])
}
