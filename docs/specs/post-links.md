# Post links

## Goal

Show the optional link already stored with a post in feed cards and post
details.

## Behavior

- Preserve the API `link` field when mapping a post.
- Display the link as plain underlined text below the post body.
- Accept links with or without an explicit `http`/`https` scheme.
- Open only valid HTTP(S) links.
- Invalid or unsupported links are not rendered.
- Pressing the link must not trigger the parent post-card navigation.

## Compatibility

No backend or API contract change is required. Existing posts without links
continue to render unchanged.
