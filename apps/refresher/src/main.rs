#![deny(unused_crate_dependencies)]
#![allow(unused_imports)]
#![allow(unused_parens)]

use config::{CONFIG, load_config_from_db};
use dotenv::dotenv;
use handlers::create_voter_handlers;
use log::{info, warn};
use prisma::PrismaClient;
use pyroscope::PyroscopeAgent;
use pyroscope_pprofrs::{pprof_backend, PprofConfig};
use std::{env, sync::Arc, time::Duration};
use tokio::time::sleep;
use tokio::try_join;
use tracing::debug;

use crate::{
    consume_queue::{chain_votes::consume_chain_votes, snapshot_votes::consume_snapshot_votes},
    produce_queue::{
        chain_proposals::produce_chain_proposals_queue, chain_votes::produce_chain_votes_queue,
        snapshot_proposals::produce_snapshot_proposals_queue,
        snapshot_votes::produce_snapshot_votes_queue,
    },
    refresh_status::create_refresh_statuses,
};
use crate::consume_queue::{
    chain_proposals::consume_chain_proposals, snapshot_proposals::consume_snapshot_proposals,
};

use flume as _;
use reqwest as _;
use serde_json as _;

pub mod prisma;

mod consume_queue;
mod produce_queue;
mod refresh_status;

pub mod config;
pub mod handlers;
pub mod telemetry;

#[derive(Debug)]
enum RefreshType {
    Daochainproposals,
    Daosnapshotproposals,
    Daochainvotes,
    Daosnapshotvotes,
}

#[allow(dead_code)]
#[derive(Debug)]
pub struct RefreshEntry {
    handler_id: String,
    refresh_type: RefreshType,
    voters: Vec<String>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    telemetry::setup();

    let client = Arc::new(PrismaClient::_builder().build().await.unwrap());
    let config = *CONFIG.read().unwrap();

    //initial load
    let _ = load_config_from_db(&client).await;
    let _ = create_voter_handlers(&client).await;

    let _ = create_refresh_statuses(&client).await;

    let (tx_snapshot_proposals, rx_snapshot_proposals) = flume::unbounded();
    let (tx_snapshot_votes, rx_snapshot_votes) = flume::unbounded();
    let (tx_chain_proposals, rx_chain_proposals) = flume::unbounded();
    let (tx_chain_votes, rx_chain_votes) = flume::unbounded();

    let config_client_clone = client.clone();
    let config_load_task = tokio::task::spawn(async move {
        info!("spawned config_load_task");
        loop {
            let _ = load_config_from_db(&config_client_clone).await;

            sleep(Duration::from_secs(60)).await;
        }
    });

    let producer_client_clone = client.clone();
    let producer_task = tokio::task::spawn_blocking(move || async move {
        info!("spawned producer_task");
        loop {
            let _ = create_voter_handlers(&producer_client_clone).await;
            let _ = create_refresh_statuses(&producer_client_clone).await;

            if let Ok(queue) = produce_snapshot_proposals_queue(&config).await {
                info!("refresh produce_snapshot_proposals_queue: {:?}", queue);
                for item in queue {
                    tx_snapshot_proposals.try_send(item).unwrap();
                }
            }

            if let Ok(queue) = produce_chain_proposals_queue(&config).await {
                info!("refresh produce_chain_proposals_queue: {:?}", queue);
                for item in queue {
                    tx_chain_proposals.try_send(item).unwrap();
                }
            }

            if let Ok(queue) = produce_snapshot_votes_queue(&producer_client_clone, &config).await {
                info!("refresh produce_snapshot_votes_queue: {:?}", queue);
                for item in queue {
                    tx_snapshot_votes.try_send(item).unwrap();
                }
            }

            if let Ok(queue) = produce_chain_votes_queue(&producer_client_clone, &config).await {
                info!("refresh produce_chain_votes_queue: {:?}", queue);
                for item in queue {
                    tx_chain_votes.try_send(item).unwrap();
                }
            }

            sleep(Duration::from_secs(1)).await;
        }
    })
        .await
        .unwrap();

    let consumer_snapshot_proposals_task = tokio::spawn(async move {
        info!("spawned consumer_snapshot_proposals_task");
        loop {
            if let Ok(item) = rx_snapshot_proposals.recv_async().await {
                info!("refresh consumer_snapshot_proposals_task: {:?}", item);

                tokio::spawn(async move {
                    match consume_snapshot_proposals(item).await {
                        Ok(_) => {}
                        Err(e) => {
                            warn!("refresher error: {:#?}", e);
                        }
                    }
                });
            }

            sleep(Duration::from_millis(300)).await;
        }
    });

    let consumer_chain_proposals_task = tokio::spawn(async move {
        info!("spawned consumer_chain_proposals_task");
        loop {
            if let Ok(item) = rx_chain_proposals.recv_async().await {
                info!("refresh consumer_chain_proposals_task: {:?}", item);

                tokio::spawn(async move {
                    match consume_chain_proposals(item).await {
                        Ok(_) => {}
                        Err(e) => {
                            warn!("refresher error: {:#?}", e);
                        }
                    }
                });
            }

            sleep(Duration::from_millis(300)).await;
        }
    });

    let consumer_snapshot_votes_task = tokio::spawn(async move {
        info!("spawned consumer_snapshot_votes_task");
        loop {
            if let Ok(item) = rx_snapshot_votes.recv_async().await {
                info!("refresh consumer_snapshot_votes_task: {:?}", item);

                tokio::spawn(async move {
                    match consume_snapshot_votes(item).await {
                        Ok(_) => {}
                        Err(e) => {
                            warn!("refresher error: {:#?}", e);
                        }
                    }
                });
            }

            sleep(Duration::from_millis(300)).await;
        }
    });

    let consumer_chain_votes_task = tokio::spawn(async move {
        info!("spawned consumer_chain_votes_task");
        loop {
            if let Ok(item) = rx_chain_votes.recv_async().await {
                info!("refresh consumer_chain_votes_task: {:?}", item);

                tokio::spawn(async move {
                    match consume_chain_votes(item).await {
                        Ok(_) => {}
                        Err(e) => {
                            warn!("refresher error: {:#?}", e);
                        }
                    }
                });
            }

            sleep(Duration::from_millis(300)).await;
        }
    });

    producer_task.await;

    try_join!(
        config_load_task,
        consumer_snapshot_proposals_task,
        consumer_snapshot_votes_task,
        consumer_chain_proposals_task,
        consumer_chain_votes_task
    )
        .unwrap();
}
