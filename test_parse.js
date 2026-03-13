const https = require('https');
https.get('https://llm-stats.com/benchmarks/browsecomp', (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    const chunks = [...html.matchAll(/self\.__next_f\.push\(\[\d+,"([\s\S]*?)"\]\)/g)];
    console.log('Next_f pushes:', chunks.length);
    
    // Also try checking string indexOf "0.859" (Gemini 3.1 Pro's score)
    const idx = html.indexOf("0.859");
    if (idx > -1) {
        console.log(html.substring(idx - 100, idx + 100));
    }
  });
});
