import { QueryClient, QueryObserver } from '@tanstack/query-core'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let price = 101
let requests = 0
async function fetchPrice(): Promise<number> {
  requests += 1
  await sleep(100)
  return price
}

// The mutation's response already contains the new price.
async function savePrice(next: number): Promise<number> {
  await sleep(100)
  price = next
  return price
}

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
const observer = new QueryObserver(client, { queryKey: ['price'], queryFn: fetchPrice })
observer.subscribe((result) => {
  if (!result.isFetching) console.log(`screen shows ${result.data}`)
})
await sleep(200)

const saved = await savePrice(120)
client.setQueryData(['price'], saved) // write the answer into the cache: no refetch
await sleep(200)

console.log(`requests: ${requests}`)
observer.destroy()
