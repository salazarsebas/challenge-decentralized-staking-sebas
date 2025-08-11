"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

type EventType = "Stake" | "Execute" | "Withdraw" | "All";

interface EventData {
  type: EventType;
  address?: string;
  amount: bigint;
  blockNumber?: bigint;
  transactionHash?: string;
}

// Define generic event types for proper typing
type GenericContractEvent = {
  args: any[];
  blockNumber?: bigint;
  transactionHash?: string;
};

const Stakings: NextPage = () => {
  const [selectedEventType, setSelectedEventType] = useState<EventType>("All");
  
  // Fetch events with proper typing
  const { data: stakeEvents = [], isLoading: isLoadingStake } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Stake",
  } as any) as { data: GenericContractEvent[], isLoading: boolean };
  
  const { data: executeEvents = [], isLoading: isLoadingExecute } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Execute",
  } as any) as { data: GenericContractEvent[], isLoading: boolean };
  
  const { data: withdrawEvents = [], isLoading: isLoadingWithdraw } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Withdraw",
  } as any) as { data: GenericContractEvent[], isLoading: boolean };
  
  const isLoading = isLoadingStake || isLoadingExecute || isLoadingWithdraw;

  // Format all events with type information for display
  const allEvents: EventData[] = [
    ...stakeEvents.map(event => ({
      type: "Stake" as EventType,
      address: event.args?.[0] as string | undefined,
      amount: (event.args?.[1] as bigint) || 0n,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    })),
    ...executeEvents.map(event => ({
      type: "Execute" as EventType,
      address: undefined,
      amount: (event.args?.[0] as bigint) || 0n,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    })),
    ...withdrawEvents.map(event => ({
      type: "Withdraw" as EventType,
      address: event.args?.[0] as string | undefined,
      amount: (event.args?.[1] as bigint) || 0n,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    }))
  ].sort((a, b) => Number((b.blockNumber || 0n) - (a.blockNumber || 0n))); // Sort by block number (newest first)
  
  // Filter events based on selected type
  const filteredEvents = selectedEventType === "All" 
    ? allEvents 
    : allEvents.filter(event => event.type === selectedEventType);

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
    
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-3">
          <span className="block text-2xl font-bold">Staking Activity</span>
        </h1>
        
        {/* Event Type Filter */}
        <div className="flex justify-center mb-6">
          <div className="tabs tabs-boxed">
            <a 
              className={`tab ${selectedEventType === "All" ? "tab-active" : ""}`}
              onClick={() => setSelectedEventType("All")}
            >
              All Events
            </a>
            <a 
              className={`tab ${selectedEventType === "Stake" ? "tab-active" : ""}`}
              onClick={() => setSelectedEventType("Stake")}
            >
              Stakes
            </a>
            <a 
              className={`tab ${selectedEventType === "Execute" ? "tab-active" : ""}`}
              onClick={() => setSelectedEventType("Execute")}
            >
              Executions
            </a>
            <a 
              className={`tab ${selectedEventType === "Withdraw" ? "tab-active" : ""}`}
              onClick={() => setSelectedEventType("Withdraw")}
            >
              Withdrawals
            </a>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto shadow-lg w-full max-w-4xl">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="bg-primary">Event Type</th>
              <th className="bg-primary">Address</th>
              <th className="bg-primary">Amount</th>
              <th className="bg-primary">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center">
                  No events found
                </td>
              </tr>
            ) : (
              filteredEvents.map((event, index) => {
                return (
                  <tr key={index}>
                    <td>
                      <span className={`badge ${event.type === "Stake" ? "badge-success" : event.type === "Execute" ? "badge-warning" : "badge-info"} p-3`}>
                        {event.type}
                      </span>
                    </td>
                    <td>
                      {event.address ? <Address address={event.address} /> : "N/A"}
                    </td>
                    <td>{formatEther(event.amount)} ETH</td>
                    <td>
                      {event.transactionHash ? (
                        <a 
                          href={`https://sepolia.etherscan.io/tx/${event.transactionHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {event.transactionHash.substring(0, 6)}...{event.transactionHash.substring(event.transactionHash.length - 4)}
                        </a>
                      ) : "N/A"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stakings;
