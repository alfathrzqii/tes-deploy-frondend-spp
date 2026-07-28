<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Deployment Workflow

Setiap kali ada perubahan kode yang perlu di-push:
- **Perubahan Frontend**: Push ke remote `upstream-frontend` (`https://github.com/alfathrzqii/tes-deploy-frondend-spp.git`) di branch `main`.
- **Perubahan Backend**: Push ke remote `origin` (`https://github.com/bons027/spp-backend-render.git` - fork Anda) di branch `main`, kemudian berikan link bagi pengguna untuk membuat Pull Request ke `alfathrzqii/spp-backend-render:main`.
