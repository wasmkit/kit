/**
 * This module format does nothing and can be used as a template
 */

import { AbstractFormat } from "../abstract";


export namespace nop {

export class Format extends AbstractFormat {}

export const extract = (fmt: Format): void => {}

}
