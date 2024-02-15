import { Kit } from "../kit";
import { AbstractModule } from "../module";

export namespace wasm {

type Sections = {

}

export class Module extends AbstractModule {
    public readonly sections: Sections;

    private _extract(): null {
        return null;
    }

    public constructor(kit: Kit) {
        super(kit);


        this.sections = {};

        this._extract();
    }
}

}