declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SITE_USER?: string;
    SITE_PASSWORD?: string;
  }
}
