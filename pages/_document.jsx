// pages/_document.jsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Google Search Console verification */}
        <meta
          name="google-site-verification"
          content="nwePx4eC2pygwgel2m6gyg3nrYaSBe-nOPXsJvR_4K4"
        />
      </Head>
      <body className="bg-white dark:bg-gray-950">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
