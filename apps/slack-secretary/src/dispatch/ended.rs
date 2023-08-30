use std::{cmp::Ordering, env, result, sync::Arc, time::Duration};

use anyhow::Result;
use prisma_client_rust::{bigdecimal::ToPrimitive, serde_json};

use tokio::time::sleep;
use tracing::{debug_span, event, instrument, warn, Instrument, Level};

use crate::{
    prisma::{
        self,
        notification,
        proposal,
        user,
        DaoHandlerType,
        NotificationDispatchedState,
        NotificationType,
        PrismaClient,
    },
    utils::vote::get_vote,
};

use super::utils::notification_retry::update_notification_retry;

prisma::proposal::include!(proposal_with_dao { dao daohandler });

#[instrument(skip(client))]
pub async fn dispatch_ended_proposal_notifications(client: &Arc<PrismaClient>) -> Result<()> {
    let reqwest_client = reqwest::Client::new();

    let notifications = client
        .notification()
        .find_many(vec![
            notification::dispatchstatus::in_vec(vec![
                NotificationDispatchedState::NotDispatched,
                NotificationDispatchedState::FirstRetry,
                NotificationDispatchedState::SecondRetry,
                NotificationDispatchedState::ThirdRetry,
            ]),
            notification::r#type::equals(NotificationType::EndedProposalSlack),
        ])
        .exec()
        .await?;

    for notification in notifications {
        let new_notification = client
            .notification()
            .find_first(vec![
                notification::userid::equals(notification.clone().userid),
                notification::proposalid::equals(notification.clone().proposalid),
                notification::r#type::equals(NotificationType::NewProposalSlack),
                notification::dispatchstatus::equals(NotificationDispatchedState::Dispatched),
            ])
            .exec()
            .await?;

        let user = client
            .user()
            .find_first(vec![user::id::equals(notification.clone().userid)])
            .exec()
            .await?
            .unwrap();

        let proposal = client
            .proposal()
            .find_first(vec![proposal::id::equals(
                notification.clone().proposalid.unwrap(),
            )])
            .include(proposal_with_dao::include())
            .exec()
            .await?;

        match new_notification {
            Some(_) => match proposal {
                Some(proposal) => {
                    let payload = serde_json::json!({
                        "blocks": [
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": format!("Ended proposal {:}", proposal.name)
                                }
                            }
                        ]
                    });

                    let repsonse = reqwest_client
                        .post(user.clone().slackwebhook)
                        .json(&payload)
                        .header("Content-Type", "application/json")
                        .send()
                        .await?
                        .text()
                        .await?;

                    let update_data = match repsonse.as_str() {
                        "ok" => {
                            event!(
                                Level::INFO,
                                user = user.address.clone().unwrap(),
                                proposal_name = proposal.name,
                                dao = proposal.dao.name,
                                "new notification"
                            );

                            vec![notification::dispatchstatus::set(
                                NotificationDispatchedState::Dispatched,
                            )]
                        }
                        _ => match notification.dispatchstatus {
                            NotificationDispatchedState::NotDispatched => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::FirstRetry,
                                )]
                            }
                            NotificationDispatchedState::FirstRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::SecondRetry,
                                )]
                            }
                            NotificationDispatchedState::SecondRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::ThirdRetry,
                                )]
                            }
                            NotificationDispatchedState::ThirdRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::Failed,
                                )]
                            }
                            NotificationDispatchedState::Dispatched => todo!(),
                            NotificationDispatchedState::Deleted => todo!(),
                            NotificationDispatchedState::Failed => todo!(),
                        },
                    };

                    client
                        .notification()
                        .update_many(
                            vec![
                                notification::userid::equals(notification.clone().userid),
                                notification::proposalid::equals(notification.clone().proposalid),
                                notification::r#type::equals(notification.clone().r#type),
                            ],
                            update_data,
                        )
                        .exec()
                        .await?;
                }
                None => {
                    client
                        .notification()
                        .update_many(
                            vec![
                                notification::userid::equals(notification.clone().userid),
                                notification::proposalid::equals(notification.clone().proposalid),
                                notification::r#type::equals(notification.clone().r#type),
                            ],
                            vec![notification::dispatchstatus::set(
                                NotificationDispatchedState::Deleted,
                            )],
                        )
                        .exec()
                        .await?;
                }
            },
            None => {
                if let Some(proposal) = proposal {
                    let payload = serde_json::json!({
                        "blocks": [
                            {
                                "type": "section",
                                "text": {
                                    "type": "mrkdwn",
                                    "text": format!("Ended proposal {:}", proposal.name)
                                }
                            }
                        ]
                    });

                    let repsonse = reqwest_client
                        .post(user.clone().slackwebhook)
                        .json(&payload)
                        .header("Content-Type", "application/json")
                        .send()
                        .await?
                        .text()
                        .await?;

                    let update_data = match repsonse.as_str() {
                        "ok" => {
                            vec![notification::dispatchstatus::set(
                                NotificationDispatchedState::Dispatched,
                            )]
                        }
                        _ => match notification.dispatchstatus {
                            NotificationDispatchedState::NotDispatched => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::FirstRetry,
                                )]
                            }
                            NotificationDispatchedState::FirstRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::SecondRetry,
                                )]
                            }
                            NotificationDispatchedState::SecondRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::ThirdRetry,
                                )]
                            }
                            NotificationDispatchedState::ThirdRetry => {
                                vec![notification::dispatchstatus::set(
                                    NotificationDispatchedState::Failed,
                                )]
                            }
                            NotificationDispatchedState::Dispatched => todo!(),
                            NotificationDispatchedState::Deleted => todo!(),
                            NotificationDispatchedState::Failed => todo!(),
                        },
                    };

                    client
                        .notification()
                        .update_many(
                            vec![
                                notification::userid::equals(notification.clone().userid),
                                notification::proposalid::equals(notification.clone().proposalid),
                                notification::r#type::equals(notification.clone().r#type),
                            ],
                            update_data,
                        )
                        .exec()
                        .await?;
                }
            }
        }

        sleep(Duration::from_millis(100)).await;
    }

    Ok(())
}
