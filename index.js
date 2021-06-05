const axios = require('axios')
const { JSDOM } = require('jsdom')

let crawled = []
let queue = []

const sameDomainOnly = process.argv[3] === 'same-domain-only'

async function crawlUrl(targetUrl) {
    const resp = await axios.get(targetUrl)
    const anchors = Array.from(new JSDOM(resp.data).window.document.querySelectorAll('a'))

    let urls = anchors
        // get URLs from anchors
        .map(a => a.getAttribute('href'))

        // convert relative URLs to absolute
        .map(url => {
            return String(url).startsWith('/') && !String(url).startsWith('//')
                ? (new URL(targetUrl)).origin + url
                : url
        })

        // filter only valid URLs
        .filter(url => String(url).startsWith('http'))

    return uniqueArr(urls)
}

function uniqueArr(arr) {
    return arr.filter((value, index) => arr.indexOf(value) === index)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(targetUrl) {
    console.log('Crawling: ' + targetUrl)

    // Remove current URL from queue
    queue = queue.filter(url => url !== targetUrl)

    // Get new URLs to crawl
    let newlyFound = []
    try {
        newlyFound = await crawlUrl(targetUrl)
    } catch (e) {
        console.error(e.message)
    }

    // Add newly found URLs to queue
    queue = queue.concat(newlyFound.filter(url => shouldCrawl(url)))

    // Mark current URL as crawled
    crawled.push(targetUrl)
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
    const isAlreadyQueued = queue.includes(url)
    const shouldNotCrawl = skipUrls.some(skipUrl => url.includes(skipUrl))
    const isSameDomain = url.startsWith(process.argv[2])

    return !isAlreadyCrawled && !isAlreadyQueued && !shouldNotCrawl && (!sameDomainOnly || isSameDomain)
}

(async () => {
    if (!process.argv[2]) {
        throw 'Target URL is not specified'
    }

    // First URL to crawl
    queue.push(process.argv[2])

    let crawlCount = 0
    let batchCount = 0
    setInterval(async () => {
        ++batchCount

        for (let i = 0; i < queue.length; i++) {
            if (!queue[i]) continue;

            await sleep(50 * i)
            console.log(`\n${++crawlCount} (${i + 1}/${queue.length} in Batch #${batchCount})`)
            run(queue[i])
        }
    }, 1000)
})()