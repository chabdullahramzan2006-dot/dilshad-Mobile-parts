This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Navigation and deployment

The shop interface is a single-page app served from `/`. Its sections use URL
fragments (for example `/#pos` or `/#products`), so links can be bookmarked and
the browser Back/Forward buttons can move between sections. These fragments do
not require separate Vercel routes.

The current API data service reads and writes `data/dilshad_store.json` with the
Node.js filesystem. This is not browser Local Storage, and Vercel function
filesystems are not a durable database. The application therefore needs a
persistent database before it can safely manage real shop records on Vercel.
Although Mongoose and a MongoDB connection helper are present, the data service
does not currently use them; setting `MONGODB_URI` alone will not enable
database persistence. Connect the data service to a hosted database and migrate
the JSON records before relying on production data.

For production, also configure a strong `JWT_SECRET` in Vercel's environment
variables and replace the initial admin credentials before using the app.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
