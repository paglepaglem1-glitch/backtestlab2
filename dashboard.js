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
let pendingOrder = null;
let trades = [];
let timer = null;


/* =========================
   CANDLE DATA
========================= */

async function generateCandles() {

  const pair = $("pair").value;

  const symbolMap = {
    "EUR/USD": "EURUSD",
    "GBP/USD": "GBPUSD",
    "USD/JPY": "USDJPY",
    "XAU/USD": "XAUUSD",
    "BTC/USD": "BTCUSD",
    "ETH/USD": "ETHUSD",
    "SOL/USD": "SOLUSD"
  };

  const symbol = symbolMap[pair];

  const timeframeMap = {
    "5m": "5m",
    "15m": "15m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d"
  };

  const interval =
    timeframeMap[$("timeframe").value] || "5m";

  try {

    $("chartInfo").textContent =
      "Loading real market data...";

    const url =
      `https://biquote.io/api/${symbol}/ohlc?interval=${interval}&limit=1000`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Data request failed");
    }

    const data = await response.json();

    if (!data.bars || !data.bars.length) {
      throw new Error("No candles received");
    }

    candles = data.bars
      .filter(candle => !candle.isOpen)
      .reverse()
      .map(candle => ({
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        time: candle.openTime
      }));

    candleIndex =
      Math.min(50, candles.length - 1);

    openTrade = null;
    pendingOrder = null;

    $("chartInfo").textContent =
      `${$("timeframe").value} • Real Historical Data`;

    render();

  } catch (error) {

    console.error(error);

    $("chartInfo").textContent =
      "Unable to load market data";

    alert(
      "Historical data load nahi ho saka."
    );
  }
}

  const pair = $("pair").value;

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

    const open = price;

    const move =
      (Math.random() - 0.47) * volatility;

    const close =
      Math.max(0.00001, open + move);

    const high =
      Math.max(open, close) +
      Math.random() * volatility;

    const low =
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
  pendingOrder = null;

  render();
}


/* =========================
   PRICE FORMAT
========================= */

function formatPrice(value) {

  if (value < 10) return value.toFixed(5);

  if (value < 5000) return value.toFixed(2);

  return value.toFixed(2);
}


/* =========================
   RISK CALCULATION
========================= */

function calculateRisk() {

  const accountBalance =
    Number($("balance").value) || 0;

  const riskPercent =
    Number($("risk").value) || 0;

  const entry =
    Number($("entry").value);

  const sl =
    Number($("sl").value);

  const tp =
    Number($("tp").value);

  const riskAmount =
    accountBalance *
    riskPercent /
    100;

  $("riskAmount").value =
    "$" + riskAmount.toFixed(2);

  $("statRisk").textContent =
    "$" + riskAmount.toFixed(2);


  if (!entry || !sl || !tp) {

    $("slDistance").value = "-";
    $("tpDistance").value = "-";
    $("rr").value = "-";
    $("size").value = "-";
    $("potentialLoss").value = "-";
    $("potentialProfit").value = "-";

    $("riskStatus").textContent =
      "Set Entry, SL & TP";

    return;
  }


  const slDistance =
    Math.abs(entry - sl);

  const tpDistance =
    Math.abs(tp - entry);


  $("slDistance").value =
    formatPrice(slDistance);

  $("tpDistance").value =
    formatPrice(tpDistance);


  if (slDistance <= 0) {

    $("rr").value = "-";
    $("size").value = "-";
    $("potentialLoss").value = "-";
    $("potentialProfit").value = "-";

    return;
  }


  const rr =
    tpDistance / slDistance;


  $("rr").value =
    "1:" + rr.toFixed(2);


  /*
    Demo position-size calculation.

    For low-priced Forex-style pairs:
    size = risk / SL distance / 100000

    For larger-priced demo assets:
    size = risk / SL distance
  */

  const pair =
    $("pair").value;

  let positionSize;


  if (
    pair === "EUR/USD" ||
    pair === "GBP/USD"
  ) {

    positionSize =
      riskAmount /
      (slDistance * 100000);

  } else {

    positionSize =
      riskAmount /
      slDistance;
  }


  positionSize =
    Math.max(
      0,
      positionSize
    );


  $("size").value =
    positionSize.toFixed(4);


  $("potentialLoss").value =
    "-$" +
    riskAmount.toFixed(2);


  $("potentialProfit").value =
    "$" +
    (
      riskAmount * rr
    ).toFixed(2);


  $("riskStatus").textContent =
    "Risk calculated";
}


