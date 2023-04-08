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

    return urls;
}

async function crawl(targetUrl) {
    console.log(targetUrl);

    // Mark current URL as crawled
    crawled.add(targetUrl);

    // Get new URLs to crawl
    (await getUrls(targetUrl)).forEach(url => {
        // some formatting
        url = new URL(url, process.argv[2]).href;

        // already crawled
        if (crawled.has(url)) {
            return;
        }

        // isn't from the same domain
        if (new URL(url).hostname !== new URL(process.argv[2]).hostname) {
            return;
        }

        crawl(url);
    });
}

let crawled = new Set();

crawl(new URL(process.argv[2]).href);