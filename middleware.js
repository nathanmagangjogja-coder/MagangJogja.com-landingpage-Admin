const INJECT_TAG = '<script src="/content.js"></script>\n</body>';

export const config = {
  matcher: ['/'],
};

export default async function middleware(request) {
  const assetUrl = new URL('/index.html', request.url);
  const response = await fetch(assetUrl);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  if (!html.includes('src="/content.js"') && !html.includes('src="content.js"')) {
    html = html.replace('</body>', INJECT_TAG);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control', 'no-store');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}