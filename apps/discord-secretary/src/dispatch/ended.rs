use std::{cmp::Ordering, env, result, sync::Arc, time::Duration};

use prisma_client_rust::bigdecimal::ToPrimitive;
use serenity::{
    http::Http,
    model::{
        prelude::{Embed, MessageId},
        webhook::Webhook,
    },
    utils::Colour,
};
use tokio::time::sleep;
use tracing::{debug_span, instrument, Instrument};

use crate::{
    prisma::{
        self, notification, proposal, user, DaoHandlerType, NotificationDispatchedState,
        NotificationType, PrismaClient,
    },
    utils::vote::get_vote,
};

prisma::proposal::include!(proposal_with_dao { dao daohandler });

#[instrument(skip(client), level = "info")]
pub async fn dispatch_ended_proposal_notifications(client: &Arc<PrismaClient>) {
    let ended_notifications = client
        .notification()
        .find_many(vec![
            notification::dispatchedstatus::in_vec(vec![
                NotificationDispatchedState::NotDispatched,
                NotificationDispatchedState::FirstRetry,
                NotificationDispatchedState::SecondRetry,
                NotificationDispatchedState::ThirdRetry,
            ]),
            notification::r#type::equals(NotificationType::EndedProposalDiscord),
        ])
        .exec()
        .instrument(debug_span!("get_notifications"))
        .await
        .unwrap();

    for ended_notification in ended_notifications {
        let new_notification = client
            .notification()
            .find_first(vec![
                notification::userid::equals(ended_notification.clone().userid),
                notification::proposalid::equals(ended_notification.clone().proposalid),
                notification::r#type::equals(NotificationType::NewProposalDiscord),
                notification::dispatchedstatus::equals(NotificationDispatchedState::Dispatched),
            ])
            .exec()
            .instrument(debug_span!("get_notification"))
            .await
            .unwrap();

        let user = client
            .user()
            .find_first(vec![user::id::equals(ended_notification.clone().userid)])
            .exec()
            .instrument(debug_span!("get_user"))
            .await
            .unwrap()
            .unwrap();

        let proposal = client
            .proposal()
            .find_first(vec![proposal::id::equals(
                ended_notification.clone().proposalid.unwrap(),
            )])
            .include(proposal_with_dao::include())
            .exec()
            .instrument(debug_span!("get_proposal"))
            .await
            .unwrap();

        let http = Http::new("");

        let webhook = Webhook::from_url(&http, user.discordwebhook.as_str())
            .await
            .expect("Missing webhook");

        match new_notification {
            Some(new_notification) => {
                let initial_message_id: u64 =
                    new_notification.discordmessageid.unwrap().parse().unwrap();

                match proposal {
                    Some(proposal) => {
                        let (result_index, max_score) = proposal
                            .scores
                            .as_array()
                            .unwrap()
                            .iter()
                            .map(|score| score.as_f64().unwrap())
                            .enumerate()
                            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(Ordering::Equal))
                            .unwrap_or((100, 0.0));

                        let message_content = if result_index == 100 {
                            format!("❓ Could not fetch results")
                        } else if proposal.scorestotal.as_f64() > proposal.quorum.as_f64() {
                            format!(
                                "✅ **{}** {}%",
                                &proposal.choices.as_array().unwrap()[result_index]
                                    .as_str()
                                    .unwrap(),
                                (max_score / proposal.scorestotal.as_f64().unwrap() * 100.0)
                                    .round()
                            )
                        } else {
                            format!("❌ No Quorum")
                        };

                        let voted = get_vote(
                            new_notification.userid,
                            new_notification.proposalid.unwrap(),
                            client,
                        )
                        .await
                        .unwrap();

                        let shortner_url = match env::var_os("NEXT_PUBLIC_URL_SHORTNER") {
                            Some(v) => v.into_string().unwrap(),
                            None => panic!("$NEXT_PUBLIC_URL_SHORTNER is not set"),
                        };

                        let short_url = format!(
                            "{}{}",
                            shortner_url,
                            proposal
                                .id
                                .chars()
                                .rev()
                                .take(7)
                                .collect::<Vec<char>>()
                                .into_iter()
                                .rev()
                                .collect::<String>()
                        );

                        webhook
                            .edit_message(&http, MessageId::from(initial_message_id), |w| {
                                w.embeds(vec![Embed::fake(|e| {
                                    e.title(proposal.name)
                                    .description(format!(
                                        "**{}** {} proposal ended on {}",
                                        proposal.dao.name,
                                        if proposal.daohandler.r#type == DaoHandlerType::Snapshot {
                                            "off-chain"
                                        } else {
                                            "on-chain"
                                        },
                                        format!("{}", proposal.timeend.format("%B %e").to_string())
                                    ))
                                    .field("", message_content, false)
                                    .url(short_url)
                                    .color(Colour(0x23272A))
                                    .thumbnail(format!(
                                        "https://www.senatelabs.xyz/{}_medium.png",
                                        proposal.dao.picture
                                    ))
                                    .image(if voted {
                                        "https://senatelabs.xyz/assets/Discord/past-vote2x.png"
                                    } else {
                                        "https://senatelabs.xyz/assets/Discord/past-no-vote2x.png"
                                    })
                                })])
                            })
                            .instrument(debug_span!("edit_message"))
                            .await
                            .ok();

                        let message = webhook
                            .execute(&http, true, |w| {
                                w.content(format!(
                                    "🗳️ **{}** {} proposal {} **just ended.** ☑️",
                                    proposal.dao.name,
                                    if proposal.daohandler.r#type == DaoHandlerType::Snapshot {
                                        "off-chain"
                                    } else {
                                        "on-chain"
                                    },
                                    new_notification.discordmessagelink.unwrap(),
                                ))
                                .username("Senate Secretary")
                                .avatar_url(
                                    "https://www.senatelabs.xyz/assets/Discord/Profile_picture.gif",
                                )
                            })
                            .instrument(debug_span!("send_message"))
                            .await;

                        let update_data = match message {
                            Ok(msg) => {
                                vec![
                                    notification::dispatchedstatus::set(
                                        NotificationDispatchedState::Dispatched,
                                    ),
                                    notification::discordmessagelink::set(
                                        msg.clone().unwrap().link().into(),
                                    ),
                                    notification::discordmessageid::set(
                                        msg.clone().unwrap().id.to_string().into(),
                                    ),
                                ]
                            }
                            Err(_) => match ended_notification.dispatchedstatus {
                                NotificationDispatchedState::NotDispatched => {
                                    vec![notification::dispatchedstatus::set(
                                        NotificationDispatchedState::FirstRetry,
                                    )]
                                }
                                NotificationDispatchedState::FirstRetry => {
                                    vec![notification::dispatchedstatus::set(
                                        NotificationDispatchedState::SecondRetry,
                                    )]
                                }
                                NotificationDispatchedState::SecondRetry => {
                                    vec![notification::dispatchedstatus::set(
                                        NotificationDispatchedState::ThirdRetry,
                                    )]
                                }
                                NotificationDispatchedState::ThirdRetry => {
                                    vec![notification::dispatchedstatus::set(
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
                                    notification::userid::equals(ended_notification.clone().userid),
                                    notification::proposalid::equals(
                                        ended_notification.clone().proposalid,
                                    ),
                                    notification::r#type::equals(ended_notification.clone().r#type),
                                ],
                                update_data,
                            )
                            .exec()
                            .instrument(debug_span!("update_notification"))
                            .await
                            .unwrap();
                    }
                    None => {
                        webhook
                            .delete_message(&http, MessageId::from(initial_message_id))
                            .await
                            .ok();

                        client
                            .notification()
                            .update_many(
                                vec![
                                    notification::userid::equals(ended_notification.clone().userid),
                                    notification::proposalid::equals(
                                        ended_notification.clone().proposalid,
                                    ),
                                    notification::r#type::equals(ended_notification.clone().r#type),
                                ],
                                vec![notification::dispatchedstatus::set(
                                    NotificationDispatchedState::Deleted,
                                )],
                            )
                            .exec()
                            .instrument(debug_span!("update_notification"))
                            .await
                            .unwrap();
                    }
                }
            }
            None => match proposal {
                Some(proposal) => {
                    let message = webhook
                        .execute(&http, true, |w| {
                            w.content(format!(
                                "🗳️ **{}** {} proposal {} **just ended.** ☑️",
                                proposal.dao.name,
                                if proposal.daohandler.r#type == DaoHandlerType::Snapshot {
                                    "off-chain"
                                } else {
                                    "on-chain"
                                },
                                proposal.name,
                            ))
                            .username("Senate Secretary")
                            .avatar_url(
                                "https://www.senatelabs.xyz/assets/Discord/Profile_picture.gif",
                            )
                        })
                        .instrument(debug_span!("send_message"))
                        .await;

                    let update_data = match message {
                        Ok(msg) => {
                            vec![
                                notification::dispatchedstatus::set(
                                    NotificationDispatchedState::Dispatched,
                                ),
                                notification::discordmessagelink::set(
                                    msg.clone().unwrap().link().into(),
                                ),
                                notification::discordmessageid::set(
                                    msg.clone().unwrap().id.to_string().into(),
                                ),
                            ]
                        }
                        Err(_) => match ended_notification.dispatchedstatus {
                            NotificationDispatchedState::NotDispatched => {
                                vec![notification::dispatchedstatus::set(
                                    NotificationDispatchedState::FirstRetry,
                                )]
                            }
                            NotificationDispatchedState::FirstRetry => {
                                vec![notification::dispatchedstatus::set(
                                    NotificationDispatchedState::SecondRetry,
                                )]
                            }
                            NotificationDispatchedState::SecondRetry => {
                                vec![notification::dispatchedstatus::set(
                                    NotificationDispatchedState::ThirdRetry,
                                )]
                            }
                            NotificationDispatchedState::ThirdRetry => {
                                vec![notification::dispatchedstatus::set(
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
                                notification::userid::equals(ended_notification.clone().userid),
                                notification::proposalid::equals(
                                    ended_notification.clone().proposalid,
                                ),
                                notification::r#type::equals(ended_notification.clone().r#type),
                            ],
                            update_data,
                        )
                        .exec()
                        .instrument(debug_span!("update_notification"))
                        .await
                        .unwrap();
                }
                None => {}
            },
        }

        sleep(Duration::from_millis(100)).await;
    }
}
