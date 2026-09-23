const CACHE_NAME = 'quizinal-images-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method.toLowerCase() !== 'get') return

  const url = new URL(request.url)
  if (url.pathname === '/proxy/image') {
    const remoteUrl = url.searchParams.get('url')
    if (!remoteUrl) return
    event.respondWith(handleProxyImage(remoteUrl))
    return
  }

  if (request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(handleRemoteImage(request.url))
  }
})

async function handleRemoteImage(remoteUrl) {
  const target = new URL(remoteUrl)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return new Response(null, { status: 400 })
  }

  const cacheKey = target.toString()
  const cached = await caches.match(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(target.toString(), {
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors',
      redirect: 'follow',
      referrer: `${target.origin}/`,
      referrerPolicy: 'origin',
    })

    if (!response.ok) return response

    const cache = await caches.open(CACHE_NAME)
    cache.put(cacheKey, response.clone())
    return response
  } catch {
    return caches.match(cacheKey) ?? new Response(null, { status: 502 })
  }
}

async function handleProxyImage(remoteUrl) {
  const target = new URL(remoteUrl)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return new Response(null, { status: 400 })
  }

  const cacheKey = target.toString()
  const cached = await caches.match(cacheKey)
  if (cached) return cached

  try {
    const response = await fetch(target.toString(), {
      cache: 'no-store',
      credentials: 'omit',
      mode: 'cors',
      redirect: 'follow',
      referrer: `${target.origin}/`,
      referrerPolicy: 'origin',
    })

    if (!response.ok) return response

    const cache = await caches.open(CACHE_NAME)
    cache.put(cacheKey, response.clone())
    return response
  } catch {
    return caches.match(cacheKey) ?? new Response(null, { status: 502 })
  }
}
