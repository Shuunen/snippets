import { Browser, launch, Page } from 'puppeteer'
/* import request from 'request' */

/* tslint:disable:max-line-length */
const sites: ISite[] = [
    {
        name: 'Aroma-Zone',
        url: 'https://www.aroma-zone.com/catalogsearch/result/?sq=essentielle+{{q}}&order=relevance&dir=desc&limit=24&mode=grid&e=l',
        scrapper: 'aromaScrape',
    },
    {
        name: 'MyCosmetik',
        url: 'https://www.mycosmetik.fr/recherche?controller=search&orderby=position&orderway=desc&search_query=essentielle+{{q}}',
        finder: 'mycosmeFind',
        scrapper: 'mycosmeScrape',
    },
]
/* tslint:enable:max-line-length */

const dontLog: string[] = ['processDynamicModules']

let displayedResults: string[] = []

class GetPrice {

    constructor(
        private input: string,
    ) {
        this.log(`Want the price for "${this.input}"`)
        const query: string = this.input.replace(/\s/g, '+')
        sites.forEach(site => {
            if (this[site.scrapper]) {
                const url: string = site.url.replace('{{q}}', query)
                site.finder = site.finder || 'dummyFind'
                this[site.finder](url)
                    .then(finalUrl => this.scrape(site.name, finalUrl, this[site.scrapper]))
                    .catch(reason => this.log(reason))
            } else {
                this.log(`No scrapper found for ${site.name}`)
            }
        })
    }

    log(thing: any, ...args: any[]): void { // tslint:disable-line:no-any
        const date: Date = new Date()
        const hours: string = date.getHours() + ''
        const minutes: string = date.getMinutes() + ''
        const time: string = (hours.length === 1 ? '0' : '') + hours + 'h' + (minutes.length === 1 ? '0' : '') + minutes
        const message: string = thing.text ? thing.text : thing
        if (!dontLog.some(str => message.toLowerCase().includes(str.toLowerCase()))) {
            // dont log message if it contains an excluded word
            console.log(time + ' :', message, args.length ? args : '')
        }
    }

    dummyFind(url: string): Promise<string> {
        return new Promise(resolve => {
            resolve(url)
        })
    }

    mycosmeFind(url: string): Promise<string> {
        this.log('MyCosmeFind searching product url on page : ', url)
        return new Promise(async (resolve, reject) => {
            const browser: Browser = await launch({ headless: true })
            const page: Page = await browser.newPage()
            page.on('console', this.log)
            await page.goto(url)
            await page.waitFor(400)
            const finalUrl: string = await page.evaluate(() => {
                const firstResult: HTMLLinkElement = document.querySelector('#product_list > li .product_link') as HTMLLinkElement // tslint:disable-line:max-line-length
                if (firstResult) {
                    return firstResult.href
                } else {
                    return null
                }
            })
            if (!finalUrl) {
                reject('MyCosmeFind failed at finding product on MyCosmetik :\'(')
            } else {
                this.log('MyCosmeFind found product url :)')
                resolve(finalUrl)
            }
            browser.close()
        })
    }

    mycosmeScrape = (): IScrapeResult => {
        const result: IScrapeResult = {}
        const nameEl: HTMLElement = document.querySelector('h1') as HTMLElement
        if (!nameEl) {
            console.log('MyCosmeScrape failed at getting product name')
            return result
        } else {
            result.name = (nameEl.textContent ? nameEl.textContent : '').trim()
        }
        const contenance: HTMLOptionElement = document.querySelector('option[title="10 ml"]') as HTMLOptionElement
        if (!contenance) {
            console.log('MyCosmeScrape failed at getting 10 ml contenance for product')
            return result
        }
        const select: HTMLSelectElement = contenance.parentElement as HTMLSelectElement
        select.value = contenance.value
        select.onchange(new Event('yolo'))
        const priceEl: HTMLElement = document.querySelector('#our_price_display') as HTMLElement
        if (!priceEl) {
            console.log('MyCosmeScrape failed at getting price for product')
            return result
        }
        if (priceEl.textContent) {
            result.price = parseFloat(priceEl.textContent.trim().replace(',', '.').split(' ')[0])
        }
        return result
    }

    aromaScrape = (): IScrapeResult => {
        const result: IScrapeResult = {}
        const product: HTMLElement = document.querySelector('.products-grid .item') as HTMLElement
        if (!product) {
            console.log('AromaScrape failed at finding product in page')
            return result
        } else {
            const nameEl: HTMLElement = product.querySelector('.product-link') as HTMLElement
            result.name = (nameEl && nameEl.textContent ? nameEl.textContent : '').trim()
        }
        let found: boolean = false
        const singleContenance: HTMLElement = product.querySelector('.product-simple > .selected') as HTMLElement
        if (singleContenance) {
            const text: string = (singleContenance.textContent as string).trim()
            // console.log(`AromaScrape found single contenance that contains ${text}`)
            if (text.toLowerCase().includes('10 ml')) {
                found = true
            }
        } else {
            const contenances: NodeListOf<HTMLElement> = product.querySelectorAll('.item-product-simple') as NodeListOf<HTMLElement> // tslint:disable-line:max-line-length
            if (!contenances) {
                console.log('AromaScrape failed at getting contenances for product')
                return result
            }
            let index: number
            for (index = 0; index < contenances.length; index++) {
                const contenance: HTMLElement = contenances[index]
                const text: string = (contenance.textContent as string).trim()
                // console.log(`Checking contenance with text "${text}"`)
                if (!contenance || !text.length) {
                    continue
                }
                if (!found && text.toLowerCase().includes('10 ml')) {
                    found = true
                    contenance.click()
                }
            }
        }
        if (!found) {
            console.log(`AromaScrape failed to find the "10 ml" contenance for ${result.name}`)
            return result
        }
        const priceEl: HTMLElement = product.querySelector('.price') as HTMLElement
        if (!priceEl) {
            console.log('AromaScrape failed at getting price for product')
            return result
        }
        if (priceEl.textContent) {
            result.price = parseFloat(priceEl.textContent.trim().replace(',', '.').split(' ')[0])
        }
        return result
    }

    scrape = async (site: string, url: string, scrapper: () => number) => {
        this.log('Scrape start on url : ', url)
        const browser: Browser = await launch({ headless: true })
        const page: Page = await browser.newPage()
        page.on('console', this.log)
        await page.goto(url)
        await page.waitFor(400)
        const result: IScrapeResult = await page.evaluate(scrapper)
        if (result.name && result.price && !displayedResults.includes(result.name)) {
            this.log('-----')
            this.log(`Scrape found that "${result.name} (10 ml)" cost ${this.formatPrice(result.price)} € on ${site}`) // tslint:disable-line:max-line-length
            displayedResults.push(result.name)
            this.log('-----')
        }
        browser.close()
    }

    formatPrice(amount: number): string {
        return amount.toFixed(2).replace('.', ',')
    }
}

const search: string = process.argv.slice(2).join(' ')
new GetPrice(search) // tslint:disable-line:no-unused-expression
if (!search.toLowerCase().includes('bio')) {
    new GetPrice(search + ' bio') // tslint:disable-line:no-unused-expression
}

interface ISite {
    name: string
    url: string
    finder?: string
    scrapper: string
}

interface IScrapeResult {
    name?: string
    price?: number
}
