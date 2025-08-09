import React, { useState, useMemo } from "react";

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
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

// Calculate the best total for hand with Aces counted as 1 or 11
function calculateHandTotal(cards) {
  let total = 0;
  let aceCount = 0;
  cards.forEach((card) => {
    if (card === "A") aceCount++;
    total += rankValue(card);
  });
  // Adjust for aces if total > 21
  while (total > 21 && aceCount > 0) {
    total -= 10; // count one ace as 1 instead of 11
    aceCount--;
  }
  return total;
}

function isPair(cards) {
  return cards.length === 2 && cards[0] === cards[1];
}

function hasAce(cards) {
  return cards.includes("A");
}

// Decide best move based on current hand, dealer upcard, and number of cards (to allow double only on 2 cards)
function decideMove(playerCards, dealerCard) {
  if (!dealerCard || playerCards.length === 0)
    return { action: "—", reason: "Select cards and dealer card" };

  const dealerVal = rankValue(dealerCard);
  const total = calculateHandTotal(playerCards);
  const soft = hasAce(playerCards) && total <= 21;

  // Check pairs only if first two cards
  if (playerCards.length === 2 && isPair(playerCards)) {
    const rank = playerCards[0];
    if (rank === "A" || rank === "8")
      return { action: "Split", reason: "Always split Aces and 8s" };
    if (["10", "J", "Q", "K"].includes(rank))
      return { action: "Stand", reason: "Never split tens" };
    switch (rank) {
      case "2":
      case "3":
        if (dealerVal >= 4 && dealerVal <= 7)
          return { action: "Split", reason: "2s/3s vs 4-7 -> Split" };
        return { action: "Hit", reason: "2s/3s vs other -> Hit" };
      case "4":
        if (dealerVal >= 5 && dealerVal <= 6)
          return { action: "Split", reason: "4s vs 5-6 -> Split" };
        return { action: "Hit", reason: "4s vs other -> Hit" };
      case "5":
        return {
          action: "Double",
          reason: "Pair of 5s treated as 10 -> Double when allowed",
        };
      case "6":
        if (dealerVal >= 3 && dealerVal <= 6)
          return { action: "Split", reason: "6s vs 3-6 -> Split" };
        return { action: "Hit", reason: "6s vs other -> Hit" };
      case "7":
        if (dealerVal >= 2 && dealerVal <= 7)
          return { action: "Split", reason: "7s vs 2-7 -> Split" };
        return { action: "Hit", reason: "7s vs other -> Hit" };
      case "9":
        if (
          (dealerVal >= 2 && dealerVal <= 6) ||
          dealerVal === 8 ||
          dealerVal === 9
        )
          return { action: "Split", reason: "9s split vs 2-6,8,9" };
        return { action: "Stand", reason: "9s stand vs 7,10,A" };
      default:
        return { action: "Hit", reason: "Default pair -> Hit" };
    }
  }

  // Soft totals (hand contains Ace counted as 11)
  if (soft) {
    switch (total) {
      case 13: // A2
      case 14: // A3
        if (dealerVal >= 5 && dealerVal <= 6)
          return {
            action: "Double",
            reason: `Soft ${total} vs ${dealerVal} -> Double`,
          };
        return {
          action: "Hit",
          reason: `Soft ${total} vs ${dealerVal} -> Hit`,
        };
      case 15: // A4
      case 16: // A5
        if (dealerVal >= 4 && dealerVal <= 6)
          return {
            action: "Double",
            reason: `Soft ${total} vs ${dealerVal} -> Double`,
          };
        return {
          action: "Hit",
          reason: `Soft ${total} vs ${dealerVal} -> Hit`,
        };
      case 17: // A6
        if (dealerVal >= 3 && dealerVal <= 6)
          return {
            action: "Double",
            reason: `Soft ${total} vs ${dealerVal} -> Double`,
          };
        return {
          action: "Hit",
          reason: `Soft ${total} vs ${dealerVal} -> Hit`,
        };
      case 18: // A7
        if (dealerVal >= 3 && dealerVal <= 6)
          return {
            action: "Double",
            reason: `Soft 18 vs ${dealerVal} -> Double`,
          };
        if (dealerVal === 2 || dealerVal === 7 || dealerVal === 8)
          return {
            action: "Stand",
            reason: `Soft 18 vs ${dealerVal} -> Stand`,
          };
        return { action: "Hit", reason: `Soft 18 vs ${dealerVal} -> Hit` };
      case 19: // A8
      case 20: // A9
        return {
          action: "Stand",
          reason: `Soft ${total} vs ${dealerVal} -> Stand`,
        };
      default:
        return {
          action: total >= 19 ? "Stand" : "Hit",
          reason: `Soft ${total} default`,
        };
    }
  }

  // Hard totals
  if (total <= 8) return { action: "Hit", reason: `Hard ${total} -> Hit` };
  if (total === 9) {
    if (dealerVal >= 3 && dealerVal <= 6)
      return playerCards.length === 2
        ? { action: "Double", reason: `Hard 9 vs ${dealerVal} -> Double` }
        : { action: "Hit", reason: `Hard 9 -> Hit` };
    return { action: "Hit", reason: `Hard 9 -> Hit` };
  }
  if (total === 10) {
    if (dealerVal >= 2 && dealerVal <= 9)
      return playerCards.length === 2
        ? { action: "Double", reason: `Hard 10 vs ${dealerVal} -> Double` }
        : { action: "Hit", reason: `Hard 10 -> Hit` };
    return { action: "Hit", reason: `Hard 10 -> Hit` };
  }
  if (total === 11) {
    if (dealerVal >= 2 && dealerVal <= 10)
      return playerCards.length === 2
        ? { action: "Double", reason: `Hard 11 vs ${dealerVal} -> Double` }
        : { action: "Hit", reason: `Hard 11 vs A -> Hit` };
    return { action: "Hit", reason: `Hard 11 vs A -> Hit` };
  }
  if (total === 12) {
    if (dealerVal >= 4 && dealerVal <= 6)
      return { action: "Stand", reason: `Hard 12 vs ${dealerVal} -> Stand` };
    return { action: "Hit", reason: `Hard 12 -> Hit` };
  }
  if (total >= 13 && total <= 16) {
    if (dealerVal >= 2 && dealerVal <= 6)
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
  const [playerCards, setPlayerCards] = useState([]);
  const [dealer, setDealer] = useState(null);

  const result = useMemo(
    () => decideMove(playerCards, dealer),
    [playerCards, dealer]
  );

  function addCard(card) {
    if (playerCards.length >= 12) return; // limit max cards for sanity
    setPlayerCards([...playerCards, card]);
  }

  function reset() {
    setPlayerCards([]);
    setDealer(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 p-4 flex flex-col items-center justify-start">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl mt-6">
        <h1 className="text-3xl font-bold text-center mb-5">
          RDR2 Blackjack Helper
        </h1>
        <p className="text-sm text-gray-300 mb-5 text-center">
          Add your cards one by one and select dealer’s upcard. Get instant
          advice on your next move.
        </p>

        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">
            Your Cards ({playerCards.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {playerCards.length === 0 ? (
              <div className="text-gray-500 italic">No cards yet</div>
            ) : null}
            {playerCards.map((c, i) => (
              <div
                key={`card-${i}`}
                className="px-3 py-1 rounded bg-green-600 text-black font-semibold cursor-pointer select-none"
                title="Click to remove this card"
                onClick={() => {
                  // Remove clicked card
                  setPlayerCards(playerCards.filter((_, idx) => idx !== i));
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Tap a card below to add it to your hand. Tap card above to remove.
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-gray-400 mb-1">Add Card</div>
          <div className="flex flex-wrap gap-2">
            {RANKS.map((r) => (
              <button
                key={`add-${r}`}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-800 hover:bg-gray-700"
                onClick={() => addCard(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-gray-400 mb-1">Dealer Upcard</div>
          <div className="flex flex-wrap gap-2">
            {RANKS.map((r) => (
              <button
                key={`dealer-${r}`}
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

        <div className="rounded-xl bg-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Current Hand Total</div>
              <div className="text-xl font-semibold">
                {calculateHandTotal(playerCards)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Recommended Move</div>
              <div className="text-3xl font-extrabold">{result.action}</div>
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
        </div>

        <div className="mt-4 text-sm text-gray-400">
          <strong>Notes:</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>Double down is only allowed on the first two cards.</li>
            <li>Click cards above to remove them if added by mistake.</li>
            <li>
              Strategy assumes single deck, dealer stands on soft 17 (RDR2
              rules).
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
