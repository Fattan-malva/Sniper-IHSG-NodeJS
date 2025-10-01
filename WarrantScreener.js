const axios = require('axios');
const colors = require('colors');
const Table = require('cli-table3');
const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const parse = require('csv-parse/sync');

yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

// Hacker theme: hijau, hitam, kuning untuk warning
colors.setTheme({
    main: 'green',
    accent: 'brightGreen',
    warn: 'yellow',
    danger: 'red',
    info: 'cyan',
    faded: 'grey',
    highlight: ['black', 'bgGreen'],
    tableHead: ['green', 'bold'],
    tableCell: 'brightGreen'
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearConsole() {
    process.stdout.write('\x1B[2J\x1B[0f');
}

function formatCurrency(num) {
    if (num === 'N/A' || num === undefined) return 'N/A'.faded;
    return 'Rp' + num.toLocaleString('id-ID');
}

// Fungsi untuk mengambil semua kode saham dari file lokal
function getAllIDXStockCodes() {
    try {
        const csvText = fs.readFileSync('./stockcode.csv', 'utf8');
        const records = parse.parse(csvText, { columns: true, skip_empty_lines: true });
        return records.map(rec => rec.Code?.trim()).filter(Boolean);
    } catch (error) {
        console.log('Error membaca file stockcode.csv'.danger);
        return [];
    }
}

// Fungsi untuk generate simbol warran
function getWarrantSymbols() {
    const stockCodes = getAllIDXStockCodes();
    return stockCodes.map(code => `${code}-W.JK`);
}

async function getWarrantData() {
    const warrantSymbols = getWarrantSymbols();
    console.log(`📡 Mengambil data ${warrantSymbols.length} warran...`.info);
    
    const results = [];
    const progressBar = new (require('cli-progress').SingleBar)({
        format: 'Progress |' + colors.cyan('{bar}') + '| {percentage}% | {value}/{total} warran',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    progressBar.start(warrantSymbols.length, 0);

    for (const symbol of warrantSymbols) {
        try {
            const stock = await yahooFinance.quote(symbol, { validateResult: false });
            
            if (stock?.symbol && stock.regularMarketPrice !== undefined && stock.regularMarketPrice > 0 && (stock.regularMarketVolume || 0) > 0) {
                results.push(stock);
            }
        } catch (error) {
            // Skip tanpa log error
        }
        progressBar.increment();
        await sleep(50);
    }

    progressBar.stop();
    return results;
}

async function getParentStockData(symbol) {
    try {
        const parentSymbol = symbol.replace('-W.JK', '.JK');
        const stock = await yahooFinance.quote(parentSymbol, { validateResult: false });
        
        return {
            symbol: stock.symbol,
            price: stock.regularMarketPrice || 0
        };
    } catch (error) {
        return null;
    }
}

async function screenWarrants(warrants) {
    const screenedWarrants = [];
    const progressBar = new (require('cli-progress').SingleBar)({
        format: 'Analisis |' + colors.green('{bar}') + '| {percentage}% | {value}/{total} warran',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    progressBar.start(warrants.length, 0);

    for (const warrant of warrants) {
        const parentData = await getParentStockData(warrant.symbol);
        if (!parentData) {
            progressBar.increment();
            continue;
        }

        let exercisePrice = 'N/A';

        try {
            const fullData = await yahooFinance.quoteSummary(
                warrant.symbol,
                { modules: ['summaryDetail', 'defaultKeyStatistics', 'price'], validateResult: false }
            );

            // Cari exercise price dari berbagai sumber
            const exerciseData = fullData.defaultKeyStatistics?.strikePrice ||
                fullData.summaryDetail?.strikePrice ||
                fullData.price?.strikePrice;
            
            if (exerciseData) {
                exercisePrice = typeof exerciseData === 'object' ? exerciseData.raw : exerciseData;
            }
        } catch (e) {
            // Skip semua error tanpa logging
        }

        screenedWarrants.push({
            symbol: warrant.symbol,
            price: warrant.regularMarketPrice || 0,
            exercisePrice: exercisePrice,
            parentPrice: parentData.price
        });

        progressBar.increment();
        await sleep(100);
    }

    progressBar.stop();
    return screenedWarrants;
}

function displayWarrantTable(warrants, title = 'DAFTAR WARRAN YANG AKTIF') {
    if (warrants.length === 0) {
        console.log('❌ Tidak ditemukan warran yang memenuhi kriteria saat ini.'.warn);
        return;
    }

    const table = new Table({
        head: [
            'Symbol', 'Harga Warran', 'Exercise Price', 'Harga Induk'
        ].map(h => h.tableHead),
        style: { head: [], border: ['green'] },
        colAligns: ['left', 'right', 'right', 'right'],
        colWidths: [15, 15, 15, 15]
    });

    // Sort by symbol for consistent display
    warrants.sort((a, b) => a.symbol.localeCompare(b.symbol));

    warrants.forEach((warrant) => {
        table.push([
            warrant.symbol.accent,
            formatCurrency(warrant.price).main,
            warrant.exercisePrice !== 'N/A' ? formatCurrency(warrant.exercisePrice).accent : 'N/A'.faded,
            formatCurrency(warrant.parentPrice).info
        ]);
    });

    console.log('\n' + '═'.repeat(60).main);
    console.log(` ${title.main} `.highlight);
    console.log('═'.repeat(60).main);
    console.log(table.toString());
    console.log(`📊 Total: ${warrants.length} warran aktif ditemukan`.info);
}

async function runWarrantScreening() {
    clearConsole();
    console.log(`

░██╗░░░░░░░██╗░█████╗░██████╗░██████╗░░█████╗░███╗░░██╗  ░██████╗░█████╗░██████╗░███████╗███████╗███╗░░██╗███████╗██████╗░
░██║░░██╗░░██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗░██║  ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝████╗░██║██╔════╝██╔══██╗
░╚██╗████╗██╔╝███████║██████╔╝██████╔╝███████║██╔██╗██║  ╚█████╗░██║░░╚═╝██████╔╝█████╗░░█████╗░░██╔██╗██║█████╗░░██████╔╝
░░████╔═████║░██╔══██║██╔══██╗██╔══██╗██╔══██║██║╚████║  ░╚═══██╗██║░░██╗██╔══██╗██╔══╝░░██╔══╝░░██║╚████║██╔══╝░░██╔══██╗
░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░░██║██║░░██║██║░╚███║  ██████╔╝╚█████╔╝██║░░██║███████╗███████╗██║░╚███║███████╗██║░░██║
░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝  ╚═════╝░░╚════╝░╚═╝░░╚═╝╚══════╝╚══════╝╚═╝░░╚══╝╚══════╝╚═╝░░╚═╝
                              IDX WARRAN SCREENER • by Fattan Malva • v1.0 • Clean Mode
`);

    console.log(`⏰ ${new Date().toLocaleString('id-ID')}\n`.faded);

    try {
        const warrants = await getWarrantData();
        
        if (warrants.length === 0) {
            console.log('❌ Tidak ada data warran yang ditemukan'.danger);
            return;
        }

        console.log(`✅ Ditemukan ${warrants.length} warran aktif`.main);
        console.log('🔍 Menganalisis data warran...'.info);

        const screenedWarrants = await screenWarrants(warrants);
        displayWarrantTable(screenedWarrants);

        console.log('\n' + '⚠️  PERINGATAN RISIKO:'.warn.bold);
        console.log('• Trading warran berisiko tinggi dan kompleks'.warn);
        console.log('• Harga bisa turun drastis mendekati expiry date'.warn);
        console.log('• Analisis ini bukan jaminan profit, lakukan riset mandiri'.warn);
        console.log('• Data mungkin tidak lengkap karena keterbatasan API'.warn);

        console.log('\n' + '🎯 Tips:'.info.bold);
        console.log('• Perhatikan exercise price dan harga saham induk'.info);
        console.log('• Bandingkan harga warran dengan harga saham induk'.info);
        console.log('• Volume trading yang tinggi menandakan likuiditas baik'.info);

    } catch (error) {
        console.log('❌ Error dalam screening warran'.danger);
    }
}

// Suppress semua Yahoo Finance validation errors
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args[0];
    if (typeof message === 'string' && (
        message.includes('validation.md') || 
        message.includes('Expected union value') ||
        message.includes('YahooNumber') ||
        message.includes('schema validation') ||
        message.includes('yahoo-finance2')
    )) {
        return;
    }
    originalConsoleError.apply(console, args);
};

// Run once and exit
runWarrantScreening().then(() => {
    console.log('\n' + '✨ Screening selesai. Semoga profit! 🚀'.main.bold);
    process.exit(0);
}).catch(error => {
    console.log('\n❌ Program dihentikan karena error'.danger);
    process.exit(1);
});