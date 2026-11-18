<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep receipt storage owner-scoped: staff may upload courier receipts, and only the parcel's seller and staff may read linked receipts in addition to the uploader, so unrelated accounts cannot access private photos.
- Keep the browser's Cloud URL and publishable key defaults paired in Vite config so deployments without `.env` use the current project.
