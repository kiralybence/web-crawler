const htmlparser2 = require('htmlparser2');

if (!process.argv[2]) {
    throw 'Target URL is not specified';
}

async function getUrls(targetUrl) {
    let resp;

    try {
        resp = await fetch(targetUrl);
    } catch (err) {
        return [];
    }

    if (!resp.ok) {
        return [];
    }

    let urls = new Set();

    const parser = new htmlparser2.Parser({
        onattribute(name, value) {
            if (name === 'href' || name === 'src') {
                urls.add(value);
            }
        },
    });

    parser.write(await resp.text());
    parser.end();

    // format
    urls = Array.from(urls).map(url => new URL(url, process.argv[2]).href);

    return urls;
}

async function crawl(targetUrl) {
    console.log(targetUrl);

    // Mark current URL as crawled
    crawled.add(targetUrl);

    // Get new URLs to crawl
    (await getUrls(targetUrl))
        .filter(url => {
            const isAlreadyCrawled = crawled.has(url);
            const isSameDomain = new URL(url).hostname === new URL(process.argv[2]).hostname;

            return !isAlreadyCrawled && isSameDomain;
        })
        .forEach(crawl);
}

let crawled = new Set();

crawl(new URL(process.argv[2]).href)