import { taskletSheet } from './styles.ts'
import './tasklet-app.ts'

// The page itself needs the :root colors and the body margin from the
// shared stylesheet; <tasklet-app> adopts the same sheet into its shadow root.
document.adoptedStyleSheets = [...document.adoptedStyleSheets, taskletSheet]
