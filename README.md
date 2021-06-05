# Web Crawler

Grab all links you can find. That's it.

It can very easily be turned to a website archiver tool, but I decided to keep it simple.

## Warning
The crawler sends a **lot** of requests and you might get rate limited (or worse, IP blacklisted). I advise you not to crawl websites you don't want to get kicked from.

## Installation

### Prerequisites
- Node v12+

### Setup

- Install npm packages
```bash
npm install
```

- Run the script
```bash
npm start <first-url-to-crawl>

# You may use the "same-domain-only" parameter, if you want to stay on the same website
npm start <first-url-to-crawl> same-domain-only

# Example
npm start https://reddit.com
```