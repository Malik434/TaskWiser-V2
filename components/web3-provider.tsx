"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

const WALLET_SESSION_KEY = "walletSession";
const WALLET_CONNECTED_FLAG = "walletConnected";

type WalletSession = {
  account: string;
  chainId: number | null;
  timestamp: number;
};

const readWalletSession = (): WalletSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(WALLET_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as WalletSession;
  } catch (error) {
    console.warn("Failed to parse wallet session, clearing cache.", error);
    window.sessionStorage.removeItem(WALLET_SESSION_KEY);
    return null;
  }
};

const writeWalletSession = (session: WalletSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
    window.localStorage.setItem(WALLET_CONNECTED_FLAG, "true");
  } else {
    window.sessionStorage.removeItem(WALLET_SESSION_KEY);
    window.localStorage.removeItem(WALLET_CONNECTED_FLAG);
  }
};

const persistWalletSession = (
  nextAccount: string | null,
  nextChainId: number | null
) => {
  if (!nextAccount) {
    writeWalletSession(null);
    return;
  }

  writeWalletSession({
    account: nextAccount,
    chainId: nextChainId ?? null,
    timestamp: Date.now(),
  });
};

type ExtendedEip1193Provider = ethers.Eip1193Provider & {
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
};

const getEthereumProvider = (): ExtendedEip1193Provider | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { ethereum } = window as typeof window & {
    ethereum?: ExtendedEip1193Provider;
  };

  return ethereum ?? null;
};

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnecting: false,
  isConnected: false,
});

export const useWeb3 = () => useContext(Web3Context);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [initialSession] = useState<WalletSession | null>(() => readWalletSession());
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(
    initialSession?.account ?? null
  );
  const [chainId, setChainId] = useState<number | null>(
    initialSession?.chainId ?? null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(Boolean(initialSession?.account));

  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      return;
    }

    const shouldRestore =
      Boolean(initialSession?.account) ||
      window.localStorage.getItem(WALLET_CONNECTED_FLAG) === "true";

    if (!shouldRestore) {
      return;
    }

    const restoreConnection = async () => {
      setIsConnecting(true);
      try {
        const restoredProvider = new ethers.BrowserProvider(ethereum);
        const accounts = await restoredProvider.send("eth_accounts", []);

        if (!accounts.length) {
          setAccount(null);
          setSigner(null);
          setProvider(null);
          setChainId(null);
          setIsConnected(false);
          persistWalletSession(null, null);
          return;
        }

        const restoredSigner = await restoredProvider.getSigner();
        const network = await restoredProvider.getNetwork();
        const normalizedAccount = accounts[0];
        const normalizedChainId = Number(network.chainId);

        setProvider(restoredProvider);
        setSigner(restoredSigner);
        setAccount(normalizedAccount);
        setChainId(normalizedChainId);
        setIsConnected(true);
        persistWalletSession(normalizedAccount, normalizedChainId);
      } catch (error) {
        console.error("Failed to restore wallet session:", error);
        setAccount(null);
        setSigner(null);
        setProvider(null);
        setChainId(null);
        setIsConnected(false);
        persistWalletSession(null, null);
      } finally {
        setIsConnecting(false);
      }
    };

    void restoreConnection();
  }, [initialSession]);

  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (ethereum) {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      const currentEthereum = getEthereumProvider();
      if (currentEthereum) {
        currentEthereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        currentEthereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      const nextAccount = accounts[0];
      setAccount(nextAccount);
      setIsConnected(true);
      persistWalletSession(nextAccount, chainId);
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    const normalizedChainId = Number.parseInt(chainIdHex, 16);
    setChainId(normalizedChainId);
    persistWalletSession(account, normalizedChainId);
  };

  const connectWallet = async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      alert("Please install MetaMask or another Ethereum wallet");
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      setIsConnected(true);

      persistWalletSession(accounts[0], Number(network.chainId));
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    persistWalletSession(null, null);
  };

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        chainId,
        connectWallet,
        disconnectWallet,
        isConnecting,
        isConnected,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
