# Alex Kas — static tattoo portfolio

Ready-to-edit HTML/CSS/JS. No build, framework, database or server application. Form submissions and reference files go to FormSubmit; fonts load from Google Fonts. The site itself can be hosted on GitHub Pages.

## 1. Replace photographs

Replace the actual JPG files in `images/`, keeping lowercase filenames:

- `hero.jpg`: landscape, approximately 1800 × 1200 px, ideally under 350 KB. Put the tattoo/focal point on the right; the headline is on the left. Check the crop on mobile.
- `work-01.jpg` through `work-20.jpg`: 20 portfolio images, approximately 900 × 1125 px (4:5), ideally 100–200 KB each. To use 12–19 images, remove the corresponding entire `<a class="work">` elements in `index.html`.
- `healed-01.jpg` through `healed-04.jpg`: 4 healed images, approximately 900 × 1125 px. Replace “Healing interval to be added” and the matching `data-caption` with the real interval, e.g. “Healed · 6 months”. Do not invent dates.
- `about.jpg`: artist/studio portrait, approximately 900 × 1100 px.

Export sRGB JPEG at roughly 75–85% quality. Avoid uploading full camera originals; strip unnecessary metadata. Replace each image's `alt` text with a short, accurate English description. Current images are intentionally labelled placeholders, not examples of Alex's tattoo work. Images are cropped in the grid but shown in full in the lightbox.

## 2. Review copy and SEO

The brief contained conflicting experience claims. The site uses the supplied exact text: “Tattooing since 2009. 6+ years of professional studio experience in black & grey realism.” Confirm it before launch.

All public text is English. Only email is requested as the contact method; no telephone number is published. Update the About copy and factual healed intervals in `index.html`.

After choosing your real domain, add these in the `<head>` of `index.html`, replacing all example values:

```html
<link rel="canonical" href="https://YOUR-DOMAIN/">
<meta property="og:url" content="https://YOUR-DOMAIN/">
```

Open Graph title, description, site name, locale and type are already present. If you want a social preview photograph, prepare your own 1200 × 630 JPG and add an `og:image` meta tag with its absolute HTTPS URL and `og:image:alt`. Do not publish example URLs.

## 3. Publish with GitHub Pages

Create a public GitHub repository. Upload the CONTENTS of this folder to the repository root, so `index.html`, `thanks.html`, `styles.css`, `script.js`, `.nojekyll` and `images/` are at the root (not inside another `alex-kas` folder). No npm commands are required.

In Settings → Pages → Build and deployment, choose “Deploy from a branch”, select `main` and `/(root)`, then Save. Wait for the deployment and open the URL GitHub supplies. The relative asset paths also support `https://USERNAME.github.io/REPOSITORY/`.

Official guide: https://docs.github.com/en/pages/quickstart

## 4. Connect your domain

In Settings → Pages → Custom domain, enter the domain you own and Save. Configure the domain provider's DNS using GitHub's current instructions. For `www`, the CNAME target is `USERNAME.github.io`, without a repository path. For an apex domain, use the A/ALIAS/ANAME records documented by GitHub. Enable “Enforce HTTPS” when available. Keep the CNAME file GitHub creates.

Official guide: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## 5. Activate and test FormSubmit

The form uses a native POST to `https://formsubmit.co/alexkastattoo@gmail.com` with `enctype="multipart/form-data"`, the `_honey` honeypot and default FormSubmit CAPTCHA. There are three separate optional file fields, as supported by FormSubmit. Client validation accepts JPG/PNG only and caps the total at 9 MiB, below FormSubmit's documented 10 MB maximum. Client-side validation is not server-side security; the service enforces its own limits.

On the published HTTPS site:

1. Submit a clearly labelled test with your own email and three small JPG/PNG attachments.
2. Open the activation email in alexkastattoo@gmail.com and confirm the endpoint. Check Spam if necessary.
3. Submit a second test after activation. Confirm the email includes every field, all three attachments and the optional updates consent when checked.
4. Verify the browser reaches your own `thanks.html`. JavaScript builds the absolute `_next` URL from the current site, preserving a GitHub Pages repository path. With JavaScript disabled, FormSubmit's default confirmation page is used.
5. Test with updates unchecked, no attachments, invalid email, unsupported file type, and files larger than 9 MB combined. Confirm validation and lightbox operation on your phone, including the Instagram in-app browser.
6. After switching domains, repeat a submission and check the redirect and delivery again.

Do not test submission from a `file://` address. Local files are suitable for visual preview only. A successful local code check does not prove delivery to the inbox; activation, CAPTCHA and final delivery require a live test. No real messages were sent during generation.

The updates checkbox records optional consent in the request email. It does not create a mailing list or automatically send newsletters. An appointment is confirmed manually after agreeing on the project, date and deposit.

Documentation: https://formsubmit.co/documentation

## Local checks performed

JavaScript syntax, local image paths, unique IDs, anchor targets, form configuration, photo counts and required pages checked. Automated visual browser testing could not run in the current environment. Check layout at mobile and desktop sizes before launch.
