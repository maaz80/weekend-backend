export class NextResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    
    const response = new Response(JSON.stringify(body), {
      ...init,
      headers
    });
    
    // Attach the original JS object so we can read it synchronously
    response._jsonBody = body;
    return response;
  }

  static next(init = {}) {
    return new NextResponse(null, init);
  }

  static redirect(url, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("location", url);
    return new NextResponse(null, {
      status: init.status || 307,
      headers
    });
  }
}
