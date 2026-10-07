// ---- Load state ----
let balance = localStorage.getItem("balance") !== null
  ? Number(localStorage.getItem("balance"))
  : 1000;
let betHistory = JSON.parse(localStorage.getItem("betHistory")) || [];
let resolvedMatches = JSON.parse(localStorage.getItem("resolvedMatches")) || {};
let currentBet = null;

const matches = [
  { id: 1, home: "Arsenal", away: "Chelsea", odds: [1.8, 3.2, 4.5] },
  { id: 2, home: "Barcelona", away: "Real Madrid", odds: [2.1, 3.0, 3.6] },
  { id: 3, home: "Gor Mahia", away: "AFC Leopards", odds: [2.5, 3.1, 2.9] },
];

// ---- Elements ----
const matchesEl = document.getElementById("matches");
const balanceEl = document.getElementById("balance");
const slipEmpty = document.getElementById("slip-empty");
const slipContent = document.getElementById("slip-content");
const slipPick = document.getElementById("slip-pick");
const slipOdds = document.getElementById("slip-odds");
const slipStake = document.getElementById("slip-stake");
const slipWin = document.getElementById("slip-win");

// ---- Save ----
function saveState() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("betHistory", JSON.stringify(betHistory));
  localStorage.setItem("resolvedMatches", JSON.stringify(resolvedMatches));
}

// ---- Render matches ----
function renderMatches() {
  matchesEl.innerHTML = "";
  matches.forEach((m) => {
    const card = document.createElement("div");
    card.className = "match";

    const isResolved = resolvedMatches[m.id];
    let resultHTML = "";

    if (isResolved) {
      const winner = ["home", "draw", "away"][isResolved.outcome];
      resultHTML = `<div class="resolved">✅ Resolved: <strong>${winner}</strong></div>`;
    } else {
      resultHTML = `<button class="resolve-btn" onclick="resolveMatch(${m.id})">🎲 Resolve Match</button>`;
    }

    card.innerHTML = `
      <h3>${m.home} vs ${m.away}</h3>
      <div class="odds">
        <button onclick="selectBet(${m.id}, 0)" ${isResolved ? "disabled" : ""}>${m.home} (${m.odds[0]})</button>
        <button onclick="selectBet(${m.id}, 1)" ${isResolved ? "disabled" : ""}>Draw (${m.odds[1]})</button>
        <button onclick="selectBet(${m.id}, 2)" ${isResolved ? "disabled" : ""}>${m.away} (${m.odds[2]})</button>
      </div>
      ${resultHTML}
    `;
    matchesEl.appendChild(card);
  });
}

// ---- Resolve a match ----
function resolveMatch(matchId) {
  const match = matches.find((m) => m.id === matchId);
  const outcome = Math.floor(Math.random() * 3); // 0,1,2
  const winnerLabel = [match.home, "Draw", match.away][outcome];

  resolvedMatches[matchId] = { outcome, winnerLabel };

  let totalPayout = 0;
  let wins = 0;

  betHistory.forEach((bet) => {
    if (bet.matchId === matchId && bet.status === "pending") {
      if (bet.outcome === outcome) {
        bet.status = "won";
        balance += bet.potentialWin;
        totalPayout += bet.potentialWin;
        wins++;
      } else {
        bet.status = "lost";
      }
    }
  });

  saveState();
  updateBalance();
  renderMatches();
  renderHistory();

  const msg = wins
    ? `🎉 ${winnerLabel}! ${wins} bet(s) won — payout: ${totalPayout.toFixed(2)} credits.`
    : `🎲 ${winnerLabel}. No winning bets this time.`;
  showMessage(msg, wins ? "#22c55e" : "#ef4444");
}

// ---- Bet slip logic (same as before) ----
function selectBet(matchId, outcome) {
  if (resolvedMatches[matchId]) return;

  const match = matches.find((m) => m.id === matchId);
  const pick = [match.home, "Draw", match.away][outcome];
  const odds = match.odds[outcome];

  currentBet = {
    matchId,
    outcome,
    pick,
    odds,
    matchLabel: `${match.home} vs ${match.away}`,
  };

  slipPick.textContent = `${currentBet.matchLabel} → ${pick}`;
  slipOdds.textContent = odds;
  updatePotentialWin();
  slipEmpty.style.display = "none";
  slipContent.style.display = "block";
}

