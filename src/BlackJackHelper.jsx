import React, { useState, useMemo } from "react";

// RDR2 Blackjack Strategy App

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function rankValue(rank) {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return parseInt(rank, 10);
}

function isAce(rank) {
  return rank === "A";
}

// Basic strategy engine for single-deck, dealer stands on soft 17.
function decideMove(playerCard1, playerCard2, dealerCard) {
  if (!playerCard1 || !playerCard2 || !dealerCard)
    return { action: "—", reason: "Select all three cards" };

  const p1 = playerCard1;
  const p2 = playerCard2;
  const d = dealerCard;

  // Pair check
  const pair = p1 === p2;

  // Compute soft/hard totals
  const p1Val = rankValue(p1);
  const p2Val = rankValue(p2);
  const hasAce = isAce(p1) || isAce(p2);
  const softTotal = hasAce
    ? (isAce(p1) ? 11 : p1Val) + (isAce(p2) ? 11 : p2Val)
    : null;

  // Convert softTotal to a usable soft total (Ace counts as 11 only once)
  let softTotalAdjusted = null;
  if (hasAce) {
    const other = isAce(p1) ? p2Val : p1Val;
    softTotalAdjusted = 11 + other;
    if (softTotalAdjusted > 21) softTotalAdjusted = 1 + other; // extremely rare
  }

  const hardTotal = (isAce(p1) ? 1 : p1Val) + (isAce(p2) ? 1 : p2Val);
  const dealerVal = rankValue(d);

  // Helper for range checks
  const inRange = (val, a, b) => val >= a && val <= b;

  // 1) Pairs rules
  if (pair) {
    const rank = p1;
    // Always split A and 8
    if (rank === "A" || rank === "8")
      return { action: "Split", reason: "Always split Aces and 8s" };
    if (rank === "10" || rank === "J" || rank === "Q" || rank === "K")
      return { action: "Stand", reason: "Never split tens" };

    switch (rank) {
      case "2":
      case "3":
        if (inRange(dealerVal, 4, 7))
          return { action: "Split", reason: "2s/3s vs 4-7 -> Split" };
        return { action: "Hit", reason: "2s/3s vs other -> Hit" };
      case "4":
        if (inRange(dealerVal, 5, 6))
          return { action: "Split", reason: "4s vs 5-6 -> Split" };
        return { action: "Hit", reason: "4s vs other -> Hit" };
      case "5":
        return {
          action: "Double",
          reason: "Treat pair of 5s as 10 -> Double when allowed",
        };
      case "6":
        if (inRange(dealerVal, 3, 6))
          return { action: "Split", reason: "6s vs 3-6 -> Split" };
        return { action: "Hit", reason: "6s vs other -> Hit" };
      case "7":
        if (inRange(dealerVal, 2, 7))
          return { action: "Split", reason: "7s vs 2-7 -> Split" };
        return { action: "Hit", reason: "7s vs other -> Hit" };
      case "9":
        // Split vs 2-6,8,9. Stand vs 7,10,A
        if (inRange(dealerVal, 2, 6) || dealerVal === 8 || dealerVal === 9)
          return { action: "Split", reason: "9s split vs 2-6,8,9" };
        return { action: "Stand", reason: "9s stand vs 7,10,A" };
      default:
        return { action: "Hit", reason: "Default pair -> Hit" };
    }
  }

  // 2) Soft totals (hands containing an Ace counted as 11)
  if (hasAce) {
    const other = isAce(p1) ? p2Val : p1Val;
    const soft = 11 + other; // A + other
    // Normalize soft: A2..A9
    switch (soft) {
      case 13: // A2
      case 14: // A3
        if (inRange(dealerVal, 5, 6))
          return {
            action: "Double",
            reason: `A${other} vs ${dealerVal} -> Double`,
          };
        return { action: "Hit", reason: `A${other} vs ${dealerVal} -> Hit` };
      case 15: // A4
      case 16: // A5
        if (inRange(dealerVal, 4, 6))
          return {
            action: "Double",
            reason: `A${other} vs ${dealerVal} -> Double`,
          };
        return { action: "Hit", reason: `A${other} vs ${dealerVal} -> Hit` };
      case 17: // A6
        if (inRange(dealerVal, 3, 6))
          return { action: "Double", reason: `A6 vs ${dealerVal} -> Double` };
        return { action: "Hit", reason: `A6 vs ${dealerVal} -> Hit` };
      case 18: // A7
        if (inRange(dealerVal, 3, 6))
          return { action: "Double", reason: `A7 vs ${dealerVal} -> Double` };
        if (inRange(dealerVal, 2, 2) || inRange(dealerVal, 7, 8))
          return { action: "Stand", reason: `A7 vs ${dealerVal} -> Stand` };
        return { action: "Hit", reason: `A7 vs ${dealerVal} -> Hit` };
      case 19: // A8
      case 20: // A9
        return {
          action: "Stand",
          reason: `A${other} vs ${dealerVal} -> Stand`,
        };
      default:
        // fallback
        return {
          action: soft >= 19 ? "Stand" : "Hit",
          reason: `Soft ${soft} default`,
        };
    }
  }

  // 3) Hard totals (no usable Ace as 11)
  const total = hardTotal;
  if (total <= 8) return { action: "Hit", reason: `Hard ${total} -> Hit` };
  if (total === 9) {
    if (inRange(dealerVal, 3, 6))
      return { action: "Double", reason: `Hard 9 vs ${dealerVal} -> Double` };
    return { action: "Hit", reason: `Hard 9 -> Hit` };
  }
  if (total === 10) {
    if (inRange(dealerVal, 2, 9))
      return { action: "Double", reason: `Hard 10 vs ${dealerVal} -> Double` };
    return { action: "Hit", reason: `Hard 10 -> Hit` };
  }
  if (total === 11) {
    if (inRange(dealerVal, 2, 10))
      return { action: "Double", reason: `Hard 11 vs ${dealerVal} -> Double` };
    return { action: "Hit", reason: `Hard 11 vs A -> Hit` };
  }
  if (total === 12) {
    if (inRange(dealerVal, 4, 6))
      return { action: "Stand", reason: `Hard 12 vs ${dealerVal} -> Stand` };
    return { action: "Hit", reason: `Hard 12 -> Hit` };
  }
  if (inRange(total, 13, 16)) {
    if (inRange(dealerVal, 2, 6))
      return {
        action: "Stand",
        reason: `Hard ${total} vs ${dealerVal} -> Stand`,
      };
    return { action: "Hit", reason: `Hard ${total} -> Hit` };
  }
  if (total >= 17) return { action: "Stand", reason: `Hard ${total} -> Stand` };

  return { action: "—", reason: "No rule matched" };
}

