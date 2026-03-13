import { bench, describe } from 'vitest';
import posthtml from 'posthtml';
import htmlnano from '../src/index.ts';
import safePreset from '../src/presets/safe.ts';
import maxPreset from '../src/presets/max.ts';
import type { HtmlnanoOptions, HtmlnanoPreset } from '../src/types.ts';

const smallHtml = `
<html>
  <head>
    <title>  Hello   World  </title>
  </head>
  <body>
    <div class="container">
      <h1>  Hello   World  </h1>
      <p>  This is   a paragraph.  </p>
      <!-- This is a comment -->
      <a href="https://example.com">  Link  </a>
    </div>
  </body>
</html>
`;

const mediumHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>  Medium   Page  </title>
    <style>
      body { margin: 0; padding: 0; }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { background-color: #333; color: white; padding: 20px; }
      .nav { display: flex; gap: 10px; }
      .nav a { color: white; text-decoration: none; }
      .main { padding: 20px; }
      .footer { background-color: #333; color: white; padding: 10px; text-align: center; }
    </style>
  </head>
  <body>
    <header class="header">
      <nav class="nav">
        <a href="/">  Home  </a>
        <a href="/about">  About  </a>
        <a href="/contact">  Contact  </a>
      </nav>
    </header>
    <!-- Main content area -->
    <main class="main">
      <div class="container">
        <h1>  Welcome to our   website  </h1>
        <p>  This is a sample   page with various   HTML elements.  </p>
        <ul>
          <li>  Item 1  </li>
          <li>  Item 2  </li>
          <li>  Item 3  </li>
        </ul>
        <div class="card">
          <h2>  Featured   Article  </h2>
          <p>  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.  </p>
          <a href="/read-more" class="button button-primary">  Read   More  </a>
        </div>
        <script>
          console.log("Hello World");
          var x = 1 + 2;
        </script>
      </div>
    </main>
    <!-- Footer section -->
    <footer class="footer">
      <p>  &copy; 2024 Example Corp.   All rights reserved.  </p>
    </footer>
  </body>
</html>
`;

const largeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>  Large   Page   Example  </title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 0; }
        nav ul { display: flex; list-style: none; gap: 20px; }
        nav a { color: white; text-decoration: none; font-weight: bold; }
        .hero { padding: 60px 0; text-align: center; background: #f4f4f4; }
        .hero h1 { font-size: 2.5em; margin-bottom: 20px; }
        .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 40px 0; }
        .feature-card { padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .blog-posts { padding: 40px 0; }
        .post { margin-bottom: 30px; padding: 20px; border-bottom: 1px solid #eee; }
        .sidebar { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .footer { background: #333; color: white; padding: 40px 0; }
        .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        form { max-width: 600px; margin: 0 auto; }
        input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav>
                <ul>
                    <li>  <a href="/">  Home  </a>  </li>
                    <li>  <a href="/features">  Features  </a>  </li>
                    <li>  <a href="/pricing">  Pricing  </a>  </li>
                    <li>  <a href="/blog">  Blog  </a>  </li>
                    <li>  <a href="/contact">  Contact  </a>  </li>
                </ul>
            </nav>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>  Welcome to   Our Amazing   Platform  </h1>
            <p>  Build better products   with our comprehensive   suite of tools.  </p>
            <a href="/signup" class="button">  Get   Started   Free  </a>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features">
        <div class="container">
            <h2>  Our   Features  </h2>
            <div class="feature-card">
                <h3>  Fast   Performance  </h3>
                <p>  Lightning fast processing   with optimized algorithms.  </p>
            </div>
            <div class="feature-card">
                <h3>  Easy   Integration  </h3>
                <p>  Seamlessly integrate   with your existing   workflow.  </p>
            </div>
            <div class="feature-card">
                <h3>  Secure   &amp; Reliable  </h3>
                <p>  Enterprise-grade security   with 99.9% uptime.  </p>
            </div>
            <div class="feature-card">
                <h3>  24/7   Support  </h3>
                <p>  Our dedicated team   is always here   to help.  </p>
            </div>
            <div class="feature-card">
                <h3>  Analytics  </h3>
                <p>  Comprehensive analytics   and reporting tools.  </p>
            </div>
            <div class="feature-card">
                <h3>  Scalable  </h3>
                <p>  Grows with your   business needs.  </p>
            </div>
        </div>
    </section>

    <!-- Blog Section -->
    <section class="blog-posts">
        <div class="container">
            <h2>  Latest   Blog Posts  </h2>
            <div class="post">
                <h3>  <a href="/blog/post-1">  Getting Started   with HTML Minification  </a>  </h3>
                <p>  Learn how to optimize   your HTML output   for better performance.
                    This comprehensive guide   covers all the basics   you need to know.  </p>
                <span>  Published: January 15, 2024  </span>
            </div>
            <div class="post">
                <h3>  <a href="/blog/post-2">  Advanced   Optimization Techniques  </a>  </h3>
                <p>  Dive deep into   advanced optimization strategies   that can significantly
                    improve your website's   loading time and   overall performance.  </p>
                <span>  Published: February 20, 2024  </span>
            </div>
            <div class="post">
                <h3>  <a href="/blog/post-3">  Best Practices   for Web Performance  </a>  </h3>
                <p>  Discover the best practices   used by top companies   to deliver
                    fast and responsive   web experiences.  </p>
                <span>  Published: March 10, 2024  </span>
            </div>
        </div>
    </section>

    <!-- Pricing Table -->
    <section>
        <div class="container">
            <h2>  Pricing   Plans  </h2>
            <table>
                <thead>
                    <tr>
                        <th>  Feature  </th>
                        <th>  Free  </th>
                        <th>  Pro  </th>
                        <th>  Enterprise  </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>  Storage  </td>
                        <td>  1 GB  </td>
                        <td>  100 GB  </td>
                        <td>  Unlimited  </td>
                    </tr>
                    <tr>
                        <td>  Users  </td>
                        <td>  1  </td>
                        <td>  10  </td>
                        <td>  Unlimited  </td>
                    </tr>
                    <tr>
                        <td>  Support  </td>
                        <td>  Community  </td>
                        <td>  Email  </td>
                        <td>  24/7 Priority  </td>
                    </tr>
                    <tr>
                        <td>  API Access  </td>
                        <td>  Limited  </td>
                        <td>  Full  </td>
                        <td>  Full + Custom  </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <!-- Contact Form -->
    <section>
        <div class="container">
            <h2>  Contact   Us  </h2>
            <form action="/submit" method="POST">
                <label for="name">  Name  </label>
                <input type="text" id="name" name="name" placeholder="Your name" required>
                <label for="email">  Email  </label>
                <input type="email" id="email" name="email" placeholder="your@email.com" required>
                <label for="subject">  Subject  </label>
                <input type="text" id="subject" name="subject" placeholder="Subject">
                <label for="message">  Message  </label>
                <textarea id="message" name="message" rows="5" placeholder="Your message"></textarea>
                <button type="submit">  Send   Message  </button>
            </form>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h4>  Company  </h4>
                    <ul>
                        <li>  <a href="/about">  About Us  </a>  </li>
                        <li>  <a href="/careers">  Careers  </a>  </li>
                        <li>  <a href="/press">  Press  </a>  </li>
                    </ul>
                </div>
                <div>
                    <h4>  Product  </h4>
                    <ul>
                        <li>  <a href="/features">  Features  </a>  </li>
                        <li>  <a href="/pricing">  Pricing  </a>  </li>
                        <li>  <a href="/docs">  Documentation  </a>  </li>
                    </ul>
                </div>
                <div>
                    <h4>  Resources  </h4>
                    <ul>
                        <li>  <a href="/blog">  Blog  </a>  </li>
                        <li>  <a href="/tutorials">  Tutorials  </a>  </li>
                        <li>  <a href="/faq">  FAQ  </a>  </li>
                    </ul>
                </div>
                <div>
                    <h4>  Legal  </h4>
                    <ul>
                        <li>  <a href="/privacy">  Privacy Policy  </a>  </li>
                        <li>  <a href="/terms">  Terms of Service  </a>  </li>
                        <li>  <a href="/cookies">  Cookie Policy  </a>  </li>
                    </ul>
                </div>
            </div>
            <p>  &copy; 2024 Example Corp.   All rights reserved.  </p>
        </div>
    </footer>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            console.log("Page loaded");
            var links = document.querySelectorAll("a");
            links.forEach(function(link) {
                link.addEventListener("click", function(e) {
                    console.log("Link clicked: " + e.target.href);
                });
            });
        });
    </script>
</body>
</html>
`;

function minify(html: string, options: HtmlnanoOptions, preset: HtmlnanoPreset) {
    return posthtml([htmlnano(options, preset)]).process(html);
}

describe('htmlnano.process - safe preset', () => {
    bench('small HTML', async () => {
        await minify(smallHtml, { skipConfigLoading: true }, safePreset);
    });

    bench('medium HTML', async () => {
        await minify(mediumHtml, { skipConfigLoading: true }, safePreset);
    });

    bench('large HTML', async () => {
        await minify(largeHtml, { skipConfigLoading: true }, safePreset);
    });
});

describe('htmlnano.process - max preset', () => {
    bench('small HTML', async () => {
        await minify(smallHtml, { skipConfigLoading: true }, maxPreset);
    });

    bench('medium HTML', async () => {
        await minify(mediumHtml, { skipConfigLoading: true }, maxPreset);
    });

    bench('large HTML', async () => {
        await minify(largeHtml, { skipConfigLoading: true }, maxPreset);
    });
});

describe('htmlnano.process - individual modules', () => {
    const disableAll = Object.fromEntries(
        Object.keys(safePreset).map(key => [key, false])
    ) as HtmlnanoOptions;

    bench('collapseWhitespace only', async () => {
        await minify(
            largeHtml,
            { ...disableAll, collapseWhitespace: 'conservative', skipConfigLoading: true },
            {},
        );
    });

    bench('removeComments only', async () => {
        await minify(
            largeHtml,
            { ...disableAll, removeComments: 'safe', skipConfigLoading: true },
            {},
        );
    });

    bench('minifyJs only', async () => {
        await minify(
            largeHtml,
            { ...disableAll, minifyJs: {}, skipConfigLoading: true },
            {},
        );
    });
});
