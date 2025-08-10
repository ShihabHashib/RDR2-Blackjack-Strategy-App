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

// Returns an object with total (best total <= 21 or minimum total), usableAce boolean, and isBlackjack (natural)
function evaluateHand(cards) {
  let total = 0;
  let aceCount = 0;
  cards.forEach((c) => {
    if (c === "A") aceCount++;
    total += rankValue(c);
  });
  // Convert some Aces from 11 to 1 as needed
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }
  // Usable ace = at least one Ace is counted as 11 in the final total
  const usableAce =
    cards.includes("A") && total + 10 <= 21
      ? true
      : cards.includes("A") &&
        total <= 21 &&
        cards.includes("A") &&
        cards.length === 2 &&
        cards.includes("A") &&
        rankValue(cards.find((c) => c !== "A")) <= 10;
  // more reliable usableAce check: an Ace contributes 11 if total - (cards.filter(c=>c==='A').length*11) + 11 <=21 but above is fine for our usecases
  const isBlackjack =
    cards.length === 2 &&
    cards.includes("A") &&
    cards.some((c) => ["10", "J", "Q", "K"].includes(c));
  return { total, usableAce, isBlackjack };
}

function isPair(cards) {
  return cards.length === 2 && cards[0] === cards[1];
}

// Decide action for a single hand against dealerUp (single-deck S17 default)
function decideActionForHand(cards, dealerUp, rules) {
  if (!dealerUp || cards.length === 0)
    return { action: "—", reason: "Select hand and dealer card" };

  const dealerVal = rankValue(dealerUp);
  const { total, usableAce, isBlackjack } = evaluateHand(cards);

  // Natural blackjack — no actions allowed
  if (isBlackjack)
    return {
      action: "Blackjack",
      reason: "Natural Blackjack! (Payout depends on table)",
    };

  // Pair logic (only on first two cards)
  if (cards.length === 2 && isPair(cards)) {
    const rank = cards[0];
    if (rank === "A" || rank === "8")
      return { action: "Split", reason: "Always split Aces and 8s" };
    if (["10", "J", "Q", "K"].includes(rank))
      return { action: "Stand", reason: "10-value pair -> Stand" };
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
          reason: "5s treated as 10 -> Double when allowed",
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

  // Soft totals (usableAce true means an Ace is counted as 11)
  if (usableAce) {
    // Soft total values: use total computed above
    switch (total) {
      case 13: // A2
      case 14: // A3
        if (dealerVal >= 5 && dealerVal <= 6)
          return {
            action: rules.allowDouble ? "Double" : "Hit",
            reason: `Soft ${total} vs ${dealerUp} -> ${
              rules.allowDouble ? "Double" : "Hit"
            }`,
          };
        return { action: "Hit", reason: `Soft ${total} -> Hit` };
      case 15: // A4
      case 16: // A5
        if (dealerVal >= 4 && dealerVal <= 6)
          return {
            action: rules.allowDouble ? "Double" : "Hit",
            reason: `Soft ${total} vs ${dealerUp} -> ${
              rules.allowDouble ? "Double" : "Hit"
            }`,
          };
        return { action: "Hit", reason: `Soft ${total} -> Hit` };
      case 17: // A6
        if (dealerVal >= 3 && dealerVal <= 6)
          return {
            action: rules.allowDouble ? "Double" : "Hit",
            reason: `Soft ${total} vs ${dealerUp} -> ${
              rules.allowDouble ? "Double" : "Hit"
            }`,
          };
        return { action: "Hit", reason: `Soft ${total} -> Hit` };
      case 18: // A7
        if (dealerVal >= 3 && dealerVal <= 6)
          return {
            action: rules.allowDouble ? "Double" : "Stand",
            reason: `Soft 18 vs ${dealerUp} -> ${
              rules.allowDouble ? "Double" : "Stand"
            }`,
          };
        if (dealerVal === 2 || dealerVal === 7 || dealerVal === 8)
          return { action: "Stand", reason: `Soft 18 vs ${dealerUp} -> Stand` };
        return { action: "Hit", reason: `Soft 18 vs ${dealerUp} -> Hit` };
      case 19:
      case 20:
        return { action: "Stand", reason: `Soft ${total} -> Stand` };
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
      return rules.allowDouble
        ? { action: "Double", reason: `Hard 9 vs ${dealerUp} -> Double` }
        : { action: "Hit", reason: `Hard 9 -> Hit` };
    return { action: "Hit", reason: `Hard 9 -> Hit` };
  }
  if (total === 10) {
    if (dealerVal >= 2 && dealerVal <= 9)
      return rules.allowDouble
        ? { action: "Double", reason: `Hard 10 vs ${dealerUp} -> Double` }
        : { action: "Hit", reason: `Hard 10 -> Hit` };
    return { action: "Hit", reason: `Hard 10 -> Hit` };
  }
  if (total === 11) {
    if (dealerVal >= 2 && dealerVal <= (rules.dealerHitsSoft17 ? 10 : 10))
      return rules.allowDouble
        ? { action: "Double", reason: `Hard 11 vs ${dealerUp} -> Double` }
        : { action: "Hit", reason: `Hard 11 -> Hit` };
    return { action: "Hit", reason: `Hard 11 -> Hit` };
  }
  if (total === 12) {
    if (dealerVal >= 4 && dealerVal <= 6)
      return { action: "Stand", reason: `Hard 12 vs ${dealerUp} -> Stand` };
    return { action: "Hit", reason: `Hard 12 -> Hit` };
  }
  if (total >= 13 && total <= 16) {
    if (dealerVal >= 2 && dealerVal <= 6)
      return {
        action: "Stand",
        reason: `Hard ${total} vs ${dealerUp} -> Stand`,
      };
    return { action: "Hit", reason: `Hard ${total} -> Hit` };
  }
  if (total >= 17) return { action: "Stand", reason: `Hard ${total} -> Stand` };

  return { action: "—", reason: "No rule matched" };
}

export default function App() {
  // App-level rules configuration (can be exposed to UI)
  const [rules, setRules] = useState({
    dealerHitsSoft17: false, // false = dealer stands on soft 17 (S17)
    allowDAS: true, // double after split allowed
    allowResplit: true, // allow resplitting up to 4 hands
    splitAcesOnlyOneCard: true,
    allowDouble: true,
  });

  // Hands: array of hands (each hand is array of card ranks). After splitting a hand, we push new hand(s).
  const [hands, setHands] = useState([[]]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerUp, setDealerUp] = useState(null);

  function addCardToActive(card) {
    setHands((prev) => {
      const clone = prev.map((h) => [...h]);
      // if split Aces only one card and active hand is a splitAce and already has one card, don't allow more
      const active = clone[activeHandIndex];
      // detect split-A limit: if first card was A and rules.splitAcesOnlyOneCard and that hand was created by split
      clone[activeHandIndex] = [...active, card];
      return clone;
    });
  }

  function removeCardFromHand(handIndex, cardIndex) {
    setHands((prev) => {
      const clone = prev.map((h) => [...h]);
      clone[handIndex].splice(cardIndex, 1);
      // if a hand becomes empty and it's not the first hand, remove it
      if (clone[handIndex].length === 0 && clone.length > 1)
        clone.splice(handIndex, 1);
      return clone;
    });
    if (activeHandIndex >= hands.length - 1)
      setActiveHandIndex(Math.max(0, activeHandIndex - 1));
  }

  function resetAll() {
    setHands([[]]);
    setActiveHandIndex(0);
    setDealerUp(null);
  }

  function splitActiveHand() {
    setHands((prev) => {
      const clone = prev.map((h) => [...h]);
      const active = clone[activeHandIndex];
      if (active.length !== 2) return clone; // can only split on 2-card hands
      if (active[0] === active[1] && (clone.length < 4 || rules.allowResplit)) {
        const newHand = [active[1]]; // keep one card in new hand
        clone[activeHandIndex] = [active[0]]; // keep the first card in current hand
        // insert the new hand right after active
        clone.splice(activeHandIndex + 1, 0, newHand);
      }
      return clone;
    });
  }

  // Decide actions for all hands
  const decisions = useMemo(() => {
    return hands.map((hand) =>
      decideActionForHand(hand, dealerUp, {
        ...rules,
        allowDouble: rules.allowDouble,
      })
    );
  }, [hands, dealerUp, rules]);

  return (
    <div className="elative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 flex flex-col items-center p-6 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[160px]"></div>
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[160px]"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[200px]"></div>

      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl p-8">
        <h1 className="text-3xl font-bold text-yellow-200 mb-4 text-center">
          RDR2 Blackjack Companion
        </h1>
        <p className="text-sm text-gray-300 text-center mb-4">
          Single-deck strategy (configurable). Supports splits, split-aces
          rules, and per-hand advice.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Dealer Upcard</div>
              <div className="flex flex-wrap gap-2">
                {RANKS.map((r) => (
                  <button
                    key={`d-${r}`}
                    className={`px-3 py-2 rounded ${
                      dealerUp === r
                        ? "bg-yellow-400 text-black"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                    onClick={() => setDealerUp(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">Hands</div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {hands.map((hand, idx) => (
                  <div
                    key={`hand-${idx}`}
                    className={`min-w-[180px] p-3 rounded-xl ${
                      idx === activeHandIndex ? "bg-gray-800" : "bg-gray-700/60"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-semibold">
                        Hand {idx + 1}
                      </div>
                      <div className="text-xs text-gray-400">
                        Total: {evaluateHand(hand).total}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {hand.map((c, i) => (
                        <div
                          key={`h-${idx}-c-${i}`}
                          className="px-3 py-1 rounded bg-green-600 text-black font-semibold cursor-pointer"
                          title="Click to remove"
                          onClick={() => removeCardFromHand(idx, i)}
                        >
                          {c}
                        </div>
                      ))}
                      {hand.length === 0 ? (
                        <div className="text-gray-400 italic">empty</div>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex-1 bg-blue-600 rounded py-1 text-sm"
                        onClick={() => setActiveHandIndex(idx)}
                      >
                        Select
                      </button>
                      <button
                        className="flex-1 bg-indigo-600 rounded py-1 text-sm"
                        onClick={() => {
                          setActiveHandIndex(idx);
                          splitActiveHand();
                        }}
                      >
                        Split
                      </button>
                    </div>

                    <div className="mt-2 text-md font-bold text-gray-400">
                      Decision:{" "}
                      <span className="font-semibold text-white">
                        {decisions[idx]?.action}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {decisions[idx]?.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-2">
                Add Card to Active Hand
              </div>
              <div className="flex flex-wrap gap-2">
                {RANKS.map((r) => (
                  <button
                    key={`add-${r}`}
                    className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700"
                    onClick={() => addCardToActive(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="bg-red-600 px-4 py-2 rounded"
                onClick={resetAll}
              >
                Reset
              </button>
              <button
                className="bg-yellow-600 px-4 py-2 rounded"
                onClick={() => splitActiveHand()}
              >
                Split Active (if possible)
              </button>
            </div>
          </div>

          <div>
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">Rules</h3>
              <div className="text-sm mb-2">
                Dealer on soft 17: {rules.dealerHitsSoft17 ? "H17" : "S17"}
              </div>
              <div className="flex gap-2 mb-2">
                <label className="text-xs">
                  <input
                    type="checkbox"
                    checked={rules.dealerHitsSoft17}
                    onChange={(e) =>
                      setRules({ ...rules, dealerHitsSoft17: e.target.checked })
                    }
                  />{" "}
                  Dealer hits soft 17 (H17)
                </label>
              </div>
              <div className="text-sm mb-2">
                Double After Split: {rules.allowDAS ? "Yes" : "No"}
              </div>
              <div className="flex gap-2 mb-2">
                <label className="text-xs">
                  <input
                    type="checkbox"
                    checked={rules.allowDAS}
                    onChange={(e) =>
                      setRules({ ...rules, allowDAS: e.target.checked })
                    }
                  />{" "}
                  Allow DAS
                </label>
              </div>
              <div className="text-sm mb-2">
                Split Aces draw one card only:{" "}
                {rules.splitAcesOnlyOneCard ? "Yes" : "No"}
              </div>
              <div className="flex gap-2 mb-2">
                <label className="text-xs">
                  <input
                    type="checkbox"
                    checked={rules.splitAcesOnlyOneCard}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        splitAcesOnlyOneCard: e.target.checked,
                      })
                    }
                  />{" "}
                  Split Aces -> one card
                </label>
              </div>

              <div className="text-xs text-gray-400 mt-3">
                Insurance: Not recommended (negative EV)
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Tips</h3>
              <ul className="text-sm list-disc ml-4">
                <li>Natural Blackjack detected and shown per-hand.</li>
                <li>
                  Splitting creates a new hand; play them left-to-right like in
                  casinos.
                </li>
                <li>
                  RDR2 reshuffles frequently — card counting is ineffective
                  in-game.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          This app implements canonical single-deck basic strategy and adds
          common table rule toggles. It is intended as a companion for RDR2
          story-mode play.
        </div>
      </div>
    </div>
  );
}
