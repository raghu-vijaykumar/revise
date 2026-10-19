# Release evidence

The P1 exit gate requires a built Windows NSIS installer on a clean image.
Install it as a normal user, launch without development tools, select a parent
folder, create and reopen a section, insert a local video, export its Markdown
and linked media, and uninstall. Record installer SHA-256, version, build
machine, Windows version, and the results here.

Run a keyboard-only smoke in that installed app: switch workspaces, navigate
the section tree, format rich text, request an AI edit, inspect and decide each
change, open Timeline, and export. Check visible focus and no focus trap.
This is a separate P1 gate from the broader cross-platform validation in
Phase 10.
