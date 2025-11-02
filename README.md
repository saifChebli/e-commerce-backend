# E-commerce Server

Express + Mongoose backend scaffold for the e-commerce React apps in the workspace.

Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.

2. Install dependencies:

```bash
npm install
```

3. Seed sample data (optional):

```bash
npm run seed
```

4. Run the server in development:

```bash
npm run dev
```

APIs

- Auth: POST /api/auth/register, POST /api/auth/login
- Products: GET /api/products, GET /api/products/:id, POST /api/products (admin), PUT /api/products/:id (admin), DELETE /api/products/:id (admin)
- Orders: POST /api/orders, GET /api/orders (admin), GET /api/orders/:id
- Users: GET /api/users (admin)
- Cart/Wishlist: basic endpoints under /api/cart and /api/wishlist
 - Uploads (admin): POST /api/uploads/single (field: file), POST /api/uploads/multiple (field: files[]); files served at /uploads
 - Admin-only: PATCH /api/admin/orders/:id/status, PATCH /api/admin/products/:id/meta, GET /api/admin/stats

This scaffold intentionally keeps things simple and secure enough for local development. Expand and harden for production use.
