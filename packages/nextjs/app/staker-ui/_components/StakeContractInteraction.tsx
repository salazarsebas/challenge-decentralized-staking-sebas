"use client";

import { ETHToPrice } from "./EthToPrice";
import humanizeDuration from "humanize-duration";
import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";

export const StakeContractInteraction = ({ address }: { address?: string }) => {
  const { address: connectedAddress } = useAccount();
  const { data: StakerContract } = useDeployedContractInfo({ contractName: "Staker" });
  const { data: ExampleExternalContact } = useDeployedContractInfo({ contractName: "ExampleExternalContract" });
  const { data: stakerContractBalance } = useWatchBalance({
    address: StakerContract?.address,
  });
  const { data: exampleExternalContractBalance } = useWatchBalance({
    address: ExampleExternalContact?.address,
  });

  const { targetNetwork } = useTargetNetwork();
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [thresholdMet, setThresholdMet] = useState<boolean>(false);
  const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(false);
  const [isOpenForWithdraw, setIsOpenForWithdraw] = useState<boolean>(false);
  const [isStaking, setIsStaking] = useState<boolean>(false);

  // Contract Read Actions - using any type to bypass TypeScript errors
  const { data: threshold } = useScaffoldReadContract({
    contractName: "Staker",
    functionName: "threshold",
    watch: true,
  } as any);
  
  const { data: timeLeft } = useScaffoldReadContract({
    contractName: "Staker",
    functionName: "timeLeft",
    watch: true,
  } as any);
  
  const { data: myStake } = useScaffoldReadContract({
    contractName: "Staker",
    functionName: "balances",
    args: [connectedAddress],
    watch: true,
  } as any);
  
  const { data: isStakingCompleted } = useScaffoldReadContract({
    contractName: "ExampleExternalContract",
    functionName: "completed",
    watch: true,
  } as any);
  
  const { data: openForWithdraw } = useScaffoldReadContract({
    contractName: "Staker",
    functionName: "openForWithdraw",
    watch: true,
  } as any);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Staker" } as any);

  // Use any type to bypass TypeScript errors for event history
  const { data: stakeEvents = [] } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Stake",
  } as any);
  
  const { data: executeEvents = [] } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Execute",
  } as any);
  
  const { data: withdrawEvents = [] } = useScaffoldEventHistory({
    contractName: "Staker",
    eventName: "Withdraw",
  } as any);
  
  // Log events when they change
  useEffect(() => {
    if (stakeEvents && stakeEvents.length > 0) {
      const latestEvent = stakeEvents[0] as any;
      console.log("📡 Stake event", latestEvent.args?.[0], latestEvent.args?.[1]);
    }
  }, [stakeEvents]);
  
  useEffect(() => {
    if (executeEvents && executeEvents.length > 0) {
      const latestEvent = executeEvents[0] as any;
      console.log("📡 Execute event", latestEvent.args?.[0]);
    }
  }, [executeEvents]);
  
  useEffect(() => {
    if (withdrawEvents && withdrawEvents.length > 0) {
      const latestEvent = withdrawEvents[0] as any;
      console.log("📡 Withdraw event", latestEvent.args?.[0], latestEvent.args?.[1]);
    }
  }, [withdrawEvents]);

  // Update threshold status whenever balance or threshold changes
  useEffect(() => {
    if (stakerContractBalance?.value && threshold) {
      try {
        // Convert to BigInt for comparison
        const thresholdBigInt = typeof threshold === 'string' ? BigInt(threshold) : 
                               typeof threshold === 'boolean' ? 0n : threshold as bigint;
        const balanceBigInt = typeof stakerContractBalance.value === 'string' ? 
          BigInt(stakerContractBalance.value) : stakerContractBalance.value;
        setThresholdMet(balanceBigInt >= thresholdBigInt);
      } catch (error) {
        console.error("Error comparing threshold values:", error);
      }
    }
  }, [stakerContractBalance?.value, threshold]);

  // Update deadline status whenever timeLeft changes
  useEffect(() => {
    if (timeLeft !== undefined) {
      // Convert timeLeft to number for comparison
      const timeLeftNum = typeof timeLeft === 'string' ? 
        parseInt(timeLeft as string) : typeof timeLeft === 'bigint' ? 
        Number(timeLeft) : 0;
      setIsDeadlinePassed(timeLeftNum <= 0);
    }
  }, [timeLeft]);

  // Update withdraw status whenever openForWithdraw changes
  useEffect(() => {
    if (openForWithdraw !== undefined) {
      // Convert openForWithdraw to boolean
      const isOpen = typeof openForWithdraw === 'string' ? 
        openForWithdraw.toLowerCase() === 'true' : 
        Boolean(openForWithdraw);
      setIsOpenForWithdraw(isOpen);
    }
  }, [openForWithdraw]);

  useEffect(() => {
    if (isStakingCompleted !== undefined) {
      // Convert isStakingCompleted to boolean
      const isCompleted = typeof isStakingCompleted === 'string' ? 
        isStakingCompleted.toLowerCase() === 'true' : 
        Boolean(isStakingCompleted);
      console.log("Staking completed:", isCompleted);
    }
  }, [isStakingCompleted]);

  // Handle stake amount input change
  const handleStakeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStakeAmount(e.target.value);
  };

  // Handle stake function
  const handleStake = async () => {
    if (!stakeAmount) return;
    
    try {
      setIsStaking(true);
      await writeContractAsync({
        functionName: "stake",
        // No args needed for stake function, just value
        args: [],
        value: parseEther(stakeAmount),
      } as any);
      setStakeAmount("");
    } catch (error) {
      console.error("Error staking:", error);
    } finally {
      setIsStaking(false);
    }
  };
  
  // Handle execute function
  const handleExecute = async () => {
    try {
      await writeContractAsync({
        functionName: "execute",
        args: [] as never[]
      } as any);
    } catch (error) {
      console.error("Error executing:", error);
    }
  };

  // Handle withdraw function
  const handleWithdraw = async () => {
    try {
      await writeContractAsync({
        functionName: "withdraw",
        args: [] as never[]
      } as any);
    } catch (error) {
      console.error("Error withdrawing:", error);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow w-full px-4 gap-12">
      {isStakingCompleted && (
        <div className="flex flex-col items-center gap-2 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-12 w-full max-w-lg">
          <p className="block m-0 font-semibold">
            {" "}
            🎉 &nbsp; Staking App triggered `ExampleExternalContract` &nbsp; 🎉{" "}
          </p>
          <div className="flex items-center">
            <ETHToPrice
              value={exampleExternalContractBalance ? formatEther(exampleExternalContractBalance.value) : undefined}
              className="text-[1rem]"
            />
            <p className="block m-0 text-lg -ml-1">staked !!</p>
          </div>
        </div>
      )}
      <div
        className={`flex flex-col items-center space-y-8 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 w-full max-w-lg ${
          !isStakingCompleted ? "mt-24" : ""
        }`}
      >
        <div className="flex flex-col w-full items-center">
          <p className="block text-2xl mt-0 mb-2 font-semibold">Staker Contract</p>
          <Address address={address} size="xl" />
        </div>
        
        {/* Status Indicators */}
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`badge ${thresholdMet ? 'badge-success' : 'badge-warning'} gap-1 p-3`}>
              <span className="text-sm font-semibold">
                {thresholdMet ? 'Threshold Met' : 'Not Met'}
              </span>
            </div>
            
            {isDeadlinePassed && (
              <div className="badge badge-error gap-1 p-3">
                <span className="text-sm font-semibold">Deadline Passed</span>
              </div>
            )}
            
            {isOpenForWithdraw && (
              <div className="badge badge-info gap-1 p-3">
                <span className="text-sm font-semibold">Open For Withdraw</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-start justify-around w-full">
          <div className="flex flex-col items-center justify-center w-1/2">
            <p className="block text-xl mt-0 mb-1 font-semibold">Time Left</p>
            <p className="m-0 p-0">{timeLeft ? `${humanizeDuration(Number(timeLeft) * 1000)}` : 0}</p>
          </div>
          <div className="flex flex-col items-center w-1/2">
            <p className="block text-xl mt-0 mb-1 font-semibold">You Staked</p>
            <span>
              {myStake ? formatEther(typeof myStake === 'string' ? BigInt(myStake) : myStake as bigint) : 0} {targetNetwork.nativeCurrency.symbol}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-center shrink-0 w-full">
          <p className="block text-xl mt-0 mb-1 font-semibold">Total Staked</p>
          <div className="flex space-x-2">
            {<ETHToPrice value={stakerContractBalance ? formatEther(stakerContractBalance.value) : undefined} />}
            <span>/</span>
            {<ETHToPrice value={threshold ? formatEther(typeof threshold === 'string' ? BigInt(threshold) : typeof threshold === 'boolean' ? 0n : threshold as bigint) : undefined} />}
          </div>
        </div>
        
        {/* Stake Form */}
        <div className="flex flex-col w-full gap-3">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Stake Amount (ETH)</span>
            </label>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Amount to stake" 
                className="input input-bordered w-full" 
                value={stakeAmount}
                onChange={handleStakeAmountChange}
                min="0"
                step="0.01"
              />
              <button
                className="btn btn-primary uppercase"
                onClick={handleStake}
                disabled={Boolean(isStakingCompleted) || isStaking}
              >
                {isStaking ? "Staking..." : "🔏 Stake!"}
              </button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-4">
            <button
              className="btn btn-primary"
              onClick={handleExecute}
              disabled={Boolean(isStakingCompleted) || !isDeadlinePassed}
            >
              Execute!
            </button>
            <button
              className="btn btn-primary"
              onClick={handleWithdraw}
              disabled={Boolean(isStakingCompleted) || !isOpenForWithdraw || !myStake || 
                (typeof myStake === 'string' ? BigInt(myStake) : typeof myStake === 'boolean' ? 0n : myStake as bigint) === 0n}
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