/* =========================
   CANVAS
========================= */

function resizeCanvas() {

  const rect =
    canvas.getBoundingClientRect();

  const dpr =
    window.devicePixelRatio || 1;

  canvas.width =
    rect.width * dpr;

  canvas.height =
    rect.height * dpr;

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  drawChart();
}


/* =========================
   CHART
========================= */

function drawChart() {

  const width =
    canvas.clientWidth;

  const height =
    canvas.clientHeight;

  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  const visible =
    candles.slice(
      Math.max(
        0,
        candleIndex - 70
      ),
      candleIndex + 1
    );


  if (!visible.length) return;


  let min =
    Math.min(
      ...visible.map(c => c.low)
    );

  let max =
    Math.max(
      ...visible.map(c => c.high)
    );


  const padding =
    (max - min) * 0.12 || 1;

  min -= padding;
  max += padding;


  function priceToY(value) {

    return height -
      ((value - min) /
      (max - min)) *
      height;
  }


  /* Grid */

  ctx.strokeStyle = "#17202d";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {

    const y =
      i * height / 5;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();


    const value =
      max -
      ((max - min) * i / 5);

    ctx.fillStyle = "#68758a";
    ctx.font = "11px Arial";

    ctx.fillText(
      formatPrice(value),
      width - 70,
      y - 5
    );
  }


  const step =
    width / visible.length;

  const candleWidth =
    Math.max(
      3,
      step * 0.58
    );


  visible.forEach((candle, i) => {

    const x =
      i * step +
      step / 2;

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

    const color =
      bullish
        ? "#42d3a5"
        : "#ff6579";


    ctx.strokeStyle = color;
    ctx.fillStyle = color;


    /* Wick */

    ctx.beginPath();

    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);

    ctx.stroke();


    /* Body */

    ctx.fillRect(
      x - candleWidth / 2,
      Math.min(
        yOpen,
        yClose
      ),
      candleWidth,
      Math.max(
        1,
        Math.abs(
          yClose - yOpen
        )
      )
    );

  });


  /* Trade levels */

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


  if (pendingOrder) {

    drawLevel(
      pendingOrder.entry,
      "#f5b84b",
      "LIMIT"
    );
  }


  function drawLevel(
    value,
    color,
    label
  ) {

    const y =
      priceToY(value);

    ctx.strokeStyle = color;

    ctx.setLineDash([
      6,
      4
    ]);

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


/* =========================
   NEXT CANDLE
========================= */

function nextCandle() {

  if (
    candleIndex >=
    candles.length - 1
  ) return;

  candleIndex++;

  checkPendingOrder();
  checkOpenTrade();

  render();
}


/* =========================
   PREVIOUS CANDLE
========================= */

function previousCandle() {

  if (candleIndex <= 1) return;

  candleIndex--;

  render();
}


/* =========================
   PLACE ORDER
========================= */

function placeOrder(side) {

  if (openTrade) {

    alert(
      "Close the current trade first."
    );

    return;
  }


  if (pendingOrder) {

    alert(
      "A pending order already exists."
    );

    return;
  }


  const current =
    candles[candleIndex].close;

  const orderType =
    $("orderType").value;


  let entry;


  if (orderType === "MARKET") {

    entry = current;

    $("entry").value =
      formatPrice(entry);

  } else {

    entry =
      Number(
        $("entry").value
      );

    if (!entry) {

      alert(
        "Enter the Limit price."
      );

      return;
    }
  }


  const sl =
    Number($("sl").value);

  const tp =
    Number($("tp").value);


  if (!sl || !tp) {

    alert(
      "Set Stop Loss and Take Profit."
    );

    return;
  }


  if (
    side === "BUY" &&
    !(sl < entry && tp > entry)
  ) {

    alert(
      "BUY requires SL < Entry < TP."
    );

    return;
  }


  if (
    side === "SELL" &&
    !(tp < entry && sl > entry)
  ) {

    alert(
      "SELL requires TP < Entry < SL."
    );

    return;
  }


  const size =
    Number($("size").value);


  if (!size || size <= 0) {

    alert(
      "Invalid position size."
    );

    return;
  }


  const trade = {

    type: orderType,

    side,

    entry,

    sl,

    tp,

    size
  };


  if (orderType === "MARKET") {

    openTrade = trade;

  } else {

    pendingOrder = trade;
  }


  calculateRisk();
  updateStats();
  drawChart();
}


/* =========================
   LIMIT TRIGGER
========================= */

function checkPendingOrder() {

  if (!pendingOrder) return;


  const candle =
    candles[candleIndex];


  let triggered = false;


  if (
    pendingOrder.side === "BUY"
  ) {

    if (
      candle.low <=
      pendingOrder.entry
    ) {

      triggered = true;
    }

  } else {

    if (
      candle.high >=
      pendingOrder.entry
    ) {

      triggered = true;
    }
  }


  if (triggered) {

    openTrade =
      pendingOrder;

    pendingOrder = null;
  }
}


/* =========================
   SL / TP
========================= */

function checkOpenTrade() {

  if (!openTrade) return;


  const candle =
    candles[candleIndex];


  let exit = null;
  let reason = "";


  if (
    openTrade.side === "BUY"
  ) {

    if (
      candle.low <=
      openTrade.sl
    ) {

      exit = openTrade.sl;
      reason = "SL";

    } else if (
      candle.high >=
      openTrade.tp
    ) {

      exit = openTrade.tp;
      reason = "TP";
    }

  } else {

    if (
      candle.high >=
      openTrade.sl
    ) {

      exit = openTrade.sl;
      reason = "SL";

    } else if (
      candle.low <=
      openTrade.tp
    ) {

      exit = openTrade.tp;
      reason = "TP";
    }
  }


  if (exit !== null) {

    closeTrade(
      exit,
      reason
    );
  }
}


/* =========================
   CLOSE TRADE
========================= */

function closeTrade(
  exit,
  reason
) {

  const points =
    openTrade.side === "BUY"

      ? exit -
        openTrade.entry

      : openTrade.entry -
        exit;


  const pair =
    $("pair").value;


  let multiplier = 1;


  if (
    pair === "EUR/USD" ||
    pair === "GBP/USD"
  ) {

    multiplier = 100000;
  }


  const pl =
    points *
    openTrade.size *
    multiplier;


  balance += pl;


  trades.unshift({

    type:
      openTrade.type,

    side:
      openTrade.side,

    entry:
      openTrade.entry,

    exit,

    pl,

    reason
  });


  openTrade = null;


  peakBalance =
    Math.max(
      peakBalance,
      balance
    );


  renderHistory();
  updateStats();
}


/* =========================
   RENDER
========================= */

function render() {

  if (!candles.length) return;


  const current =
    candles[candleIndex].close;


  $("price").textContent =
    formatPrice(current);


  $("chartPair").textContent =
    $("pair").value;


  $("chartInfo").textContent =
    `${$("timeframe").value} • Demo Historical Data`;


  if (
    $("orderType").value ===
    "MARKET" &&
    !openTrade &&
    !pendingOrder
  ) {

    $("entry").value =
      formatPrice(current);
  }


  calculateRisk();
  drawChart();
  updateStats();
}


/* =========================
   HISTORY
========================= */

function renderHistory() {

  const tbody =
    $("history");


  if (!trades.length) {

    tbody.innerHTML =
      `<tr>
        <td colspan="7">
          No closed trades yet
        </td>
      </tr>`;

    return;
  }


  tbody.innerHTML =
    trades.map(
      (trade, index) => {

        const pl =
          trade.pl >= 0
            ? "+" +
              trade.pl.toFixed(2)
            : trade.pl.toFixed(2);


        return `
        <tr>
          <td>${index + 1}</td>
          <td>${trade.type}</td>
          <td>${trade.side}</td>
          <td>${formatPrice(trade.entry)}</td>
          <td>${formatPrice(trade.exit)}</td>
          <td>$${pl}</td>
          <td>${trade.reason}</td>
        </tr>
        `;
      }
    ).join("");
}


/* =========================
   STATS
========================= */

function updateStats() {

  $("statBalance").textContent =
    "$" +
    balance.toFixed(2);


  const starting =
    Number($("balance").value) ||
    1000;


  const net =
    balance - starting;


  $("statPL").textContent =
    `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`;


  const wins =
    trades.filter(
      trade =>
        trade.pl > 0
    ).length;


  const winRate =
    trades.length
      ? wins /
        trades.length *
        100
      : 0;


  $("statWin").textContent =
    winRate.toFixed(0) +
    "%";


  const drawdown =
    peakBalance > 0
      ? (
          (peakBalance -
          balance) /
          peakBalance
        ) * 100
      : 0;


  $("statDD").textContent =
    drawdown.toFixed(2) +
    "%";


  $("statOpen").textContent =
    openTrade
      ? `${openTrade.side} @ ${formatPrice(openTrade.entry)}`
      : "None";


  $("statPending").textContent =
    pendingOrder
      ? `${pendingOrder.side} LIMIT @ ${formatPrice(pendingOrder.entry)}`
      : "None";
}


/* =========================
   PAIRS
========================= */

function setupPairs() {

  const market =
    $("market").value;


  $("pair").innerHTML =
    pairs[market]
      .map(
        pair =>
          `<option>${pair}</option>`
      )
      .join("");


  generateCandles();
}


/* =========================
   INPUT EVENTS
========================= */

[
  "balance",
  "risk",
  "entry",
  "sl",
  "tp"
].forEach(id => {

  $(id).addEventListener(
    "input",
    () => {

      calculateRisk();
      updateStats();
      drawChart();

    }
  );

});


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
  () => placeOrder("BUY")
);


