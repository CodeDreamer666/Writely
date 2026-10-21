// pdfmake ships its standard PDF fonts as font containers without typings.
declare module "pdfmake/build/standard-fonts/*" {
    import type { TFontContainer } from "pdfmake/interfaces";
    const container: TFontContainer;
    export default container;
}
