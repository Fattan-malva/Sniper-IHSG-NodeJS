const readline = require("readline");
const colors = require("colors");

// Tambahkan theme sebelum penggunaan warna!
colors.setTheme({
  main: "green",
  accent: "brightGreen",
  warn: "yellow",
  danger: "red",
  info: "cyan",
  faded: "grey",
  highlight: ["black", "bgGreen"],
  tableHead: ["green", "bold"],
  tableCell: "brightGreen",
});

function showMenu() {
  console.log(
    `
========================================
     IDX SCALPING SNIPER MENU UTAMA
========================================
1. Screening Saham Momentum Scalping
2. Analisa Saham Tertentu
0. Keluar
`.info
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Pilih menu (1/2/0): ", (answer) => {
    rl.close();
    if (answer === "1") {
      const runScreeningOnce = require("./Screnning");
      runScreeningOnce(showMenu); // selesai screening -> balik ke menu
    } else if (answer === "2") {
      const runAnalisaSaham = require("./AnalisaSaham");
      runAnalisaSaham(showMenu); // selesai analisa -> balik ke menu
    } else {
      console.log("Keluar...".faded);
      process.exit(0);
    }
  });
}

showMenu();
