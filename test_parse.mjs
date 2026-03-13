import https from 'https';

https.get('https://llm-stats.com/benchmarks/browsecomp', (res) => {
  let html = '';
  res.on('data', c => { html += c });
  res.on('end', () => {
    const idx = html.indexOf("0.859");
    if (idx > -1) {
        console.log(html.substring(idx - 100, idx + 100));
    } else {
        console.log("Not found natively. Next flight push count:");
        const chunks = [...html.matchAll(/self\.__next_f\.push\(\[\d+,"([\s\S]*?)"\]\)/g)];
        console.log(chunks.length);
    }
  });
});
