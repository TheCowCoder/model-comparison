import https from 'https';

https.get('https://llm-stats.com/benchmarks/browsecomp', (res) => {
  let html = '';
  res.on('data', c => { html += c });
  res.on('end', () => {
     const chunks = [...html.matchAll(/self\.__next_f\.push\(\[\d+,"([\s\S]*?)"\]\)/g)];
     const payload = chunks.map(c => {
        try { return JSON.parse(`"${c[1].replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`); }
        catch (e) { return "" }
     }).join('');
     const idx = payload.indexOf("0.859");
     if (idx > -1) {
         console.log('Found 0.859 inside Next payload. Context:');
         console.log(payload.substring(idx - 100, idx + 100));
     } else {
         console.log('Not in Next Payload either');
     }
  });
});
