const htmlparser2 = require('htmlparser2');

if (!process.argv[2]) {
    throw 'Target URL is not specified';
}

const debug = process.argv.includes('--debug');

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

    let body = await resp.text();

    let urls = [];

    const parser = new htmlparser2.Parser({
        // XML hack, because htmlparser2 doesn't offer a simple way to fetch the value of a tag
        onopentag(name) {
            if (name === "loc") {
                this.insideLoc = true;
            }
        },
        ontext(text) {
            if (this.insideLoc) {
                urls.push(text);
            }
        },
        onclosetag(tagname) {
            if (tagname === "loc") {
                this.insideLoc = false;
            }
        },

        onattribute(name, value) {
            if (name === 'href' || name === 'src') {
                urls.push(value);
            }
        },
    });

    parser.write(body);
    parser.end();

    // unique
    urls = [...new Set(urls)];

    // format
    urls = urls.map(formatUrl);

    return urls;
}

async function crawl(targetUrl) {
    if (debug) {
        console.log('Crawling: ' + targetUrl);
    }

    // Mark current URL as crawled
    crawled.push(targetUrl);

    // Get new URLs to crawl
    let newUrls = (await getUrls(targetUrl)).filter(shouldQueue);

    // Add newly found URLs to queue
    queue = queue.concat(newUrls);

    if (!debug) {
        // TODO: fix
        newUrls.forEach(console.log);
    }
}

// relative to absolute, lowercase, remove hash etc.
function formatUrl(url) {
    url = new URL(url, process.argv[2]);
    url.hash = '';

    return url.href;
}

function shouldQueue(url) {
    const isAlreadyCrawled = crawled.includes(url);
    const isAlreadyQueued = queue.includes(url);
    const isSameDomain = new URL(url).hostname === new URL(process.argv[2]).hostname;

    return !isAlreadyCrawled && !isAlreadyQueued && isSameDomain;
}

let crawled = [];
let queue = [
    formatUrl(process.argv[2]), // first URL to crawl
    formatUrl(new URL(process.argv[2]).origin + '/sitemap.xml'), // we also want to crawl the sitemap
];
let count = 0;

setInterval(async () => {
    // if queue is empty
    if (!queue.length) return;

    let url = queue.shift();

    if (debug) {
        console.log(`\n${++count} (${queue.length} others remaining)`);
    }

    crawl(url);
}, 50);

// TODO: instead of using setinterval, make it recursive
// TODO: use Set() instead of array, to avoid duplicates