$("sell").addEventListener(
  "click",
  () => placeOrder("SELL")
);


/* =========================
   ORDER TYPE
========================= */

$("orderType").addEventListener(
  "change",
  () => {

    const current =
      candles[candleIndex].close;


    if (
      $("orderType").value ===
      "MARKET"
    ) {

      $("entry").value =
        formatPrice(current);

      $("riskStatus").textContent =
        "Market price selected";

    } else {

      $("riskStatus").textContent =
        "Enter your Limit price";
    }


    calculateRisk();
    drawChart();
  }
);


/* =========================
   PLAY
========================= */

$("play").addEventListener(
  "click",
  () => {

    if (timer) {

      clearInterval(timer);

      timer = null;

      $("play").textContent =
        "▶ Play";

    } else {

      timer =
        setInterval(
          nextCandle,
          Number(
            $("speed").value
          )
        );

      $("play").textContent =
        "⏸ Pause";
    }
  }
);


$("speed").addEventListener(
  "input",
  () => {

    if (timer) {

      clearInterval(timer);

      timer =
        setInterval(
          nextCandle,
          Number(
            $("speed").value
          )
        );
    }
  }
);


/* =========================
   RESET
========================= */

$("reset").addEventListener(
  "click",
  () => {

    if (timer) {

      clearInterval(timer);

      timer = null;

      $("play").textContent =
        "▶ Play";
    }


    balance =
      Number(
        $("balance").value
      ) || 1000;


    peakBalance =
      balance;


    trades = [];

    openTrade = null;
    pendingOrder = null;


    generateCandles();

    renderHistory();
    updateStats();
  }
);


/* =========================
   CLEAR HISTORY
========================= */

$("clear").addEventListener(
  "click",
  () => {

    trades = [];

    balance =
      Number(
        $("balance").value
      ) || 1000;


    peakBalance =
      balance;


    renderHistory();
    updateStats();
  }
);


window.addEventListener(
  "resize",
  resizeCanvas
);


/* =========================
   START
========================= */

balance =
  Number(
    $("balance").value
  ) || 1000;


peakBalance =
  balance;


setupPairs();

renderHistory();

resizeCanvas();

calculateRisk();
