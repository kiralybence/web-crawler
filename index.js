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

        // some URL formatting
        .map(url => {
            // the URL might not be string type
            url = String(url)

            // why would you even do that
            url = url.toLowerCase()

            // drop / from the end of the URL
            if (url.endsWith('/')) {
                url = url.slice(0, -1)
            }

            // convert relative URLs to absolute
            if (url.startsWith('/') && !url.startsWith('//')) {
                url = (new URL(targetUrl)).origin + url
            }

            return url
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

    // Mark current URL as crawled
    crawled.push(targetUrl)

    // Get new URLs to crawl
    let newlyFound = []
    try {
        newlyFound = await crawlUrl(targetUrl)
    } catch (e) {
        console.error(`${e.message} (${targetUrl})`)
    }

    // Add newly found URLs to queue
    queue = queue.concat(newlyFound.filter(url => shouldCrawl(url)))

    // Just in case
    queue = uniqueArr(queue)
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

    const skipFiles = [
        'css', 'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'exe',
        'mp4', 'webm', 'xls', 'xlsx', 'ppt', 'pptx',
    ]

    const isAlreadyCrawled = crawled.includes(url)
    const isAlreadyQueued = queue.includes(url)
    const shouldNotCrawl = skipUrls.some(skipUrl => url.includes(skipUrl))
    const isSameDomain = new URL(url).hostname.replace('www.', '') === new URL(process.argv[2]).hostname.replace('www.', '')
    const isFile = skipFiles.some(skipFile => url.endsWith('.' + skipFile))

    return !isAlreadyCrawled && !isAlreadyQueued && !shouldNotCrawl && (!sameDomainOnly || isSameDomain) && !isFile
}

(async () => {
    if (!process.argv[2]) {
        throw 'Target URL is not specified'
    }

    // First URL to crawl
    queue.push(process.argv[2])

    let count = 0
    while (1) {
        await sleep(50)

        let url = queue.shift()

        // If URL wasn't found
        if (!url) continue

        // If URL is already crawled
        if (crawled.includes(url)) continue

        console.log(`\n${++count} (${queue.length} others remaining)`)
        run(url)
    }
})()