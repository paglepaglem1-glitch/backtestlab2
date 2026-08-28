const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const pairs = {
  Forex: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
  Crypto: ["BTC/USD", "ETH/USD", "SOL/USD"]
};

let candles = [];
let candleIndex = 35;

let balance = 1000;
let peakBalance = 1000;

let openTrade = null;
let trades = [];
let timer = null;

function generateCandles() {

  let pair = $("pair").value;

  let price;

  if (pair === "BTC/USD") price = 65000;
  else if (pair === "ETH/USD") price = 3200;
  else if (pair === "SOL/USD") price = 150;
  else if (pair === "XAU/USD") price = 2400;
  else if (pair === "GBP/USD") price = 1.27;
  else if (pair === "USD/JPY") price = 145;
  else price = 1.10;

  candles = [];

  for (let i = 0; i < 180; i++) {

    let volatility;

    if (price < 10) volatility = 0.0015;
    else if (price < 5000) volatility = 5;
    else volatility = 100;

    let open = price;

    let move =
      (Math.random() - 0.47) * volatility;

    let close =
      Math.max(0.00001, open + move);

    let high =
      Math.max(open, close) +
      Math.random() * volatility;

    let low =
      Math.min(open, close) -
      Math.random() * volatility;

    candles.push({
      open,
      high,
      low,
      close
    });

    price = close;
  }

  candleIndex = 35;
  openTrade = null;

  render();
}

function formatPrice(value) {

  if (value < 10)
    return value.toFixed(5);

  return value.toFixed(2);
}

function resizeCanvas() {

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawChart();
}

function drawChart() {

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);

  const visible =
    candles.slice(
      Math.max(0, candleIndex - 70),
      candleIndex + 1
    );

  if (!visible.length) return;

  let min =
    Math.min(...visible.map(c => c.low));

  let max =
    Math.max(...visible.map(c => c.high));

  let padding =
    (max - min) * 0.12 || 1;

  min -= padding;
  max += padding;

  // Grid
  ctx.strokeStyle = "#17202d";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {

    let y =
      i * height / 5;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    let value =
      max - ((max - min) * i / 5);

    ctx.fillStyle = "#68758a";
    ctx.font = "11px Arial";

    ctx.fillText(
      formatPrice(value),
      width - 65,
      y - 5
    );
  }

  const step =
    width / visible.length;

  const candleWidth =
    Math.max(3, step * 0.58);

  visible.forEach((candle, i) => {

    const x =
      i * step + step / 2;

    const yOpen =
      priceToY(candle.open);

    const yClose =
      priceToY(candle.close);

    const yHigh =
      priceToY(candle.high);

    const yLow =
      priceToY(candle.low);

    const bullish =
      candle.close >= candle.open;

    ctx.strokeStyle =
      bullish ? "#42d3a5" : "#ff6579";

    ctx.fillStyle =
      bullish ? "#42d3a5" : "#ff6579";

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Body
    ctx.fillRect(
      x - candleWidth / 2,
      Math.min(yOpen, yClose),
      candleWidth,
      Math.max(1, Math.abs(yClose - yOpen))
    );
  });

  if (openTrade) {

    drawLevel(
      openTrade.entry,
      "#42d3a5",
      "ENTRY"
    );

    drawLevel(
      openTrade.sl,
      "#ff6579",
      "SL"
    );

    drawLevel(
      openTrade.tp,
      "#6da6ff",
      "TP"
    );
  }

  function priceToY(value) {

    return height -
      ((value - min) / (max - min)) *
      height;
  }

  function drawLevel(value, color, label) {

    const y = priceToY(value);

    ctx.strokeStyle = color;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = "11px Arial";

    ctx.fillText(
      `${label} ${formatPrice(value)}`,
      8,
      Math.max(12, y - 5)
    );
  }
}

function nextCandle() {

  if (candleIndex >= candles.length - 1)
    return;

  candleIndex++;

  checkOpenTrade();

  render();
}

function previousCandle() {

  if (candleIndex <= 1)
    return;

  candleIndex--;

  render();
}

function checkOpenTrade() {

  if (!openTrade) return;

  const candle =
    candles[candleIndex];

  let exit = null;
  let reason = "";

  if (openTrade.side === "BUY") {

    if (candle.low <= openTrade.sl) {

      exit = openTrade.sl;
      reason = "SL";

    } else if (candle.high >= openTrade.tp) {

      exit = openTrade.tp;
      reason = "TP";
    }

  } else {

    if (candle.high >= openTrade.sl) {

      exit = openTrade.sl;
      reason = "SL";

    } else if (candle.low <= openTrade.tp) {

      exit = openTrade.tp;
      reason = "TP";
    }
  }

  if (exit !== null)
    closeTrade(exit, reason);
}

