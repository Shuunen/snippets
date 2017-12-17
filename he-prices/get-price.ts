import { Browser, launch, Page } from 'puppeteer'
/* import request from 'request' */

const sites: ISite[] = [
    {
        name: 'Aroma-Zone',
        url: 'https://www.aroma-zone.com/catalogsearch/result/?sq=essentielle+{{q}}&order=relevance&dir=desc&limit=24&mode=grid&e=l', // tslint:disable-line:max-line-length
    },
]

class GetPrice {

    constructor(
        private input: string,
    ) {
        this.log(`Want the price for "${this.input}"`)
        const query: string = this.input.replace(/\s/g, '+')
        sites.forEach(site => {
            const url: string = site.url.replace('{{q}}', query)
            this.scrape(site.name, url, this.aromaScrape)
        })
    }

    log(thing: any, ...args: any[]): void { // tslint:disable-line:no-any
        const date: Date = new Date()
        const hours: string = date.getHours() + ''
        const minutes: string = date.getMinutes() + ''
        const time: string = (hours.length === 1 ? '0' : '') + hours + 'h' + (minutes.length === 1 ? '0' : '') + minutes
        const message: string = thing.text ? thing.text : thing
        console.log(time + ' :', message, args.length ? args : '')
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
            console.log(`Checking contenance with text "${text}"`)
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
}
