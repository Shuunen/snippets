import { Browser, launch, Page } from 'puppeteer'
/* import request from 'request' */

/* tslint:disable:max-line-length */
const sites: ISite[] = [
    /* {
        name: 'Aroma-Zone',
        url: 'https://www.aroma-zone.com/catalogsearch/result/?sq=essentielle+{{q}}&order=relevance&dir=desc&limit=24&mode=grid&e=l',
        scrapper: 'aromaScrape',
    }, */
    {
        name: 'MyCosmetik',
        url: 'https://www.mycosmetik.fr/recherche?controller=search&orderby=position&orderway=desc&search_query=essentielle+{{q}}',
        finder: 'mycosmeFind',
        scrapper: 'mycosmeScrape',
    },
]
/* tslint:enable:max-line-length */

const dontLog: string[] = ['processDynamicModules']

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
                this[site.finder](url).then(finalUrl => this.scrape(site.name, finalUrl, this[site.scrapper]))
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
        if (!dontLog.some(str => message.includes(str))) {
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
        this.log('Finding product url on page : ', url)
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
                this.log('Failed at getting product url for MyCosmetik :\'(')
                reject('Product url not found :(')
            } else {
                this.log('Product url found :)')
                resolve(finalUrl)
            }
            browser.close()
        })
    }

    mycosmeScrape = (): number => {
        return 3.33
    }

    aromaScrape = (): number => {
        let value: number = 0
        const product: HTMLElement = document.querySelector('.products-grid .item') as HTMLElement
        if (!product) {
            console.log('Failed at finding product in page')
            return value
        }
        const contenances: NodeListOf<HTMLElement> = product.querySelectorAll('.item-product-simple') as NodeListOf<HTMLElement> // tslint:disable-line:max-line-length
        if (!contenances) {
            console.log('Failed at getting contenances for product')
            return value
        }
        const priceEl: HTMLElement = product.querySelector('.price') as HTMLElement
        if (!priceEl) {
            console.log('Failed at getting price for product')
            return value
        }
        let found: boolean = false
        let index: number
        for (index = 0; index < contenances.length; index++) {
            const contenance: HTMLElement = contenances[index]
            const text: string = (contenance.textContent as string).trim()
            // console.log(`Checking contenance with text "${text}"`)
            if (!contenance || !text.length) {
                continue
            }
            if (!found && text.includes('10 ml')) {
                found = true
                contenance.click()
            }
        }
        if (!found) {
            console.log('Failed to find the price for "10 ml"')
        } else if (priceEl.textContent) {
            value = parseFloat(priceEl.textContent.replace(',', '.').split(' ')[0])
        }
        return value
    }

    scrape = async (site: string, url: string, scrapper: () => number) => {
        this.log('Scrapping url : ', url)
        const browser: Browser = await launch({ headless: true })
        const page: Page = await browser.newPage()
        page.on('console', this.log)
        await page.goto(url)
        await page.waitFor(400)
        const price: number = await page.evaluate(scrapper)
        if (!price) {
            this.log('Failed at getting price :\'(')
        } else {
            this.log(`Price found, "${this.input}" cost ${price} € on ${site}`)
        }
        browser.close()
    }
}

new GetPrice(process.argv.slice(2).join(' ')) // tslint:disable-line:no-unused-expression

export interface ISite {
    name: string
    url: string
    finder?: string
    scrapper: string
}
