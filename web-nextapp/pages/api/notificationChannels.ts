import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { NotificationChannel } from "../../../types";

const prisma = new PrismaClient();
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { userAddress, daoId },
    method,
    body,
  } = req;

  switch (method) {
    case "GET":
      let user = await prisma.user.findFirst({
        where: {
          address: String(userAddress),
        },
      });

      let subscription = await prisma.subscription.findFirst({
        where: {
          userId: user?.id,
          daoId: Number(daoId),
        },
      });

      let notificationChannels = await prisma.notificationChannel.findMany({
        where: {
          subscriptionId: subscription?.id ?? 0,
        },
      });

      res.status(200).json(notificationChannels);
      break;
    case "PUT":
      let putPayload: NotificationChannel = JSON.parse(body);

      let putUser = await prisma.user.findUnique({
        where: {
          address: String(userAddress),
        },
      });

      let putSubscription = await prisma.subscription.findFirst({
        where: {
          userId: putUser?.id,
          daoId: Number(daoId),
        },
        select: {
          id: true,
        },
      });

      await prisma.subscription.upsert({
        where: {
          id: putSubscription?.id ?? 0,
        },
        update: {
          notificationChannels: {
            create: putPayload,
          },
        },
        create: {
          userId: putUser?.id!,
          daoId: Number(daoId),
          notificationChannels: {
            create: putPayload,
          },
          notificationSettings: {
            create: [],
          },
        },
      });

      res.send(200);
      break;

    case "DELETE":
      let payload: NotificationChannel = JSON.parse(body);

      let deleteUser = await prisma.user.findUnique({
        where: {
          address: String(userAddress),
        },
      });

      let deleteSubscription = await prisma.subscription.findFirst({
        where: {
          userId: deleteUser?.id,
          daoId: Number(daoId),
        },
        select: {
          id: true,
        },
      });

      await prisma.subscription.update({
        where: {
          id: deleteSubscription?.id ?? 0,
        },
        data: {
          notificationChannels: {
            deleteMany: {
              type: payload.type,
              connector: payload.connector,
            },
          },
        },
      });

      res.send(200);
      break;
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
