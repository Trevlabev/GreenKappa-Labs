GREENKAPPA LABS — PERFECTED WEBSITE
===================================

This is the finished public portfolio and TableArc case-study site.

WHAT IS INCLUDED
----------------
- Redesigned GreenKappa Labs homepage
- Redesigned TableArc project page
- Native Ask Arcana integration
- Real TableArc product screenshots
- Implemented-versus-planned status section
- Runtime architecture explanation
- Trevor Leininger / GreenKappa Labs builder section
- Mobile navigation
- Accessibility improvements
- SEO metadata and structured data
- sitemap.xml, robots.txt, and web manifest
- Privacy page for the public AI guide
- Local preview and GitHub publish helpers

QUICK PREVIEW
-------------
Double-click:

PREVIEW WEBSITE.cmd

Then visit:

http://127.0.0.1:8765/

CONNECT ASK ARCANA
------------------
Double-click:

CONNECT ASK ARCANA.cmd

It will read the Netlify URL saved by the Arcana project or ask you to paste it.

PUBLISH
-------
Copy these files into your existing GreenKappa Labs Git repository, preserving
the .git folder, then double-click:

PUBLISH WEBSITE.cmd

PUBLIC LINKS
------------
https://greenkappalabs.art/
https://greenkappalabs.art/tablearc/
https://greenkappalabs.art/tablearc/#ask-arcana

SUGGESTED LINK TO SEND
----------------------
For someone specifically interested in TableArc:

https://greenkappalabs.art/tablearc/

The Ask Arcana guide is immediately available from that page.


ASK ARCANA FLOATING ASSISTANT
-----------------------------
Ask Arcana is now a site-wide floating chat assistant rather than a large page section.

- The launcher sits at the lower-right corner.
- Existing Ask Arcana links open the overlay.
- Visiting a URL ending in #ask-arcana opens it automatically.
- The conversation remains available while the panel is minimized.
- On phones, the panel becomes a full-screen assistant.
- Escape closes it on desktop.
- Quick and Technical answer modes remain available.
- Packaged knowledge remains available when the hosted function is offline.


ARCANA CONVERSATION REPAIR 1.2.0
--------------------------------
- The widget probes the Netlify function without spending a model request.
- Status text distinguishes a missing URL, missing production key, old endpoint, and network failure.
- Built-in answers are conversational instead of dumping raw knowledge chunks.
- Common questions about fun, use cases, D&D play, architecture, status, providers, and the builder have direct answers.
- Short follow-ups use recent user questions for context.


NETLIFY KEY VISIBILITY HOTFIX 1.2.1
-----------------------------------
The backend setup now stores production variables without a custom scope. This
works on Netlify Free while remaining available to serverless Functions.
