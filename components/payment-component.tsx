"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers, type Eip1193Provider } from "ethers";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export type SupportedToken = "USDC" | "USDT";

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const TOKEN_METADATA: Record<
  SupportedToken,
  { address: string; decimals: number; label: string }
> = {
  USDC: {
    address: "0x427B7203ECCD442eB0a293C3a96c5A85C6476203",
    decimals: 6,
    label: "USD Coin (Sepolia)",
  },
  USDT: {
    address: "0xA0DF73C3AEBc134c1737E407f8C9a21FeEd87Dfd",
    decimals: 6,
    label: "Tether USD (Sepolia)",
  },
};
const BATCH_PAYMENT_CONTRACT_ADDRESS =
  "0xe4d140D48ddAdb4999F82E88cA86D9AaB7c39483";
const MAX_BATCH_SIZE = 200; // Matches contract MAX_BATCH constant
const ERC20_ALLOWANCE_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];
const TASK_WISER_BATCH_ABI = [
  "function batchPay(address token, address payer, address[] recipients, uint256[] amounts) external",
];
const ERC20_INTERFACE = new ethers.Interface([
  "function transfer(address recipient, uint256 amount)",
]);
const ALL_SUPPORTED_TOKENS = Object.keys(TOKEN_METADATA) as SupportedToken[];
const MIN_GAS_BUFFER_WEI = ethers.parseUnits("0.00005", "ether");
const DISPLAY_DECIMALS = 4;

const formatDecimalString = (
  value: string | null,
  maximumFractionDigits = DISPLAY_DECIMALS
) => {
  if (value === null) {
    return null;
  }
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits,
      useGrouping: false,
    });
  }
  const [whole, fraction] = value.split(".");
  if (!fraction) {
    return whole;
  }
  return `${whole}.${fraction.slice(0, maximumFractionDigits)}`;
};

type MetaMaskProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

export type PaymentProps = {
  mode: "single" | "batch";
  assignee?: { address: string; amount: number };
  assignees?: { address: string; amount: number }[];
  onSuccess?: (txHashes: string[]) => void;
  onError?: (error: unknown) => void;
  defaultToken?: SupportedToken;
  tokenOptions?: SupportedToken[];
};

type ProgressState = {
  current: number;
  total: number;
  message: string;
};

type PayoutStatus =
  | { status: "idle"; hash?: string; message?: string }
  | { status: "pending"; hash?: string; message?: string }
  | { status: "success"; hash: string; message?: string }
  | { status: "error"; hash?: string; message?: string };

