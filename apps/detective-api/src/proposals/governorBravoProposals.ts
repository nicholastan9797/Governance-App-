import { InternalServerErrorException, Logger } from "@nestjs/common";
import { ProposalType } from "@prisma/client";
import { DAOHandler } from "@senate/common-types";
import { prisma } from "@senate/database";
import axios from "axios";
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider({
  url: String(process.env.PROVIDER_URL),
});

const logger = new Logger("UpdateGovernorBravoProposals")

export const updateGovernorBravoProposals = async (daoHandler: DAOHandler) => {
  
  logger.log(`Searching from block ${daoHandler.decoder['latestProposalBlock']} ...`)
  let proposals;

  try {
    const govBravoIface = new ethers.utils.Interface(daoHandler.decoder['abi']);

    const logs = await provider.getLogs({
      fromBlock: daoHandler.decoder['latestProposalBlock'],
      address: daoHandler.decoder['address'],
      topics: [govBravoIface.getEventTopic("ProposalCreated")],
    });

    proposals = logs.map((log) => ({
      txBlock: log.blockNumber,
      txHash: log.transactionHash,
      eventData: govBravoIface.parseLog({
        topics: log.topics,
        data: log.data,
      }).args,
    }));

  //   const latestBlockMined = await provider.getBlockNumber();
  //   const ongoingProposals = proposals.filter(
  //     (proposal) => proposal.eventData.endBlock > latestBlockMined
  //   );

    for (let i = 0; i < proposals.length; i++) {
      let proposalCreatedTimestamp = (
        await provider.getBlock(proposals[i].txBlock)
      ).timestamp;

      let votingStartsTimestamp =
        proposalCreatedTimestamp +
        (proposals[i].eventData.startBlock - proposals[i].txBlock) * 12;
      let votingEndsTimestamp =
        proposalCreatedTimestamp +
        (proposals[i].eventData.endBlock - proposals[i].txBlock) * 12;
      let title = await getProposalTitle( 
        daoHandler.decoder['address'],
        proposals[i].eventData.ipfsHash ? proposals[i].eventData.ipfsHash : proposals[i].eventData.description
      );
      let proposalUrl = daoHandler.decoder['proposalUrl'] + proposals[i].eventData.id;
      let proposalOnChainId = Number(proposals[i].eventData.id).toString();

      let decoder = daoHandler.decoder;
      decoder['latestProposalBlock'] = proposals[i].txBlock + 1;

      await prisma.dAOHandler.update({
        where: {
          id: daoHandler.id,
        },
        data: {
          decoder: decoder,
        },
      });

      await prisma.proposal.upsert({
        where: {
              externalId_daoId: {
                  daoId: daoHandler.daoId,
                  externalId: proposalOnChainId,
              },
        },
        update: {},
        create: {
          externalId: proposalOnChainId,
          name: String(title),
          daoId: daoHandler.daoId,
          daoHandlerId: daoHandler.id,
          proposalType: ProposalType.MAKER_EXECUTIVE,
          data: {
              timeEnd: votingEndsTimestamp * 1000,
              timeStart: votingStartsTimestamp * 1000,
              timeCreated: proposalCreatedTimestamp * 1000,
          },
          url: proposalUrl,
        },
      });
    }
  } catch (err) {
    logger.error("Error while updating Gov Bravo Proposals", err)
    throw new InternalServerErrorException();
  }

  
  logger.log("\n\n");
  logger.log(`inserted ${proposals.length} chain proposals`);
  logger.log("======================================================\n\n");
}

const fetchProposalInfoFromIPFS = async (
  hexHash: string
): Promise<{ title: string; }> => {
  let title
  try {
    const response = await axios.get(
      "https://gateway.pinata.cloud/ipfs/f01701220" + hexHash.substring(2)
    );
    title = response.data.title;
  } catch (error) {
    title = "Unknown";
  }

  return title;
};

const formatTitle = (text: String): String => {
  let temp = text.split("\n")[0];

  if (!temp) {
    console.log(text);
    return "Title unavailable";
  }

  if (temp[0] === "#") {
    return temp.substring(2);
  }

  return temp;
};


const getProposalTitle = async (
  daoAddress: string,
  text: string
): Promise<any> => {
  if (daoAddress === "0xEC568fffba86c094cf06b22134B23074DFE2252c") {
    // Aave
    return await fetchProposalInfoFromIPFS(text);
  } else {
    return formatTitle(text);
  }
};

