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
        .map(url => String(url).startsWith('/') && !String(url).startsWith('//') ? targetUrl + url : url) // convert relative URLs to absolute
        .filter(url => String(url).startsWith('http'))

    urls = uniqueArr(urls)

    return urls
}

function uniqueArr(arr) {
    return arr.filter((value, index) => arr.indexOf(value) === index)
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let crawled = []
let uncrawled = []

async function run(targetUrl) {
    // If already crawled, skip
    if (crawled.includes(targetUrl)) return

    // Add newly found URLs to queue
    uncrawled = uncrawled.concat(await crawlUrl(targetUrl))

    // Mark current URL as crawled
    crawled.push(targetUrl)

    // Remove current URL from queue
    uncrawled = uncrawled.filter(url => url !== targetUrl)
}

(async () => {
    if (!process.argv[2]) {
        throw 'Target URL is not specified'
    }

    await run(process.argv[2])

    for (let i = 0; i < uncrawled.length; i++) {
        if (!uncrawled[i]) continue;

        // await sleep(100)
        console.log('\n' + (i + 1) + '/' + uncrawled.length)
        await run(uncrawled[i])
    }

    console.log('Crawled: ' + crawled.length)
    console.log('Uncrawled: ' + uncrawled.length)
})()