const axios = require("axios");
const colors = require("colors");

colors.setTheme({
  main: "green",
  accent: "brightGreen",
  warn: "yellow",
  danger: "red",
  info: "cyan",
  faded: "grey",
  purple: "magenta",
});

function formatCurrency(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function showAnalysis(data) {
  console.log(`\nAnalisa Saham: ${data.symbol.accent} - ${data.name.main}`);
  console.log(`Harga        : ${formatCurrency(data.price).main}`);
  console.log(
    `Perubahan    : ${data.change > 0 ? "+" : ""}${data.change} (${data.changePercent.toFixed(2)}%)`
  );
  console.log(`Volume       : ${data.volume.toLocaleString("id-ID").accent}`);
  console.log(`Market Cap   : ${formatCurrency(data.marketCap).faded}`);
  console.log(
    `High/Low     : ${formatCurrency(data.dayHigh)} / ${formatCurrency(data.dayLow)}`
  );

  if (data.fullData) {
    console.log(`MA50         : ${formatCurrency(data.fullData.fiftyDayAverage || 0)}`);
    console.log(`MA200        : ${formatCurrency(data.fullData.twoHundredDayAverage || 0)}`);
    console.log(`PER          : ${(data.fullData.trailingPE || "-").toString().accent}`);
    console.log(`PBV          : ${(data.fullData.priceToBook || "-").toString().accent}`);
    console.log(`Div Yield    : ${(data.fullData.dividendYield || "-").toString().accent}%`);
    console.log(`EPS          : ${(data.fullData.epsTrailingTwelveMonths || "-").toString().accent}`);
    console.log(`Analyst Rate : ${(data.fullData.averageAnalystRating || "-").toString().info}`);
  }

  // ===== Tambahan Entry Position, TP, SL =====
  const entry = data.price;
  const tp1 = entry * 1.05; // +5%
  const tp2 = entry * 1.1; // +10%
  const sl = entry * 0.97; // -3%

  console.log("\nStrategi Trading:".warn);
  console.log(`Entry Posisi : ${formatCurrency(entry).purple}`);
  console.log(`Take Profit  : ${formatCurrency(tp1)} (TP1), ${formatCurrency(tp2)} (TP2)`);
  console.log(`Stop Loss    : ${formatCurrency(sl).danger}`);
  console.log(`Risk/Reward  : ${((tp1 - entry) / (entry - sl)).toFixed(2)}`.info);

  console.log(`\nLast Update  : ${new Date(data.lastUpdated).toLocaleString("id-ID").faded}`);
}

function runAnalisaSaham(callback, rl) {
  rl.question("Masukkan Kode/Nama Saham (Contoh: BBCA): ".accent, async (query) => {
    try {
      const res = await axios.get(`http://localhost:3000/api/stocks/${query}`);
      if (res.data && res.data.data) {
        showAnalysis(res.data.data);
      } else {
        console.log("Data tidak ditemukan.".danger);
      }
    } catch (err) {
      console.log("Gagal mengambil data:".danger, err.message);
    }
    if (typeof callback === "function") callback();
  });
}

module.exports = runAnalisaSaham;
