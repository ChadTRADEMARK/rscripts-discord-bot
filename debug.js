const puppeteer = require('puppeteer');

async function debug() {
    const browser = await puppeteer.launch({
        headless: false, // Set to false so you can visually watch it click and open!
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://rscripts.net/script/vrhands-for-pc-mobile-coming-soon-MCpL', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    // Click Changes button
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(el => el.innerText && el.innerText.trim().toLowerCase().includes('changes'));
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // Print all text inside potential dropdown/modal containers
    const texts = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('div, span, p, ul, li'));
        return els
            .map(e => e.innerText ? e.innerText.trim() : '')
            .filter(t => t.includes('2026') || t.toLowerCase().includes('test') || t.toLowerCase().includes('script'));
    });

    console.log('--- FOUND MATCHING TEXT ---');
    console.log(texts.slice(0, 10)); // Print top 10 matches
    console.log('---------------------------');

    await browser.close();
}
debug();
