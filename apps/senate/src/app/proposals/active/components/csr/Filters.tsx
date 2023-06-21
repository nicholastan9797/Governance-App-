"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import { useSession } from "next-auth/react";

const endOptions: { name: string; time: number }[] = [
  {
    name: "24 hours",
    time: 1,
  },
  {
    name: "3 days",
    time: 3,
  },
  {
    name: "5 days",
    time: 5,
  },
  {
    name: "7 days",
    time: 7,
  },
  {
    name: "Any day",
    time: 365,
  },
];

const voteOptions: { id: string; name: string }[] = [
  {
    id: "any",
    name: "Any",
  },
  {
    id: "no",
    name: "Not voted on",
  },
  {
    id: "yes",
    name: "Voted on",
  },
];

export const Filters = (props: {
  subscriptions: { id: string; name: string }[];
  proxies: string[];
}) => {
  const session = useSession();
  const account = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [from, setFrom] = useState("any");
  const [end, setEnd] = useState(365);
  const [voted, setVoted] = useState("any");
  const [proxy, setProxy] = useState("any");

  useEffect(() => {
    if (searchParams) {
      setFrom(String(searchParams.get("from") ?? "any"));
      setEnd(Number(searchParams.get("end") ?? 365));
      setVoted(String(searchParams.get("voted") ?? "any"));
      setProxy(String(searchParams.get("proxy") ?? "any"));
    }
  }, [searchParams]);

  useEffect(() => {
    if (router)
      router.push(
        `/proposals/active?from=${from}&end=${end}&voted=${voted}&proxy=${proxy}`
      );
  }, [from, end, voted, router, proxy]);

  return (
    <div className="mt-[16px] flex flex-col overflow-hidden">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="flex h-[38px] w-full flex-row items-center lg:w-[300px]">
          <label
            className="flex h-full min-w-max items-center bg-black px-[12px] py-[9px] text-[15px] text-white"
            htmlFor="from"
          >
            From
          </label>
          <select
            className="h-full w-full text-black"
            id="from"
            onChange={(e) => {
              setFrom(e.target.value);
            }}
            value={from}
          >
            {session.status === "authenticated" && account.address ? (
              <>
                <option key="any" value="any">
                  All Subscribed Organisations
                </option>
              </>
            ) : (
              <>
                <option key="any" value="any">
                  All Organisations
                </option>
              </>
            )}

            {props.subscriptions
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((sub) => {
                return (
                  <option
                    key={sub.name.toLowerCase().replace(" ", "")}
                    value={sub.name.toLowerCase().replace(" ", "")}
                  >
                    {sub.name}
                  </option>
                );
              })}
          </select>
        </div>

        <div className="flex h-[38px] w-full flex-row items-center lg:w-[300px]">
          <label
            className="flex h-full min-w-max items-center bg-black px-[12px] py-[9px] text-[15px] text-white"
            htmlFor="end"
          >
            <div>Ending in</div>
          </label>
          <select
            className="h-full w-full text-black"
            id="end"
            onChange={(e) => {
              setEnd(Number(e.target.value));
            }}
            value={end}
          >
            {endOptions.map((endOption) => {
              return (
                <option key={endOption.time} value={endOption.time}>
                  {endOption.name}
                </option>
              );
            })}
          </select>
        </div>

        {session.status === "authenticated" && account.address && (
          <div className="flex h-[38px] w-full flex-row items-center lg:w-[300px]">
            <label
              className="flex h-full min-w-max items-center bg-black px-[12px] py-[9px] text-[15px] text-white"
              htmlFor="voted"
            >
              <div>With Vote Status of</div>
            </label>
            <select
              className="h-full w-full text-black"
              id="voted"
              onChange={(e) => {
                setVoted(String(e.target.value));
              }}
              value={voted}
            >
              {voteOptions.map((voteOption) => {
                return (
                  <option key={voteOption.id} value={voteOption.id}>
                    {voteOption.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
        {props.proxies.length > 1 && (
          <div className="flex h-[38px] w-full flex-row items-center lg:w-[300px]">
            <label
              className="flex h-full min-w-max items-center bg-black px-[12px] py-[9px] text-[15px] text-white"
              htmlFor="voted"
            >
              <div>And Showing Votes From</div>
            </label>
            <select
              className="h-full w-full text-black"
              id="voted"
              onChange={(e) => {
                setProxy(String(e.target.value));
              }}
              value={proxy}
            >
              <option key="any" value="any">
                Any
              </option>
              {props.proxies.map((proxy) => {
                return <Proxy address={proxy} key={proxy} />;
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

const Proxy = (props: { address: string }) => {
  const [name, setName] = useState(props.address);
  const provider = usePublicClient();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      const ens = await provider.getEnsName({
        address: props.address as `0x${string}`,
      });
      setName(ens ?? props.address);
    })();
  }, [props.address]);

  return (
    <option key={props.address} value={props.address}>
      {name}
    </option>
  );
};
