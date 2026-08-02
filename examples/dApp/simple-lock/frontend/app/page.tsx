"use client";

import React, { useEffect, useState } from "react";
import {
  capacityOf,
  generateAccount,
  shannonToCKB,
  unlock,
  wait,
} from "./hash-lock";
import Link from "next/link";
import { Script, hashCkb, hexFrom } from "@ckb-ccc/core";
import scripts from "../deployment/scripts.json";
import { readEnvNetwork } from "./ccc-client";

const myScripts = scripts[readEnvNetwork()] as any;

// Helper Component for Truncate and Copy
const CopyableText = ({ text, truncate = true }: { text: string; truncate?: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = truncate && text.length > 20 
    ? `${text.slice(0, 10)}...${text.slice(-8)}` 
    : text;

  return (
    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
      <span className="text-sm font-mono text-slate-700 truncate">{displayText}</span>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
};


export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple Lock Example
          </h1>
          <p className="mt-2 text-slate-500">
            Demonstration of creating and transferring CKB using a custom Hash Lock.
          </p>
        </div>
        
        <HashLock />
      </div>
    </main>
  );
}

function HashLock() {
  const scriptName = "hash-lock.bc";

  // State for "Build A Lock"
  const [preimage, setPreimage] = useState<string>("Hello World");
  const [hash, setHash] = useState<string>("");
  const [fromAddr, setFromAddr] = useState("");
  const [fromLock, setFromLock] = useState<Script>();
  const [balance, setBalance] = useState("0");

  // State for "Transfer"
  const [toAddr, setToAddr] = useState(
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqt435c3epyrupszm7khk6weq5lrlyt52lg48ucew"
  );
  const [amountInCKB, setAmountInCKB] = useState("99");
  const [unlockPreimage, setUnlockPreimage] = useState(""); // Specific preimage input for transfer
  
  // State for UX
  const [isTransferring, setIsTransferring] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  useEffect(() => {
    // Automatically update Hash when preimage changes
    if (preimage != null) {
      const buffer = hexFrom(Array.from(preimage).map((c) => c.charCodeAt(0)));
      const newHash = hashCkb(buffer).slice(2);
      setHash(newHash);
    }
  }, [preimage]);

  useEffect(() => {
    if (hash && myScripts[scriptName] != null) {
      updateFromInfo();
    }
  }, [hash]);

  const updateFromInfo = async () => {
    try {
      const { lockScript, address } = generateAccount(hash);
      const capacity = await capacityOf(address);
      setFromAddr(address);
      setFromLock(lockScript);
      setBalance(shannonToCKB(capacity).toString());
    } catch (error) {
      console.error("Error generating account info", error);
    }
  };

  const onTransfer = async () => {
    setIsTransferring(true);
    setAlertInfo(null); // Reset alert

    try {
      // Call unlock using the new unlockPreimage state
      const txHash = await unlock(fromAddr, toAddr, amountInCKB, unlockPreimage);
      
      setAlertInfo({
        type: 'success',
        message: `Transaction successful! Tx Hash: ${txHash}`
      });

      // Wait for block confirmation (simple simulation)
      await wait(10);
      await updateFromInfo();
    } catch (error: any) {
      setAlertInfo({
        type: 'error',
        message: error.message || "Failed to process transaction"
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const isAmountValid = +amountInCKB > 61;
  const hasEnoughBalance = +balance > +amountInCKB;
  const enabled = isAmountValid && hasEnoughBalance && toAddr.length > 0 && unlockPreimage.length > 0 && !isTransferring;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* CARD 1: Build A Lock & Lock Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-800 px-6 py-4">
          <h2 className="text-xl font-bold text-white">1. Build A Lock</h2>
        </div>
        
        <div className="p-6 flex-1 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="Preimage-key" className="block text-sm font-medium text-slate-700 mb-1">
                Preimage (Initial Data)
              </label>
              <input
                id="Preimage-key"
                type="text"
                value={preimage}
                onChange={(e) => setPreimage(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter preimage..."
              />
            </div>
            
            <div>
              <label htmlFor="Hash-key" className="block text-sm font-medium text-slate-700 mb-1">
                Hash (blake2b_256)
              </label>
              <input
                id="Hash-key"
                type="text"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 outline-none"
                readOnly
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
            <strong>Hints:</strong> Here, for ease of testing, we use <em>Preimage</em> to generate the <em>Hash</em> directly on the client side. You can also calculate the hash separately{" "}
            <Link className="text-blue-600 underline font-semibold hover:text-blue-700" href="https://codesandbox.io/p/sandbox/calculate-blake2b-256-hash-6h2s8?file=%2Fsrc%2FApp.vue%3A55%2C25" target="_blank">
              here
            </Link>.
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Lock Information</h3>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">CKB Address (Lock)</span>
                {fromAddr ? <CopyableText text={fromAddr} /> : <span className="text-sm text-slate-400">Waiting...</span>}
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">Total Capacity (Balance)</span>
                <span className="text-xl font-bold text-slate-800">{balance} <span className="text-sm font-normal text-slate-500">CKB</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Transfer */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">2. Transfer from Lock</h2>
        </div>
        
        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="to-address" className="block text-sm font-medium text-slate-700 mb-1">
                Receiver Address
              </label>
              <input
                id="to-address"
                type="text"
                value={toAddr}
                onChange={(e) => setToAddr(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (CKB)
                </label>
                <input
                  id="amount"
                  type="number"
                  value={amountInCKB}
                  onChange={(e) => setAmountInCKB(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-all ${
                    amountInCKB && !isAmountValid ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {amountInCKB && !isAmountValid && (
                  <p className="mt-1 text-xs text-red-500">Amount must be &gt; 61 CKB</p>
                )}
              </div>
              
              <div>
                <label htmlFor="unlock-preimage" className="block text-sm font-medium text-slate-700 mb-1">
                  Unlock Preimage
                </label>
                <input
                  id="unlock-preimage"
                  type="text"
                  value={unlockPreimage}
                  onChange={(e) => setUnlockPreimage(e.target.value)}
                  placeholder="Preimage key..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span>Transaction Fee: <strong>0.001 CKB</strong></span>
              {!hasEnoughBalance && <span className="text-red-500 font-medium">Insufficient balance</span>}
            </div>

            {/* Custom Alert Box */}
            {alertInfo && (
              <div className={`p-4 rounded-xl text-sm break-all ${
                alertInfo.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                <strong>{alertInfo.type === 'error' ? 'Error: ' : 'Success: '}</strong>
                {alertInfo.message}
              </div>
            )}
          </div>

          <button
            className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
              enabled 
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]' 
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
            disabled={!enabled}
            onClick={onTransfer}
          >
            {isTransferring ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Transfer...
              </>
            ) : (
              "Send Transfer"
            )}
          </button>
        </div>
      </div>
      
    </div>
  );
}