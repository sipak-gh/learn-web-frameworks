import './render-count.ts'
import { render } from 'preact'
import { App } from './App.tsx'
import { AppValue } from './AppValue.tsx'
import './tasklet.css'

// ?value renders the Exercise 1 variant, which reads model.left.value in App.
const Root = new URLSearchParams(location.search).has('value') ? AppValue : App
render(<Root />, document.getElementById('app')!)