function openPosition(side) {

  if (openTrade) {

    alert("Close the current trade first.");
    return;
  }

  const current =
    candles[candleIndex].close;

  const entry =
    Number($("entry").value) || current;

  const sl =
    Number($("sl").value);

  const tp =
    Number($("tp").value);

  const size =
    Number($("size").value) || 0.10;

  if (!sl || !tp) {

    alert("Set Stop Loss and Take Profit first.");
    return;
  }

  if (
    side === "BUY" &&
    !(sl < entry && tp > entry)
  ) {

    alert("BUY requires: SL < Entry < TP");
    return;
  }

  if (
    side === "SELL" &&
    !(tp < entry && sl > entry)
  ) {

    alert("SELL requires: TP < Entry < SL");
    return;
  }

  openTrade = {
    side,
    entry,
    sl,
    tp,
    size
  };

  updateStats();
  drawChart();
}

function closeTrade(exit, reason) {

  const points =
    openTrade.side === "BUY"
      ? exit - openTrade.entry
      : openTrade.entry - exit;

  let multiplier;

  if (openTrade.entry < 10)
    multiplier = 100000;
  else
    multiplier = 1;

  const pl =
    points *
    openTrade.size *
    multiplier;

  balance += pl;

  trades.unshift({
    side: openTrade.side,
    entry: openTrade.entry,
    exit,
    pl,
    reason
  });

  openTrade = null;

  peakBalance =
    Math.max(peakBalance, balance);

  renderHistory();
  updateStats();
}

function render() {

  const current =
    candles[candleIndex].close;

  $("price").textContent =
    formatPrice(current);

  $("entry").value =
    formatPrice(current);

  $("chartPair").textContent =
    $("pair").value;

  $("chartInfo").textContent =
    `${$("timeframe").value} • Demo Historical Data`;

  drawChart();
  updateStats();
}

function renderHistory() {

  const tbody =
    $("history");

  if (!trades.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="6">
          No closed trades yet
        </td>
      </tr>`;

    return;
  }

  tbody.innerHTML =
    trades.map((trade, index) => {

      return `
      <tr>
        <td>${index + 1}</td>
        <td>${trade.side}</td>
        <td>${formatPrice(trade.entry)}</td>
        <td>${formatPrice(trade.exit)}</td>
        <td>
          ${trade.pl >= 0 ? "+" : ""}
          $${trade.pl.toFixed(2)}
        </td>
        <td>${trade.reason}</td>
      </tr>`;

    }).join("");
}

function updateStats() {

  $("statBalance").textContent =
    "$" + balance.toFixed(2);

  const starting =
    Number($("balance").value) || 1000;

  const net =
    balance - starting;

  $("statPL").textContent =
    `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`;

  const wins =
    trades.filter(t => t.pl > 0).length;

  const winRate =
    trades.length
      ? wins / trades.length * 100
      : 0;

  $("statWin").textContent =
    winRate.toFixed(0) + "%";

  const drawdown =
    peakBalance > 0
      ? ((peakBalance - balance) /
         peakBalance) * 100
      : 0;

  $("statDD").textContent =
    drawdown.toFixed(2) + "%";

  $("statOpen").textContent =
    openTrade
      ? `${openTrade.side} @ ${formatPrice(openTrade.entry)}`
      : "None";
}

function setupPairs() {

  const market =
    $("market").value;

  $("pair").innerHTML =
    pairs[market]
      .map(pair => `<option>${pair}</option>`)
      .join("");

  generateCandles();
}

$("market").addEventListener(
  "change",
  setupPairs
);

$("pair").addEventListener(
  "change",
  generateCandles
);

$("timeframe").addEventListener(
  "change",
  render
);

$("next").addEventListener(
  "click",
  nextCandle
);

$("prev").addEventListener(
  "click",
  previousCandle
);

$("buy").addEventListener(
  "click",
  () => openPosition("BUY")
);

$("sell").addEventListener(
  "click",
  () => openPosition("SELL")
);

$("play").addEventListener("click", () => {

  if (timer) {

    clearInterval(timer);
    timer = null;

    $("play").textContent = "▶ Play";

  } else {

    timer = setInterval(
      nextCandle,
      Number($("speed").value)
    );

    $("play").textContent =
      "⏸ Pause";
  }
});

$("speed").addEventListener("input", () => {

  if (timer) {

    clearInterval(timer);

    timer = setInterval(
      nextCandle,
      Number($("speed").value)
    );
  }
});

$("reset").addEventListener("click", () => {

  if (timer) {

    clearInterval(timer);
    timer = null;

    $("play").textContent =
      "▶ Play";
  }

  balance =
    Number($("balance").value) || 1000;

  peakBalance = balance;

  trades = [];
  openTrade = null;

  generateCandles();
  renderHistory();
});

$("clear").addEventListener("click", () => {

  trades = [];

  balance =
    Number($("balance").value) || 1000;

  peakBalance = balance;

  renderHistory();
  updateStats();
});

window.addEventListener(
  "resize",
  resizeCanvas
);

balance = Number($("balance").value);

setupPairs();
renderHistory();
resizeCanvas();
