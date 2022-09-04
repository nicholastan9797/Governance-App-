import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { Flex } from "@chakra-ui/react";
import NavBar from "../components/navbar/NavBar";
import { Pages } from "../types";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DyanmicProposals = dynamic(
  () => import("../components/mainBox/proposals/Proposals"),
  {
    suspense: true,
  }
);

const DynamicSubscriptions = dynamic(
  () => import("../components/mainBox/subscriptions/Subscriptions"),
  {
    suspense: true,
  }
);

const Home: NextPage = () => {
  const [page, setPage] = useState(Pages.Dashboard);

  useEffect(() => {
    console.log(page);
  }, [page]);

  return (
    <Flex flexDir="row" w="100vw">
      <NavBar page={page} setPage={setPage} />
      <Suspense fallback={`Loading...`}>
        {page == Pages.Dashboard && <DyanmicProposals />}
        {page == Pages.Subscriptions && <DynamicSubscriptions />}
      </Suspense>
    </Flex>
  );
};

export default Home;
