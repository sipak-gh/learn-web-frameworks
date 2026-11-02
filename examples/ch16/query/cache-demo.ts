import { QueryClient, QueryObserver } from '@tanstack/query-core'

const start = performance.now()
const log = (message: string) =>
  console.log(`${String(Math.round(performance.now() - start)).padStart(5)} ms  ${message}`)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A pretend server: every request takes 100 ms and returns a new price.
let requests = 0
async function fetchPrice(): Promise<number> {
  requests += 1
  log(`  server: request #${requests}`)
  await sleep(100)
  return 100 + requests
}

const priceQuery = { queryKey: ['price'], queryFn: fetchPrice }
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 1_000 } } })

log('1. Two callers ask at the same time')
const [a, b] = await Promise.all([client.fetchQuery(priceQuery), client.fetchQuery(priceQuery)])
log(`   both got ${a} and ${b}`)

log('2. Ask again while the data is fresh (staleTime 1000 ms)')
log(`   got ${await client.fetchQuery(priceQuery)} from the cache`)

await sleep(1_100)
log('3. The data is now stale. A component mounts (useQuery uses an observer)')
const observer = new QueryObserver(client, priceQuery)
const first = observer.getCurrentResult()
log(`   it renders at once: data ${first.data}, isStale ${first.isStale}`)
observer.subscribe((result) => {
  log(`   update: data ${result.data}, isStale ${result.isStale}, isFetching ${result.isFetching}`)
})
await sleep(200)

log('4. A mutation changed the price on the server: invalidate')
await client.invalidateQueries({ queryKey: ['price'] })
log(`   requests so far: ${requests}`)
observer.destroy()
