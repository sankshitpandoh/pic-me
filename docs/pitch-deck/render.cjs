const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto("file://" + __dirname + "/deck.html", { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  await p.pdf({ path: process.argv[2], width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