export function PaymentComponent({
  mode,
  assignee,
  assignees,
  onSuccess,
  onError,
  defaultToken,
  tokenOptions,
}: PaymentProps) {
  const [provider, setProvider] = useState<MetaMaskProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    message: "Not started",
  });
  const [error, setError] = useState<string | null>(null);
  const [successHashes, setSuccessHashes] = useState<string[]>([]);
  const resolvedTokenOptions = useMemo(() => {
    const requested = tokenOptions && tokenOptions.length ? tokenOptions : ALL_SUPPORTED_TOKENS;
    const valid = requested.filter((token): token is SupportedToken =>
      Boolean(TOKEN_METADATA[token as SupportedToken])
    );
    return valid.length ? valid : ALL_SUPPORTED_TOKENS;
  }, [tokenOptions]);

  const defaultResolvedToken =
    (defaultToken && resolvedTokenOptions.includes(defaultToken)
      ? defaultToken
      : resolvedTokenOptions[0]) ?? "USDC";

  const [selectedToken, setSelectedToken] =
    useState<SupportedToken>(defaultResolvedToken);
  const [payoutStatuses, setPayoutStatuses] = useState<
    Record<string, PayoutStatus>
  >({});
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(true);
  const [walletTokenBalance, setWalletTokenBalance] = useState<bigint | null>(null);
  const [walletEthBalance, setWalletEthBalance] = useState<bigint | null>(null);
  const [estimatedGasFeeWei, setEstimatedGasFeeWei] = useState<bigint | null>(null);
  const [isCheckingBalances, setIsCheckingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const { toast } = useToast();

  const payoutTargets = useMemo(() => {
    if (mode === "single" && assignee) {
      return [assignee];
    }
    if (mode === "batch" && assignees?.length) {
      return assignees;
    }
    return [];
  }, [mode, assignee, assignees]);

  useEffect(() => {
    if (defaultToken && resolvedTokenOptions.includes(defaultToken)) {
      setSelectedToken(defaultToken);
      return;
    }
    if (!resolvedTokenOptions.includes(selectedToken)) {
      setSelectedToken(resolvedTokenOptions[0] ?? "USDC");
    }
  }, [defaultToken, resolvedTokenOptions, selectedToken]);

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  const resetProgressState = useCallback(
    (total: number) => {
      setProgress({
        current: 0,
        total,
        message: total ? "Ready to transfer" : "Awaiting assignees",
      });
      const nextStatuses: Record<string, PayoutStatus> = {};
      payoutTargets.forEach((target) => {
        nextStatuses[target.address.toLowerCase()] = { status: "idle" };
      });
      setPayoutStatuses(nextStatuses);
    },
    [payoutTargets]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const ethereum = window.ethereum as MetaMaskProvider | undefined;
    if (!ethereum) {
      setIsMetaMaskAvailable(false);
      setError("MetaMask provider was not detected.");
      return;
    }
    setIsMetaMaskAvailable(true);
    setProvider(ethereum);

    (async () => {
      try {
        const [accounts, currentChainId] = await Promise.all([
          ethereum.request({ method: "eth_accounts" }),
          ethereum.request({ method: "eth_chainId" }),
        ]);
        if (Array.isArray(accounts) && accounts.length) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
        }
        if (typeof currentChainId === "string") {
          setChainId(currentChainId);
        }
      } catch (initError) {
        console.error("Failed to read initial provider state:", initError);
      }
    })();
  }, []);

  useEffect(() => {
    resetProgressState(payoutTargets.length);
  }, [payoutTargets, resetProgressState]);

  useEffect(() => {
    if (!provider?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setIsConnected(false);
        setCurrentAccount(null);
        setSuccessHashes([]);
        setProgress((prev) => ({ ...prev, message: "Wallet disconnected" }));
      } else {
        setCurrentAccount(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleChainChanged = (chain: string) => {
      setChainId(chain);
      if (chain !== SEPOLIA_CHAIN_ID) {
        setError("Unsupported network detected. Please switch to Sepolia.");
      } else {
        setError(null);
      }
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [provider]);

  const ensureProvider = useCallback(() => {
    if (!provider) {
      setError("MetaMask provider unavailable. Please refresh.");
      return false;
    }
    if (!isMetaMaskAvailable) {
      setError("Install MetaMask to continue.");
      return false;
    }
    return true;
  }, [provider, isMetaMaskAvailable]);

  const requiredTokenAtomic = useMemo(() => {
    const tokenMeta = TOKEN_METADATA[selectedToken];
    if (!tokenMeta || !payoutTargets.length) {
      return BigInt(0);
    }
    return payoutTargets.reduce((total, target) => {
      const amount = target.amount ?? 0;
      if (!amount) {
        return total;
      }
      try {
        return total + ethers.parseUnits(amount.toString(), tokenMeta.decimals);
      } catch (error) {
        console.warn("Failed to parse payout amount", error);
        return total;
      }
    }, BigInt(0));
  }, [payoutTargets, selectedToken]);

  const formattedWalletTokenBalance = useMemo(() => {
    const tokenMeta = TOKEN_METADATA[selectedToken];
    if (!tokenMeta || walletTokenBalance === null) {
      return null;
    }
    const formatted = ethers.formatUnits(walletTokenBalance, tokenMeta.decimals);
    return formatDecimalString(formatted);
  }, [walletTokenBalance, selectedToken]);

  const formattedRequiredToken = useMemo(() => {
    const tokenMeta = TOKEN_METADATA[selectedToken];
    if (!tokenMeta) {
      return "0";
    }
    const formatted = ethers.formatUnits(requiredTokenAtomic, tokenMeta.decimals);
    return formatDecimalString(formatted) ?? "0";
  }, [requiredTokenAtomic, selectedToken]);

  const formattedEthBalance = useMemo(() => {
    if (walletEthBalance === null) {
      return null;
    }
    const formatted = ethers.formatEther(walletEthBalance);
    return formatDecimalString(formatted);
  }, [walletEthBalance]);

  const formattedEstimatedGasFee = useMemo(() => {
    if (estimatedGasFeeWei === null) {
      return null;
    }
    const formatted = ethers.formatEther(estimatedGasFeeWei);
    return formatDecimalString(formatted);
  }, [estimatedGasFeeWei]);

  const requiresTokenBalanceCheck = requiredTokenAtomic > BigInt(0);
  const requiresGasBalanceCheck = payoutTargets.length > 0;

  const hasSufficientTokenBalance =
    !requiresTokenBalanceCheck ||
    (walletTokenBalance !== null && walletTokenBalance >= requiredTokenAtomic);
  const hasSufficientGasBalance =
    !requiresGasBalanceCheck ||
    (walletEthBalance !== null &&
      estimatedGasFeeWei !== null &&
      walletEthBalance >= estimatedGasFeeWei);

  useEffect(() => {
    if (!provider || !currentAccount || !TOKEN_METADATA[selectedToken]) {
      setWalletTokenBalance(null);
      setWalletEthBalance(null);
      setEstimatedGasFeeWei(null);
      return;
    }

    let cancelled = false;

    const refreshBalances = async () => {
      setIsCheckingBalances(true);
      try {
        const browserProvider = new ethers.BrowserProvider(provider);
        const tokenMeta = TOKEN_METADATA[selectedToken];

        const tokenContract = new ethers.Contract(
          tokenMeta.address,
          ERC20_ALLOWANCE_ABI,
          browserProvider
        );

        const [ethBalance, tokenBalanceRaw, feeData] = await Promise.all([
          browserProvider.getBalance(currentAccount),
          tokenContract.balanceOf(currentAccount),
          browserProvider.getFeeData(),
        ]);

        const gasPrice =
          feeData.maxFeePerGas ??
          feeData.gasPrice ??
          ethers.parseUnits("20", "gwei");
      const payoutCount = BigInt(Math.max(1, payoutTargets.length || 1));
      const baseGasUnits =
        mode === "batch"
          ? BigInt(320000) + BigInt(80000) * payoutCount
          : BigInt(120000) * payoutCount;
        const estimatedFee = gasPrice * baseGasUnits + MIN_GAS_BUFFER_WEI;

        if (!cancelled) {
          setWalletEthBalance(ethBalance);
          setWalletTokenBalance(tokenBalanceRaw);
          setEstimatedGasFeeWei(estimatedFee);
          setBalanceError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to refresh wallet balances:", error);
          setBalanceError(
            error instanceof Error
              ? error.message
              : "Unable to read wallet balances."
          );
        }
      } finally {
        if (!cancelled) {
          setIsCheckingBalances(false);
        }
      }
    };

    void refreshBalances();

    return () => {
      cancelled = true;
    };
  }, [provider, currentAccount, selectedToken, payoutTargets, mode]);

  const connectWallet = async () => {
    if (!ensureProvider()) {
      return;
    }
    try {
      setError(null);
      const accounts = await provider!.request({
        method: "eth_requestAccounts",
      });
      if (!Array.isArray(accounts) || !accounts.length) {
        throw new Error("No accounts returned from MetaMask.");
      }
      setCurrentAccount(accounts[0]);
      setIsConnected(true);
      const currentChainId = await provider!.request({
        method: "eth_chainId",
      });
      if (typeof currentChainId === "string") {
        setChainId(currentChainId);
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
          await attemptSwitchChain();
        } else {
          toast({
            title: "Wallet connected",
            description: `Connected account ${shortenAddress(accounts[0])}`,
          });
        }
      }
    } catch (connectError: any) {
      const formatted = formatProviderError(connectError);
      setError(formatted);
      toast({
        title: "Connection failed",
        description: formatted,
        variant: "destructive",
      });
    }
  };

  const attemptSwitchChain = async () => {
    if (!ensureProvider()) {
      return;
    }
    try {
      await provider!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      setChainId(SEPOLIA_CHAIN_ID);
      setError(null);
      toast({
        title: "Network switched",
        description: "You are now on Sepolia testnet.",
      });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        await provider!.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Test Network",
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "SEP",
                decimals: 18,
              },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  };

  const formatProviderError = (err: any) => {
    if (!err) return "Unknown error";
    if (err.code === 4001) {
      return "User rejected the request.";
    }
    if (typeof err?.message === "string") {
      if (err.message.toLowerCase().includes("insufficient")) {
        return "Insufficient funds to cover gas or amount.";
      }
      return err.message;
    }
    return "Unexpected provider error.";
  };

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const validateTargets = () => {
    if (!payoutTargets.length) {
      setError("No assignees provided.");
      return false;
    }
    if (mode === "batch" && payoutTargets.length > MAX_BATCH_SIZE) {
      setError(`Batch size exceeds maximum of ${MAX_BATCH_SIZE} recipients. Please split into smaller batches.`);
      return false;
    }
    for (const target of payoutTargets) {
      if (!ethers.isAddress(target.address)) {
        setError(`Invalid address: ${target.address}`);
        return false;
      }
      if (Number(target.amount) <= 0) {
        setError("Amounts must be greater than zero.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const sendPaymentTransaction = async (target: {
    address: string;
    amount: number;
  }) => {
    if (!provider || !currentAccount) {
      throw new Error("Wallet not connected.");
    }
    const token = TOKEN_METADATA[selectedToken];
    const atomicAmount = ethers.parseUnits(
      target.amount.toString(),
      token.decimals
    );
    const data = ERC20_INTERFACE.encodeFunctionData("transfer", [
      target.address,
      atomicAmount,
    ]);

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: currentAccount,
          to: token.address,
          value: "0x0",
          data,
        },
      ],
    });

    const browserProvider = new ethers.BrowserProvider(provider);
    await browserProvider.waitForTransaction(txHash as string, 1);
    return txHash as string;
  };

  const executeSerialPayments = async () => {
    const txHashes: string[] = [];
    let lastTarget: { address: string; amount: number } | null = null;

    try {
      for (let i = 0; i < payoutTargets.length; i += 1) {
        const target = payoutTargets[i];
        lastTarget = target;
        const key = target.address.toLowerCase();

        setProgress({
          current: i,
          total: payoutTargets.length,
          message: `Authorizing ${i + 1} / ${payoutTargets.length}`,
        });
        setPayoutStatuses((prev) => ({
          ...prev,
          [key]: { status: "pending", message: "Awaiting MetaMask confirmation" },
        }));

        const hash = await sendPaymentTransaction(target);
        txHashes.push(hash);
        setSuccessHashes((prev) => [...prev, hash]);
        setPayoutStatuses((prev) => ({
          ...prev,
          [key]: { status: "success", hash, message: "Confirmed on-chain" },
        }));
        setProgress({
          current: i + 1,
          total: payoutTargets.length,
          message: `Confirmed ${i + 1} / ${payoutTargets.length}`,
        });
        toast({
          title: "Payment sent",
          description: `Tx ${shortenAddress(hash)} confirmed`,
        });
      }
      toast({
        title: "All payouts completed",
        description: `${txHashes.length} transaction(s) confirmed.`,
      });
      onSuccess?.(txHashes);
    } catch (txError: any) {
      const formatted = formatProviderError(txError);
      if (lastTarget) {
        const key = lastTarget.address.toLowerCase();
        setPayoutStatuses((prev) => ({
          ...prev,
          [key]: { status: "error", message: formatted },
        }));
      }
      setError(formatted);
      setProgress((prev) => ({
        ...prev,
        message: "Stopped due to error",
      }));
      toast({
        title: "Payment failed",
        description: formatted,
        variant: "destructive",
      });
      onError?.(txError);
      throw txError;
    }
  };

  const executeBatchPayment = async () => {
    if (!provider || !currentAccount) {
      throw new Error("Wallet not connected.");
    }

    const token = TOKEN_METADATA[selectedToken];
    const recipients = payoutTargets.map((target) => target.address);
    const amountsAtomic = payoutTargets.map((target) =>
      ethers.parseUnits(target.amount.toString(), token.decimals)
    );
    const totalAmount = payoutTargets.reduce(
      (acc, target) => acc + Number(target.amount || 0),
      0
    );
    const totalAtomic = ethers.parseUnits(
      totalAmount.toFixed(token.decimals),
      token.decimals
    );

    const initialStatuses: Record<string, PayoutStatus> = {};
    payoutTargets.forEach((target) => {
      initialStatuses[target.address.toLowerCase()] = {
        status: "pending",
        message: "Preparing batch payment",
      };
    });
    setPayoutStatuses(initialStatuses);
    setProgress({ current: 0, total: 1, message: "Preparing batch payment" });

    try {
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();
      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ALLOWANCE_ABI,
        signer
      );
      const allowance: bigint = await tokenContract.allowance(
        currentAccount,
        BATCH_PAYMENT_CONTRACT_ADDRESS
      );

      if (allowance < totalAtomic) {
        setProgress({
          current: 0,
          total: 1,
          message: "Approving token allowance",
        });
        const approveTx = await tokenContract.approve(
          BATCH_PAYMENT_CONTRACT_ADDRESS,
          totalAtomic
        );
        await approveTx.wait();
        toast({
          title: "Allowance approved",
          description: "Token allowance updated for batch payouts.",
        });
      }

      setProgress({
        current: 0,
        total: 1,
        message: "Submitting batch transaction",
      });

      const batchContract = new ethers.Contract(
        BATCH_PAYMENT_CONTRACT_ADDRESS,
        TASK_WISER_BATCH_ABI,
        signer
      );
      const tx = await batchContract.batchPay(
        token.address,
        currentAccount,
        recipients,
        amountsAtomic
      );

      setProgress({
        current: 0,
        total: 1,
        message: "Awaiting confirmation",
      });
      const receipt = await tx.wait();
      const hash = receipt?.hash ?? tx.hash;

      setSuccessHashes([hash]);
      setProgress({
        current: 1,
        total: 1,
        message: "Batch payment confirmed",
      });
      setPayoutStatuses((prev) => {
        const next = { ...prev };
        payoutTargets.forEach((target) => {
          next[target.address.toLowerCase()] = {
            status: "success",
            hash,
            message: "Included in batch transaction",
          };
        });
        return next;
      });
      toast({
        title: "Batch payment sent",
        description: `Tx ${shortenAddress(hash)} confirmed`,
      });
      onSuccess?.([hash]);
    } catch (batchError: any) {
      const formatted = formatProviderError(batchError);
      setError(formatted);
      setProgress((prev) => ({
        ...prev,
        message: "Batch payment failed",
      }));
      setPayoutStatuses((prev) => {
        const next = { ...prev };
        payoutTargets.forEach((target) => {
          next[target.address.toLowerCase()] = {
            status: "error",
            message: formatted,
          };
        });
        return next;
      });
      toast({
        title: "Batch payment failed",
        description: formatted,
        variant: "destructive",
      });
      onError?.(batchError);
      throw batchError;
    }
  };

  const handlePay = async () => {
    if (!ensureProvider()) {
      return;
    }
    if (!isConnected || !currentAccount) {
      setError("Connect your wallet first.");
      return;
    }
    if (!isCorrectNetwork) {
      setError("Switch to Sepolia to continue.");
      return;
    }
    if (!validateTargets()) {
      return;
    }
    if (!hasSufficientTokenBalance) {
      const message = `Insufficient ${selectedToken} balance to cover payouts.`;
      setError(message);
      toast({
        title: "Not enough tokens",
        description: message,
        variant: "destructive",
      });
      return;
    }
    if (!hasSufficientGasBalance) {
      const message = "Not enough ETH to cover the estimated gas fees.";
      setError(message);
      toast({
        title: "Insufficient gas",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsPaying(true);
    setSuccessHashes([]);
    setProgress((prev) => ({
      ...prev,
      current: 0,
      message: mode === "batch" ? "Preparing batch payment" : "Starting payouts",
    }));

    try {
      if (mode === "batch") {
        await executeBatchPayment();
      } else {
        await executeSerialPayments();
      }
    } catch (err) {
      // errors handled inside respective executors
    } finally {
      setIsPaying(false);
    }
  };

  const canPay =
    isConnected &&
    isCorrectNetwork &&
    payoutTargets.length > 0 &&
    !isPaying &&
    !isCheckingBalances &&
    hasSufficientTokenBalance &&
    hasSufficientGasBalance;

  const renderPayoutStatus = (target: { address: string; amount: number }) => {
    const status = payoutStatuses[target.address.toLowerCase()];
    if (!status) return null;

    let icon = <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
    let label = "Idle";
    if (status.status === "pending") {
      icon = <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      badgeVariant = "secondary";
      label = "Pending";
    } else if (status.status === "success") {
      icon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
      badgeVariant = "default";
      label = "Success";
    } else if (status.status === "error") {
      icon = <ShieldAlert className="h-4 w-4 text-destructive" />;
      badgeVariant = "destructive";
      label = "Failed";
    }

    return (
      <div
        key={target.address}
        className="flex flex-col gap-1 rounded-lg border p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <p className="text-sm font-medium">
                {shortenAddress(target.address)}
              </p>
              <p className="text-xs text-muted-foreground">
                {target.amount} {selectedToken}
              </p>
            </div>
          </div>
          <Badge variant={badgeVariant}>{label}</Badge>
        </div>
        {status.message && (
          <p className="text-xs text-muted-foreground">{status.message}</p>
        )}
        {status.hash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${status.hash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline"
          >
            View on Etherscan
          </a>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wallet className="h-5 w-5" />
          TaskWiser Payments
        </CardTitle>
        <CardDescription>
          Send {selectedToken} payouts on Sepolia via MetaMask (EIP-1193).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Connected account</span>
            <span className="font-mono text-sm">
              {isConnected && currentAccount
                ? shortenAddress(currentAccount)
                : "Not connected"}
            </span>
          </div>
          <Button
            onClick={connectWallet}
            variant={isConnected ? "secondary" : "default"}
            disabled={isPaying}
          >
            {isConnected ? "Reconnect" : "Connect Wallet"}
          </Button>
          {!isCorrectNetwork && isConnected && (
            <Button variant="outline" onClick={attemptSwitchChain} disabled={isPaying}>
              Switch to Sepolia
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Payout asset</span>
          <Select
            value={selectedToken}
            onValueChange={(value: SupportedToken) => setSelectedToken(value)}
            disabled={isPaying || resolvedTokenOptions.length === 1}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {resolvedTokenOptions.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol} — {TOKEN_METADATA[symbol].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {mode === "single" ? "Single payout" : "Batch payouts"}
            </span>
            <span className="text-xs text-muted-foreground">
              {payoutTargets.length} recipient(s)
            </span>
          </div>
          {payoutTargets.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No assignees detected</AlertTitle>
              <AlertDescription>
                Provide at least one assignee to enable payouts.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {payoutTargets.map((target) => renderPayoutStatus(target))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Status: {progress.message}</span>
            <span>
              {progress.current}/{progress.total}
            </span>
          </div>
          <Progress
            value={
              progress.total
                ? (progress.current / progress.total) * 100
                : 0
            }
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {balanceError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Balance check failed</AlertTitle>
            <AlertDescription>{balanceError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Wallet {selectedToken} balance</span>
              <span>
                {formattedWalletTokenBalance
                  ? `${formattedWalletTokenBalance} ${selectedToken}`
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Required for payout</span>
              <span>
                {formattedRequiredToken} {selectedToken}
              </span>
            </div>
            {isCheckingBalances && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking balances…
              </p>
            )}
            {!hasSufficientTokenBalance && requiresTokenBalanceCheck && (
              <p className="text-xs text-destructive">
                Insufficient {selectedToken} balance for the selected payouts.
              </p>
            )}
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Wallet ETH balance</span>
              <span>
                {formattedEthBalance ? `${formattedEthBalance} ETH` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Estimated gas needed</span>
              <span>
                {formattedEstimatedGasFee
                  ? `${formattedEstimatedGasFee} ETH`
                  : "—"}
              </span>
            </div>
            {!hasSufficientGasBalance && requiresGasBalanceCheck && (
              <p className="text-xs text-destructive">
                Add more ETH to cover the estimated gas fees.
              </p>
            )}
          </div>
        </div>

        {successHashes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Successful transactions</p>
            <div className="space-y-1">
              {successHashes.map((hash) => (
                <a
                  key={hash}
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  {hash}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Payouts execute sequentially using MetaMask prompts. Gas fees apply.
        </div>
        <Button onClick={handlePay} disabled={!canPay} className="min-w-[140px]">
          {isPaying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            "Pay now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}