function updatePotentialWin() {
  if (!currentBet) return;
  const stake = Number(slipStake.value) || 0;
  slipWin.textContent = (stake * currentBet.odds).toFixed(2);
}
slipStake.addEventListener("input", updatePotentialWin);

document.getElementById("place-btn").addEventListener("click", () => {
  if (!currentBet) return;

  const stake = Number(slipStake.value);
  if (!stake || stake <= 0) {
    showMessage("❌ Enter a valid stake.", "#ef4444");
    return;
  }
  if (stake > balance) {
    showMessage("❌ Not enough credits!", "#ef4444");
    return;
  }

  balance -= stake;

  betHistory.unshift({
    matchId: currentBet.matchId,
    match: currentBet.matchLabel,
    outcome: currentBet.outcome,
    pick: currentBet.pick,
    odds: currentBet.odds,
    stake,
    potentialWin: +(stake * currentBet.odds).toFixed(2),
    status: "pending",
    time: new Date().toLocaleString(),
  });

  saveState();
  updateBalance();
  renderHistory();
  showMessage(`✅ Bet placed: ${stake} credits on "${currentBet.pick}".`, "#22c55e");
  cancelBet();
});

document.getElementById("cancel-btn").addEventListener("click", cancelBet);

function cancelBet() {
  currentBet = null;
  slipContent.style.display = "none";
  slipEmpty.style.display = "block";
}

// ---- History ----
function renderHistory() {
  const section = document.getElementById("history-section");
  section.innerHTML = `
    <h2 style="margin-top:40px;">📜 Bet History</h2>
    <div id="history"></div>
    <button id="reset-btn" style="margin-top:16px; padding:10px 16px; border:none; border-radius:8px; background:#ef4444; color:white; font-weight:bold; cursor:pointer;">Reset All Data</button>
  `;
  document.getElementById("reset-btn").addEventListener("click", resetAll);

  const historyEl = document.getElementById("history");
  if (betHistory.length === 0) {
    historyEl.innerHTML = "<p style='color:#94a3b8;'>No bets yet.</p>";
    return;
  }

  historyEl.innerHTML = betHistory
    .map((b) => {
      const cls =
        b.status === "won"
          ? "bet-win"
          : b.status === "lost"
          ? "bet-loss"
          : "bet-pending";
      const label =
        b.status === "won"
          ? `✅ WON +${b.potentialWin}`
          : b.status === "lost"
          ? "❌ LOST"
          : "⏳ Pending";
      return `
        <div class="match ${cls}" style="margin-bottom:10px;">
          <strong>${b.match}</strong> → ${b.pick} @ ${b.odds}<br>
          Stake: ${b.stake} • ${label}<br>
          <small style="color:#94a3b8;">${b.time}</small>
        </div>`;
    })
    .join("");
}

function resetAll() {
  if (!confirm("Reset everything (balance, bets, resolved matches)?")) return;
  localStorage.removeItem("balance");
  localStorage.removeItem("betHistory");
  localStorage.removeItem("resolvedMatches");
  balance = 1000;
  betHistory = [];
  resolvedMatches = {};
  updateBalance();
  renderMatches();
  renderHistory();
  showMessage("🔄 Full reset complete.", "#3b82f6");
}

// ---- Helpers ----
function updateBalance() {
  balanceEl.textContent = balance.toFixed(2);
}

function showMessage(text, color) {
  const msg = document.querySelector(".message");
  msg.textContent = text;
  msg.style.display = "block";
  msg.style.marginTop = "20px";
  msg.style.padding = "12px";
  msg.style.borderRadius = "8px";
  msg.style.background = "#1e293b";
  msg.style.borderLeft = `4px solid ${color}`;
}

// ---- Init ----
renderMatches();
updateBalance();
renderHistory();
