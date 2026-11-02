import css from './tasklet.css?inline'

// One constructable stylesheet, parsed once, shared by the document and by
// the <tasklet-app> shadow root.
export const taskletSheet = new CSSStyleSheet()
taskletSheet.replaceSync(css)
