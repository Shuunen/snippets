/* import puppeteer from 'puppeteer'
import request from 'request' */

class GetPrice {

    constructor(product: string) {
        this.log(`Want the price for : ${product}`)
    }

    log(str: string): void {
        console.log(this.time() + ' : ' + str)
    }

    time(): string {
        const date: Date = new Date()
        const hours: string = date.getHours() + ''
        const minutes: string = date.getMinutes() + ''
        return (hours.length === 1 ? '0' : '') + hours + 'h' + (minutes.length === 1 ? '0' : '') + minutes
    }

}

const input: string = process.argv.slice(2).join(' ')
new GetPrice(input) // tslint:disable-line:no-unused-expression
