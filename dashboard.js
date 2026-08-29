```javascript
const canvas = document.getElementById("chart");
const ctx = canvas ? canvas.getContext("2d") : null;

const $ = id => document.getElementById(id);

const pairs = {
  Forex: ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY"],
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
   SAFE ELEMENT HELPER
========================= */

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = $(id);
  if (el) el.value = value;
}


/* =========================
   LOAD XAUUSD CSV
========================= */

async function generateCandles() {

  const pair = $("pair") ? $("pair").value : "XAU/USD";

  if (pair !== "XAU/USD") {
    setText(
      "chartInfo",
      "Currently available: XAU/USD 5m historical data"
    );

    candles = [];
    candleIndex = 0;
    drawChart();
    return;
  }

  setText(
    "chartInfo",
    "Loading XAU/USD historical data..."
  );

  try {

    const response =
      await fetch("data/XAUUSD_5m.csv");

    if (!response.ok) {
      throw new Error(
        "XAUUSD_5m.csv not found"
      );
    }

    const text =
      await response.text();

    candles =
      parseCSV(text);

    if (!candles.length) {
      throw new Error(
        "No valid candles found"
      );
    }

    candleIndex =
      Math.min(
        50,
        candles.length - 1
      );

    openTrade = null;
    pendingOrder = null;

    setText(
      "chartInfo",
      `5m • ${candles.length} real historical XAU/USD candles`
    );

    render();

  } catch (error) {

    console.error(error);

    candles = [];
    candleIndex = 0;

    setText(
      "chartInfo",
      "XAU/USD CSV could not be loaded"
    );

    alert(
      "XAU/USD data load nahi hui. Check karo ke file data/XAUUSD_5m.csv ke andar hai."
    );

    drawChart();
  }
}


/* =========================
   CSV PARSER
========================= */

function parseCSV(text) {

  const lines =
    text
      .trim()
      .split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const header =
    lines[0]
      .split(",")
      .map(x =>
        x.trim()
         .toLowerCase()
         .replace(/["']/g, "")
      );

  const findColumn = names => {

    for (const name of names) {

      const index =
        header.indexOf(name);

      if (index >= 0) {
        return index;
      }
    }

    return -1;
  };


  const timeIndex =
    findColumn([
      "timestamp",
      "datetime",
      "date",
      "time",
      "open_time",
      "opentime"
    ]);

  const openIndex =
    findColumn(["open"]);

  const highIndex =
    findColumn(["high"]);

  const lowIndex =
    findColumn(["low"]);

  const closeIndex =
    findColumn(["close"]);

  const volumeIndex =
    findColumn([
      "volume",
      "vol"
    ]);


  if (
    openIndex < 0 ||
    highIndex < 0 ||
    lowIndex < 0 ||
    closeIndex < 0
  ) {

    throw new Error(
      "OHLC columns missing"
    );
  }


  const result = [];


  for (
    let i = 1;
    i < lines.length;
    i++
  ) {

    if (!lines[i].trim()) {
      continue;
    }


    const row =
      lines[i]
        .split(",")
        .map(x =>
          x.trim()
           .replace(/^["']|["']$/g, "")
        );


    const open =
      Number(row[openIndex]);

    const high =
      Number(row[highIndex]);

    const low =
      Number(row[lowIndex]);

    const close =
      Number(row[closeIndex]);


    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }


    result.push({

      time:
        timeIndex >= 0
          ? row[timeIndex]
          : "",

      open,
      high,
      low,
      close,

      volume:
        volumeIndex >= 0
          ? Number(row[volumeIndex]) || 0
          : 0
    });
  }


  return result;
}


/* =========================
   PRICE FORMAT
========================= */

function formatPrice(value) {

  if (!Number.isFinite(value)) {
    return "-";
  }

  if (value < 10) {
    return value.toFixed(5);
  }

  return value.toFixed(2);
}


/* =========================
   RISK CALCULATION
========================= */

function calculateRisk() {

  const accountBalance =
    Number(
      $("balance")?.value
    ) || 0;

  const riskPercent =
    Number(
      $("risk")?.value
    ) || 0;

  const entry =
    Number(
      $("entry")?.value
    );

  const sl =
    Number(
      $("sl")?.value
    );

  const tp =
    Number(
      $("tp")?.value
    );


  const riskAmount =
    accountBalance *
    riskPercent /
    100;


  setValue(
    "riskAmount",
    "$" + riskAmount.toFixed(2)
  );

  setText(
    "statRisk",
    "$" + riskAmount.toFixed(2)
  );


  if (
    !entry ||
    !sl ||
    !tp
  ) {

    setValue(
      "slDistance",
      "-"
    );

    setValue(
      "tpDistance",
      "-"
    );

    setValue(
      "rr",
      "-"
    );

    setValue(
      "size",
      "-"
    );

    setValue(
      "potentialLoss",
      "-"
    );

    setValue(
      "potentialProfit",
      "-"
    );

    setText(
      "riskStatus",
      "Set Entry, SL & TP"
    );

    return;
  }


  const slDistance =
    Math.abs(
      entry - sl
    );

  const tpDistance =
    Math.abs(
      tp - entry
    );


  setValue(
    "slDistance",
    formatPrice(slDistance)
  );

  setValue(
    "tpDistance",
    formatPrice(tpDistance)
  );


  if (slDistance <= 0) {

    setValue(
      "rr",
      "-"
    );

    setValue(
      "size",
      "-"
    );

    return;
  }


  const rr =
    tpDistance /
    slDistance;


  setValue(
    "rr",
    "1:" + rr.toFixed(2)
  );


  /*
    XAU/USD demo position sizing.

    This is a simplified backtesting
    position-size calculation.
  */

  let positionSize =
    riskAmount /
    slDistance;


  positionSize =
    Math.max(
      0,
      positionSize
    );


  setValue(
    "size",
    positionSize.toFixed(4)
  );


  setValue(
    "potentialLoss",
    "-$" +
    riskAmount.toFixed(2)
  );


  setValue(
    "potentialProfit",
    "$" +
    (
      riskAmount * rr
    ).toFixed(2)
  );


  setText(
    "riskStatus",
    "Risk calculated"
  );
}


/* =========================
   CANVAS RESIZE
========================= */

function resizeCanvas() {

  if (!canvas || !ctx) {
    return;
  }


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
   DRAW CHART
========================= */

function drawChart() {

  if (!canvas || !ctx) {
    return;
  }


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


  if (!candles.length) {

    ctx.fillStyle =
      "#68758a";

    ctx.font =
      "14px Arial";

    ctx.fillText(
      "Loading XAU/USD historical data...",
      25,
      40
    );

    return;
  }


  const visible =
    candles.slice(
      Math.max(
        0,
        candleIndex - 70
      ),
      candleIndex + 1
    );


  if (!visible.length) {
    return;
  }


  let min =
    Math.min(
      ...visible.map(
        candle => candle.low
      )
    );

  let max =
    Math.max(
      ...visible.map(
        candle => candle.high
      )
    );


  const padding =
    (max - min) * 0.12 || 1;


  min -= padding;
  max += padding;


  function priceToY(value) {

    return height -
      (
        (value - min) /
        (max - min)
      ) *
      height;
  }


  /* GRID */

  ctx.strokeStyle =
    "#17202d";

  ctx.lineWidth = 1;


  for (
    let i = 0;
    i <= 5;
    i++
  ) {

    const y =
      i * height / 5;


    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      width,
      y
    );

    ctx.stroke();


    const value =
      max -
      (
        (max - min) *
        i / 5
      );


    ctx.fillStyle =
      "#68758a";

    ctx.font =
      "11px Arial";


    ctx.fillText(
      formatPrice(value),
      width - 70,
      Math.max(12, y - 5)
    );
  }


  const step =
    width /
    visible.length;


  const candleWidth =
    Math.max(
      3,
      step * 0.58
    );


  visible.forEach(
    (candle, i) => {

      const x =
        i * step +
        step / 2;


      const yOpen =
        priceToY(
          candle.open
        );

      const yClose =
        priceToY(
          candle.close
        );

      const yHigh =
        priceToY(
          candle.high
        );

      const yLow =
        priceToY(
          candle.low
        );


      const bullish =
        candle.close >=
        candle.open;


      const color =
        bullish
          ? "#42d3a5"
          : "#ff6579";


      ctx.strokeStyle =
        color;

      ctx.fillStyle =
        color;


      /* WICK */

      ctx.beginPath();

      ctx.moveTo(
        x,
        yHigh
      );

      ctx.lineTo(
        x,
        yLow
      );

      ctx.stroke();


      /* BODY */

      ctx.fillRect(

        x -
        candleWidth / 2,

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

    }
  );


  /* TRADE LEVELS */

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


    ctx.strokeStyle =
      color;

    ctx.setLineDash([
      6,
      4
    ]);


    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      width,
      y
    );

    ctx.stroke();


    ctx.setLineDash([]);


    ctx.fillStyle =
      color;

    ctx.font =
      "11px Arial";


    ctx.fillText(
      `${label} ${formatPrice(value)}`,
      8,
      Math.max(
        12,
        y - 5
      )
    );
  }
}


/* =========================
   NEXT CANDLE
========================= */

function nextCandle() {

  if (!candles.length) {
    return;
  }


  if (
    candleIndex >=
    candles.length - 1
  ) {

    stopPlay();

    return;
  }


  candleIndex++;


  checkPendingOrder();
  checkOpenTrade();


  render();
}


/* =========================
   PREVIOUS CANDLE
========================= */

function previousCandle() {

  if (
    candleIndex <= 0
  ) {
    return;
  }


  candleIndex--;

  render();
}


/* =========================
   PLACE ORDER
========================= */

function placeOrder(side) {

  if (!candles.length) {

    alert(
      "Pehle XAU/USD historical data load hone do."
    );

    return;
  }


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
    $("orderType")?.value ||
    "MARKET";


  let entry;


  if (
    orderType === "MARKET"
  ) {

    entry =
      current;

    setValue(
      "entry",
      formatPrice(entry)
    );

  } else {

    entry =
      Number(
        $("entry")?.value
      );


    if (!entry) {

      alert(
        "Enter the Limit price."
      );

      return;
    }
  }


  const sl =
    Number(
      $("sl")?.value
    );

  const tp =
    Number(
      $("tp")?.value
    );


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
    Number(
      $("size")?.value
    );


  if (
    !size ||
    size <= 0
  ) {

    alert(
      "Invalid position size."
    );

    return;
  }


  const trade = {

    type:
      orderType,

    side,

    entry,

    sl,

    tp,

    size
  };


  if (
    orderType === "MARKET"
  ) {

    openTrade =
      trade;

  } else {

    pendingOrder =
      trade;
  }


  calculateRisk();
  updateStats();
  drawChart();
}


/* =========================
   LIMIT ORDER
========================= */

function checkPendingOrder() {

  if (!pendingOrder) {
    return;
  }


  const candle =
    candles[candleIndex];


  let triggered =
    false;


  if (
    pendingOrder.side ===
    "BUY"
  ) {

    if (
      candle.low <=
      pendingOrder.entry
    ) {

      triggered =
        true;
    }

  } else {

    if (
      candle.high >=
      pendingOrder.entry
    ) {

      triggered =
        true;
    }
  }


  if (triggered) {

    openTrade =
      pendingOrder;

    pendingOrder =
      null;
  }
}


/* =========================
   CHECK SL / TP
========================= */

function checkOpenTrade() {

  if (!openTrade) {
    return;
  }


  const candle =
    candles[candleIndex];


  let exit =
    null;

  let reason =
    "";


  if (
    openTrade.side ===
    "BUY"
  ) {

    if (
      candle.low <=
      openTrade.sl
    ) {

      exit =
        openTrade.sl;

      reason =
        "SL";

    } else if (
      candle.high >=
      openTrade.tp
    ) {

      exit =
        openTrade.tp;

      reason =
        "TP";
    }

  } else {

    if (
      candle.high >=
      openTrade.sl
    ) {

      exit =
        openTrade.sl;

      reason =
        "SL";

    } else if (
      candle.low <=
      openTrade.tp
    ) {

      exit =
        openTrade.tp;

      reason =
        "TP";
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

  if (!openTrade) {
    return;
  }


  const points =
    openTrade.side ===
    "BUY"

      ? exit -
        openTrade.entry

      : openTrade.entry -
        exit;


  /*
    XAU/USD simplified P/L.

    Position size is based on
    the risk calculation above.
  */

  const pl =
    points *
    openTrade.size;


  balance +=
    pl;


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


  openTrade =
    null;


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

  if (!candles.length) {

    drawChart();

    return;
  }


  candleIndex =
    Math.max(
      0,
      Math.min(
        candleIndex,
        candles.length - 1
      )
    );


  const current =
    candles[candleIndex].close;


  setText(
    "price",
    formatPrice(current)
  );


  setText(
    "chartPair",
    $("pair")?.value ||
    "XAU/USD"
  );


  setText(
    "chartInfo",
    `5m • Candle ${candleIndex + 1}/${candles.length} • Historical XAU/USD`
  );


  if (
    $("orderType")?.value ===
    "MARKET" &&
    !openTrade &&
    !pendingOrder
  ) {

    setValue(
      "entry",
      formatPrice(current)
    );
  }


  calculateRisk();
  drawChart();
  updateStats();
}


/* =========================
   TRADE HISTORY
========================= */

function renderHistory() {

  const tbody =
    $("history");


  if (!tbody) {
    return;
  }


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
    trades
      .map(
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
      )
      .join("");
}


/* =========================
   STATS
========================= */

function updateStats() {

  setText(
    "statBalance",
    "$" +
    balance.toFixed(2)
  );


  const starting =
    Number(
      $("balance")?.value
    ) || 1000;


  const net =
    balance -
    starting;


  setText(
    "statPL",
    `${net >= 0 ? "+" : ""}$${net.toFixed(2)}`
  );


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


  setText(
    "statWin",
    winRate.toFixed(0) +
    "%"
  );


  const drawdown =
    peakBalance > 0
      ? (
          (peakBalance -
          balance) /
          peakBalance
        ) * 100
      : 0;


  setText(
    "statDD",
    drawdown.toFixed(2) +
    "%"
  );


  setText(
    "statOpen",
    openTrade
      ? `${openTrade.side} @ ${formatPrice(openTrade.entry)}`
      : "None"
  );


  setText(
    "statPending",
    pendingOrder
      ? `${pendingOrder.side} LIMIT @ ${formatPrice(pendingOrder.entry)}`
      : "None"
  );
}


/* =========================
   PAIRS
========================= */

function setupPairs() {

  const market =
    $("market")?.value ||
    "Forex";


  const pairSelect =
    $("pair");


  if (!pairSelect) {
    return;
  }


  pairSelect.innerHTML =
    pairs[market]
      .map(
        pair =>
          `<option>${pair}</option>`
      )
      .join("");


  /*
    XAU/USD ko default rakho
    jab Forex market selected ho.
  */

  if (
    market === "Forex"
  ) {

    pairSelect.value =
      "XAU/USD";
  }


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

  const element =
    $(id);


  if (!element) {
    return;
  }


  element.addEventListener(
    "input",
    () => {

      calculateRisk();
      updateStats();
      drawChart();

    }
  );
});


/* =========================
   MARKET CHANGE
========================= */

$("market")?.addEventListener(
  "change",
  setupPairs
);


/* =========================
   PAIR CHANGE
========================= */

$("pair")?.addEventListener(
  "change",
  generateCandles
);


/* =========================
   TIMEFRAME
========================= */

$("timeframe")?.addEventListener(
  "change",
  () => {

    const timeframe =
      $("timeframe").value;


    if (
      $("pair").value ===
      "XAU/USD" &&
      timeframe === "5m"
    ) {

      generateCandles();

    } else {

      setText(
        "chartInfo",
        "Available historical file: XAU/USD 5m"
      );
    }
  }
);


/* =========================
   NEXT / PREVIOUS
========================= */

$("next")?.addEventListener(
  "click",
  nextCandle
);


$("prev")?.addEventListener(
  "click",
  previousCandle
);


/* =========================
   BUY / SELL
========================= */

$("buy")?.addEventListener(
  "click",
  () =>
    placeOrder("BUY")
);


$("sell")?.addEventListener(
  "click",
  () =>
    placeOrder("SELL")
);


/* =========================
   ORDER TYPE
========================= */

$("orderType")?.addEventListener(
  "change",
  () => {

    if (!candles.length) {
      return;
    }


    const current =
      candles[candleIndex].close;


    if (
      $("orderType").value ===
      "MARKET"
    ) {

      setValue(
        "entry",
        formatPrice(current)
      );

      setText(
        "riskStatus",
        "Market price selected"
      );

    } else {

      setText(
        "riskStatus",
        "Enter your Limit price"
      );
    }


    calculateRisk();
    drawChart();
  }
);


/* =========================
   PLAY
========================= */

$("play")?.addEventListener(
  "click",
  () => {

    if (timer) {

      stopPlay();

      return;
    }


    if (!candles.length) {

      alert(
        "Pehle XAU/USD data load hone do."
      );

      return;
    }


    const speed =
      Number(
        $("speed")?.value
      ) || 700;


    timer =
      setInterval(
        nextCandle,
        speed
      );


    setText(
      "play",
      "⏸ Pause"
    );
  }
);


/* =========================
   SPEED
========================= */

$("speed")?.addEventListener(
  "input",
  () => {

    if (!timer) {
      return;
    }


    clearInterval(
      timer
    );


    const speed =
      Number(
        $("speed").value
      ) || 700;


    timer =
      setInterval(
        nextCandle,
        speed
      );
  }
);


/* =========================
   STOP PLAY
========================= */

function stopPlay() {

  if (timer) {

    clearInterval(
      timer
    );

    timer =
      null;
  }


  setText(
    "play",
    "▶ Play"
  );
}


/* =========================
   RESET
========================= */

$("reset")?.addEventListener(
  "click",
  async () => {

    stopPlay();


    balance =
      Number(
        $("balance")?.value
      ) || 1000;


    peakBalance =
      balance;


    trades = [];

    openTrade = null;
    pendingOrder = null;


    renderHistory();
    updateStats();


    await generateCandles();
  }
);


/* =========================
   CLEAR HISTORY
========================= */

$("clear")?.addEventListener(
  "click",
  () => {

    trades = [];


    balance =
      Number(
        $("balance")?.value
      ) || 1000;


    peakBalance =
      balance;


    renderHistory();
    updateStats();
  }
);


/* =========================
   EXPORT
========================= */

$("export")?.addEventListener(
  "click",
  () => {

    if (!trades.length) {

      alert(
        "Export karne ke liye closed trades chahiye."
      );

      return;
    }


    let csv =
      "Type,Side,Entry,Exit,P/L,Reason\n";


    trades.forEach(
      trade => {

        csv +=
          `${trade.type},${trade.side},${trade.entry},${trade.exit},${trade.pl},${trade.reason}\n`;
      }
    );


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const a =
      document.createElement(
        "a"
      );


    a.href =
      url;

    a.download =
      "backtest-results.csv";


    document.body.appendChild(
      a
    );

    a.click();

    a.remove();


    URL.revokeObjectURL(
      url
    );
  }
);


/* =========================
   RESIZE
========================= */

window.addEventListener(
  "resize",
  resizeCanvas
);


/* =========================
   START
========================= */

balance =
  Number(
    $("balance")?.value
  ) || 1000;


peakBalance =
  balance;


renderHistory();
updateStats();
resizeCanvas();

setupPairs();
```
