mod prisma;
use std::sync::{ Arc };
use std::time::Duration;

use prisma::{ PrismaClient };
use tokio::sync::mpsc;
use tokio::time::sleep;
use tokio::try_join;

mod create_queue {
    pub mod snapshot_proposals;
    pub mod snapshot_votes;
    pub mod chain_votes;
    pub mod chain_proposals;
}

mod process_queue {
    pub mod snapshot_proposals;
    pub mod snapshot_votes;
    pub mod chain_votes;
    pub mod chain_proposals;
}

use crate::create_queue::snapshot_proposals::get_snapshot_proposals_queue;
use crate::create_queue::snapshot_votes::get_snapshot_votes_queue;
use crate::create_queue::chain_votes::get_chain_votes_queue;
use crate::create_queue::chain_proposals::get_chain_proposals_queue;

use crate::process_queue::snapshot_proposals::process_snapshot_proposals;
use crate::process_queue::snapshot_votes::process_snapshot_votes;
use crate::process_queue::chain_votes::process_chain_votes;
use crate::process_queue::chain_proposals::process_chain_proposals;

use config::{ load_config_from_db, CONFIG, Config };

pub mod config;

#[derive(Debug)]
#[allow(dead_code)]
enum RefreshType {
    Daochainproposals,
    Daosnapshotproposals,
    Daochainvotes,
    Daosnapshotvotes,
}

#[derive(Debug)]
#[allow(dead_code)]
pub struct RefreshEntry {
    handler_id: String,
    refresh_type: RefreshType,
    voters: Vec<String>,
}

#[tokio::main]
async fn main() {
    let client = Arc::new(PrismaClient::_builder().build().await.unwrap());

    let (tx, mut rx) = mpsc::channel(100);

    let producer_client_clone = client.clone();
    let producer_task = tokio::spawn(async move {
        loop {
            let inner_client_clone = producer_client_clone.clone();
            let tx_clone = tx.clone();
            let config_clone = (*CONFIG.read().unwrap()).clone();

            load_config_from_db(&inner_client_clone).await;

            tokio::spawn(async move {
                let queue = create_queue(&inner_client_clone, &config_clone).await;
                tx_clone.send(queue).await.unwrap();
            });

            sleep(Duration::from_secs(1)).await;
        }
    });

    let consumer_client_clone = client.clone();
    let consumer_task = tokio::spawn(async move {
        let client_clone = consumer_client_clone.clone();

        while let Some(item) = rx.recv().await {
            println!("Consume queues: {:?}", item);

            for entry in item {
                println!("Consuming: {:?}", entry);

                match entry.refresh_type {
                    RefreshType::Daosnapshotproposals =>
                        process_snapshot_proposals(entry, &client_clone).await,
                    RefreshType::Daosnapshotvotes => {}
                    // process_snapshot_votes(entry, &client_clone).await,
                    RefreshType::Daochainproposals =>
                        process_chain_proposals(entry, &client_clone).await,
                    RefreshType::Daochainvotes => {} //process_chain_votes(entry, &client_clone).await,
                }
                sleep(Duration::from_millis(300)).await;
            }
        }
    });

    try_join!(producer_task, consumer_task).unwrap();
}

async fn create_queue(client: &PrismaClient, config: &Config) -> Vec<RefreshEntry> {
    println!("+++ Create queue +++");

    let snapshot_proposal_queue = get_snapshot_proposals_queue(client, config).await;
    let snapshot_votes_queue = get_snapshot_votes_queue(client, config).await;

    let chain_proposal_queue = get_chain_proposals_queue(client, config).await;
    let chain_votes_queue = get_chain_votes_queue(client, config).await;

    println!("Snapshot proposals queue: {:?}", snapshot_proposal_queue);
    println!("Snapshot votes queue: {:?}", snapshot_votes_queue);
    println!("Chain proposals queue: {:?}", chain_proposal_queue);
    println!("Chain votes queue: {:?}", chain_votes_queue);

    let mut complete_queue = Vec::new();
    complete_queue.extend(snapshot_proposal_queue);
    complete_queue.extend(snapshot_votes_queue);
    complete_queue.extend(chain_proposal_queue);
    complete_queue.extend(chain_votes_queue);

    println!("--- Created queue ---");

    complete_queue
}