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

async function fetchRemoteImage(remoteUrl) {
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
      mode: 'no-cors',
      referrer: `${target.origin}/`,
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; Quizinal/1.0)',
      },
    })

    const cache = await caches.open(CACHE_NAME)
    await cache.put(cacheKey, response.clone())
    return response
  } catch {
    return caches.match(cacheKey) ?? new Response(null, { status: 502 })
  }
}

async function handleRemoteImage(remoteUrl) {
  return fetchRemoteImage(remoteUrl)
}

async function handleProxyImage(remoteUrl) {
  return fetchRemoteImage(remoteUrl)
}
