const axios = require('axios')
const { JSDOM } = require('jsdom')

async function crawlUrl(targetUrl) {
    if (targetUrl.endsWith('/')) {
        targetUrl = targetUrl.slice(0, -1)
    }

    const resp = await axios.get(targetUrl)
    const dom = new JSDOM(resp.data)
    let anchors = dom.window.document.querySelectorAll('a')
    let urls = Array.from(anchors)
        .map(a => a.getAttribute('href'))
        .map(url => {
            // convert relative URLs to absolute
            return String(url).startsWith('/') && !String(url).startsWith('//')
                ? (new URL(targetUrl)).origin + url
                : url
        })
        .filter(url => String(url).startsWith('http'))

    urls = uniqueArr(urls)

    return urls
}

function uniqueArr(arr) {
    return arr.filter((value, index) => arr.indexOf(value) === index)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let crawled = []
let uncrawled = []

const sameDomainOnly = process.argv[3] === 'same-domain-only'

async function run(targetUrl) {
    console.log('Crawling: ' + targetUrl)

    // Get new URLs to crawl
    let newlyFound = []
    try {
        newlyFound = await crawlUrl(targetUrl)
    } catch (e) {
        console.error(e.message)
    }

    // Add newly found URLs to queue
    uncrawled = uncrawled.concat(newlyFound.filter(url => shouldCrawl(url)))

    // Mark current URL as crawled
    crawled.push(targetUrl)

    // Remove current URL from queue
    uncrawled = uncrawled.filter(url => url !== targetUrl)
}

function shouldCrawl(url) {
    // We don't mess with these guys
    const skipUrls = [
        'google.com',
        'goo.gl',
        'youtube.com',
        'facebook.com',
        'instagram.com',
        'linkedin.com',
        'microsoft.com',
        'twitter.com',
    ]

    const isAlreadyCrawled = crawled.includes(url)
    const isAlreadyQueued = uncrawled.includes(url)
    const shouldNotCrawl = skipUrls.some(skipUrl => url.includes(skipUrl))
    const isSameDomain = url.startsWith(process.argv[2])

    return !isAlreadyCrawled && !isAlreadyQueued && !shouldNotCrawl && (!sameDomainOnly || isSameDomain)
}

(async () => {
    if (!process.argv[2]) {
        throw 'Target URL is not specified'
    }

    await run(process.argv[2])

    for (let i = 0; i < uncrawled.length; i++) {
        if (!uncrawled[i]) continue;

        await sleep(50)
        console.log('\n' + (i + 1) + '/' + uncrawled.length)
        run(uncrawled[i])
    }

    console.log('\n--\n')
    console.log('Crawled: ' + crawled.length)
    console.log('Uncrawled: ' + uncrawled.length)
})()