export default function App() {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [dealer, setDealer] = useState(null);

  const result = useMemo(
    () => decideMove(player1, player2, dealer),
    [player1, player2, dealer]
  );

  function reset() {
    setPlayer1(null);
    setPlayer2(null);
    setDealer(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 p-4 flex items-start justify-center">
      <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-4">
          RDR2 Blackjack Helper
        </h1>
        <p className="text-sm text-gray-300 mb-4 text-center">
          Select your two cards and the dealer's upcard — app recommends the
          correct move (single-deck rules).
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Your Card 1</div>
            <div className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <button
                  key={`p1-${r}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    player1 === r
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  onClick={() => setPlayer1(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400">Your Card 2</div>
            <div className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <button
                  key={`p2-${r}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    player2 === r
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  onClick={() => setPlayer2(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400">Dealer Upcard</div>
            <div className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <button
                  key={`d-${r}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    dealer === r
                      ? "bg-yellow-400 text-black"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                  onClick={() => setDealer(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Selected</div>
              <div className="text-lg font-semibold">
                {player1 || "–"} , {player2 || "–"} — Dealer: {dealer || "–"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Recommended</div>
              <div className="text-2xl font-extrabold">{result.action}</div>
              <div className="text-xs text-gray-400">{result.reason}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 bg-red-600 hover:bg-red-500 rounded-lg py-2 font-bold"
          >
            Reset
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigator.share
                ? navigator.share({
                    title: "RDR2 BJ Helper",
                    text: `My hand: ${player1}, ${player2} vs ${dealer} -> ${result.action}`,
                  })
                : alert("Use share on mobile to share result");
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg py-2 font-bold text-center"
          >
            Share
          </a>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <strong>Notes:</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>Single-deck rules, dealer stands on soft 17 (RDR2 default).</li>
            <li>Always split Aces and 8s. Never take insurance.</li>
            <li>
              Double actions assume doubling is allowed in-game (if not, treat
              as Hit).
            </li>
          </ul>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Just a fun app, not a guarantee for winning. Use responsibly!
        </div>
      </div>
    </div>
  );
}
