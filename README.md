# Portfolio on Vercel

- public/index.html  -> your site (static)
- api/contact.js     -> serverless function that emails you via Resend

## Deploy
1. Sign up at resend.com with kilaparthichaitanyadurgesh@gmail.com, create an API key.
2. Push this folder to GitHub.
3. vercel.com -> Add New Project -> import the repo. Framework Preset: Other. Leave build settings empty.
4. Settings -> Environment Variables: RESEND_API_KEY, MAIL_TO=kilaparthichaitanyadurgesh@gmail.com
5. Deploy (redeploy after adding variables), then test the form.
